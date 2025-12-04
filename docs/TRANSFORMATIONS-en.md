# Data Transformations Guide

Detailed explanation of the transformation logic between DFC and Verso.

---

## Overview

The middleware performs **two critical transformations** that enable communication between the DFC world and the Verso world:

```
1️⃣ DFC → Verso: Extract logistics needs
2️⃣ Verso → DFC: Enrich with optimized routes
```

**Why these transformations are necessary:**
- Data formats are incompatible
- Business concepts are different
- Middleware acts as a bidirectional translator

---

## Transformation 1: DFC → Verso

### Objective

Convert **food orders** (DFC ontology) into **transport problem** (Verso VRP format).

### Concepts to Map

| DFC Concept | Meaning | Becomes in Verso |
|-------------|---------|------------------|
| **Order** + **OrderLine** | Customer order with products | **Shipment** (a delivery to make) |
| **RealStock** in a location | Available goods somewhere | Shipment **pickup** point |
| **Pickup point** for customer | Where customer collects order | Shipment **delivery** point |
| **Stock location** | Producer's depot/farm | **vehicle** start/return point |
| **Opening hours** | When location is accessible | **time_windows** (time constraints) |

---

### Navigation Path in DFC Graph

#### To find the SOURCE location (where goods are):

```
Order
  └─ hasPart → OrderLine
       └─ fulfilledBy → Offer
            └─ constitutedBy → RealStock
                 └─ isStoredIn → PhysicalPlace
                      └─ hasAddress → Address
                           ├─ latitude ✓
                           └─ longitude ✓
```

**Reference:** Method `transformDFCtoVerso()`, source extraction part

#### To find the DESTINATION location (where order goes):

```
Order
  └─ selects → Order (pickup info)
       └─ pickedUpAt → PhysicalPlace
            └─ hasAddress → Address
                 ├─ latitude ✓
                 └─ longitude ✓
```

**Reference:** Method `transformDFCtoVerso()`, destination extraction part

---

### GPS Coordinates Extraction

**Why it's critical:**
Verso needs precise coordinates to calculate:
- Distances between points
- Travel times
- Optimal routes

**Validation performed:**
1. Presence of `latitude` AND `longitude`
2. Numeric values (not strings)
3. Within valid ranges

**If invalid:**
- OrderLine is **silently ignored**
- Warning is logged
- Other OrderLines are processed normally

**Reference:** Helper function in `optimizationService.js`

---

### Time Windows Extraction

**Concept:** Time windows when a location is accessible.

**DFC property used:**
```
PhysicalPlace → isOpeningDuring
                  ├─ start (ISO 8601 datetime)
                  └─ end (ISO 8601 datetime)
```

**Transformation:**
1. Parse ISO 8601 dates
2. Convert to UNIX timestamps (seconds since epoch)
3. Form array `[start_timestamp, end_timestamp]`

**If not provided:**
- Use `[null, null]` = no time constraint

**Verso expected format:**
```
time_windows: [[start, end]] // Array of arrays
```

**Reference:** Function `extractTimeWindow()` in `optimizationService.js`

---

### Verso Entities Construction

#### Vehicle

**Creation rule:** One vehicle per unique source location.

**Generated properties:**
- `id`: Sequential identifier (1, 2, 3...)
- `start`: Source location coordinates `[longitude, latitude]`
- `end`: Same coordinates (return to depot)

**Note:** Verso format uses `[lon, lat]` (longitude first).

#### Shipment

**Creation rule:** One shipment per OrderLine.

**Structure:**
- **pickup**: Goods collection point
  - `id`: Unique sequential identifier
  - `location`: `[longitude, latitude]` of stock
  - `time_windows`: Opening hours of stock location
  - `service`: Service time (1000s default)

- **delivery**: Delivery point
  - `id`: Unique sequential identifier (different from pickup)
  - `location`: `[longitude, latitude]` of pickup point
  - `time_windows`: Opening hours of pickup point
  - `service`: Service time (1000s default)

---

### ID Traceability

**Problem to solve:**
How to find DFC OrderLines after Verso optimization?

**Solution:**
Middleware temporarily adds properties to OrderLines:
- `dfc-b:versoIdPickup` → Verso pickup ID
- `dfc-b:versoIdDelivery` → Verso delivery ID

**Purpose:**
During reverse transformation (Verso → DFC), these IDs allow to:
1. Identify which Verso Step corresponds to which OrderLine
2. Create DFC Shipments linked to correct orders
3. Enrich graph correctly

**Reference:** Variables `pickupId` and `deliveryId` in `transformDFCtoVerso()`

---

### Transformation Result

**Output:**
```javascript
{
  versoNeeds: {
    vehicles: [...],   // Array of vehicles
    shipments: [...]   // Array of shipments
  },
  dfcNeeds: {
    // Original DFC graph with added Verso IDs
  }
}
```

**The `versoNeeds` is sent to Verso API.**
**The `dfcNeeds` is kept for reverse transformation.**

---

## Transformation 2: Verso → DFC

### Objective

Enrich the original DFC graph with **optimized routes** returned by Verso.

### What Verso Returns

**Simplified structure:**
```
{
  routes: [
    {
      vehicle: 1,
      geometry: "encoded_polyline_string",
      steps: [
        {type: "start", location: {...}, arrival: timestamp, ...},
        {type: "pickup", id: 1, location: {...}, arrival: timestamp, ...},
        {type: "delivery", id: 2, location: {...}, arrival: timestamp, ...},
        {type: "end", location: {...}, arrival: timestamp, ...}
      ]
    }
  ]
}
```

**Key points:**
- One route per vehicle
- Encoded geometry (Google polyline)
- Steps with timestamps and types
- Pickup/delivery IDs for traceability

---

### DFC Context Enrichment

**Problem:** DFC ontology doesn't contain logistics concepts.

**Solution:** JSON-LD context extension.

**Added entities:**
- `dfc-b:Route` - Complete optimized itinerary
- `dfc-b:Vehicle` - Delivery vehicle
- `dfc-b:Shipment` - Goods shipment
- `dfc-b:Step` - Itinerary step

**Added properties:**
- `dfc-b:geometry` - Route geometry (polyline string)
- `dfc-b:vehicle`, `dfc-b:steps` - Entity relations
- `dfc-b:stepType` - Step type (start, pickup, delivery, end)
- `dfc-b:geo` - GPS coordinates `[lon, lat]`
- `dfc-b:arrival` - Arrival timestamp (UNIX integer)
- `dfc-b:duration` - Step duration in seconds
- And others...

**Reference:** Beginning of `transformVersoToDFC()`, enriched context construction

---

### DFC Graph Flattening

**Why:**
Original DFC graph is complex and nested. Flattening transforms it into a flat list of entities, facilitating:
- Entity search by ID
- Modification of existing entities
- Addition of new entities

**JSON-LD operation:**
```javascript
const flattened = await jsonld.flatten(dfcGraph, context);
```

**Result:**
```javascript
{
  '@graph': [
    { '@id': 'order-1', '@type': 'dfc-b:Order', ... },
    { '@id': 'orderline-1', '@type': 'dfc-b:OrderLine', ... },
    ...
  ]
}
```

**Reference:** `jsonld.js` library documentation

---

### Logistics Entities Creation

#### Vehicle

**One DFC vehicle per Verso route.**

**Properties:**
- `@id`: Generated URI (e.g., `http://verso-middleware.org/vehicle-1`)
- `@type`: `dfc-b:Vehicle`
- `dfc-b:ships`: Array of transported shipments

**Reference:** Loop over `versoResult.routes` in `transformVersoToDFC()`

#### Route

**One DFC route per Verso route.**

**Properties:**
- `@id`: Generated URI
- `@type`: `dfc-b:Route`
- `dfc-b:geometry`: Encoded polyline (copied from Verso)
- `dfc-b:vehicle`: Vehicle reference
- `dfc-b:steps`: Ordered array of steps

**Note:** `steps` uses `@container: @list` to preserve order.

#### Step

**One DFC step per Verso step.**

**Properties:**
- `@id`: Generated URI
- `@type`: `dfc-b:Step`
- `dfc-b:stepType`: Type copied from Verso (start, pickup, delivery, end)
- `dfc-b:geo`: Coordinates `[longitude, latitude]`
- `dfc-b:arrival`: UNIX timestamp
- `dfc-b:duration`: Duration in seconds
- `dfc-b:waiting_time`: Waiting time (if arrival before opening)
- `dfc-b:hasRoute`: Reference to parent route

**If step is pickup or delivery type:**
Add property `dfc-b:pickup` or `dfc-b:delivery` pointing to shipment.

#### Shipment

**One DFC shipment per transported OrderLine.**

**Conditional creation:**
Shipment is created during first step (pickup or delivery) encountered that references the OrderLine.

**Properties:**
- `@id`: Generated URI
- `@type`: `dfc-b:Shipment`
- `dfc-b:transports`: OrderLine reference
- `dfc-b:isChippedIn`: Vehicle reference
- `dfc-b:startAt`: Pickup step reference
- `dfc-b:endAt`: Delivery step reference

---

### Step ↔ OrderLine Linking

**Algorithm:**

1. **For each pickup or delivery step:**
   - Retrieve Verso step ID (`step.id`)

2. **Search corresponding OrderLine:**
   - If pickup: search where `dfc-b:versoIdPickup === step.id`
   - If delivery: search where `dfc-b:versoIdDelivery === step.id`

3. **If OrderLine found:**
   - Create or retrieve linked Shipment
   - Add step → shipment reference
   - Add shipment → step reference (startAt or endAt)

**Result:**
Each pickup/delivery step is linked to an OrderLine via a Shipment, allowing to know:
- Which order is loaded/unloaded at each step
- Which vehicle carries which order
- What are the schedules for each operation

**Reference:** Loop over `route.steps` in `transformVersoToDFC()`

---

### Final Result Construction

**Final steps:**

1. **Add entities to graph:**
   - All original DFC entities (Orders, OrderLines, etc.)
   - New entities (Vehicle, Route, Shipment, Step)

2. **Organization:**
   - Sort by entity type (optional, for readability)

3. **Return:**
   - JSON-LD object with enriched context and complete graph

**Structure:**
```javascript
{
  '@context': { /* enriched DFC context */ },
  '@graph': [
    /* Original entities */,
    /* New logistics entities */
  ]
}
```

---

## Handled Special Cases

### Missing or Invalid Coordinates

**Detection:**
Verification of presence and validity during extraction.

**Action:**
- Log warning
- Skip concerned OrderLine
- Continue processing others

**Consequence:**
OrderLine won't appear in optimization, but rest of graph is processed.

---

### Absent Time Windows

**Detection:**
Missing or invalid `isOpeningDuring` property.

**Action:**
Use `[null, null]` = no time constraint.

**Consequence:**
Location can be visited at any time according to optimization.

---

### Multiple OrderLines per Order

**Behavior:**
Each OrderLine is processed **independently**.

**Consequence:**
- One shipment per OrderLine
- Possibility of separate deliveries if optimized that way by Verso

**Note:** This behavior can be modified if need to group by Order.

---

### Steps Without ID (start/end)

**Case:**
Steps of type `start` and `end` have no Verso ID.

**Processing:**
- Create DFC Step
- No link with Shipment/OrderLine
- Purpose: mark route beginning and end

---

## Default Properties

| Property | Default value | Reason |
|----------|---------------|--------|
| `service` (Verso) | 1000 seconds | Standard stop time (configurable) |
| `time_windows` | `[null, null]` | No constraint if not provided |
| `waiting_time` | 0 | Calculated by Verso if early arrival |
| `end` (vehicle) | Same as `start` | Return to depot |

**Reference:** Constants in `optimizationService.js`

---

## Validation and Data Quality

### What is Validated

**By middleware:**
- ✅ Valid JSON format
- ✅ Presence of DFC context
- ✅ Numeric GPS coordinates in ranges
- ✅ Basic JSON-LD graph structure

**By Verso (indirectly):**
- ✅ Geographic consistency of points
- ✅ Feasibility of time constraints
- ✅ Format of sent data

---

### What is NOT Validated

**Client application responsibility:**
- ⚠️ Business consistency of orders
- ⚠️ Stock availability
- ⚠️ Data access rights
- ⚠️ Address validity
- ⚠️ Schedule relevance

**Important:** Do these validations **before** calling middleware.

---

## Transformations Debugging

### Debug Endpoint

**Route:** `POST /optimWhithVersoReturn`

**Purpose:**
See result of DFC → Verso transformation **without** calling Verso or doing reverse transformation.

**Return:**
```javascript
{
  vehicles: [...],
  shipments: [...]
}
```

**When to use:**
- Verify coordinates are extracted correctly
- See how many vehicles/shipments are generated
- Debug mapping issues

---

### Server Logs

**Logged information:**
- Warnings about invalid coordinates
- JSON-LD parsing errors
- Verso API errors
- HTTP requests (via morgan)

**Where to find them:**
- Docker logs: `docker-compose logs -f`
- PM2 logs: `pm2 logs verso-middleware`
- Console if dev mode

---

### Example Files

**Complete dataset provided:**
- `dataset/orders-DFC.json` → Input
- `dataset/needs-verso.json` → After transformation 1
- `dataset/results-verso.json` → Verso return
- `dataset/results-DFC.json` → Final output

**Usage:**
Compare your data with these examples to identify differences.

---

## Optimizations and Improvements

### Possible Optimizations

**Performance:**
- DFC context cache (avoid repeated fetch)
- Batch transformation processing
- JSON-LD framing parallelization

**Quality:**
- Strict JSON Schema validation
- Automatic address geocoding
- Duplicate detection (same location)

**Features:**
- Multiple time windows support
- Vehicle capacity management
- Volume/weight consideration

**Reference:** GitHub Issues to track evolutions

---

## Resources

### Technical Documentation

- **Source code:** `src/optimizationService.js` (~400 lines)
- **Tests:** `tests/optimizationService.test.js`
- **Architecture:** [docs/ARCHITECTURE-en.md](ARCHITECTURE-en.md)

### Standards

- **JSON-LD Spec:** https://json-ld.org/spec/latest/
- **JSON-LD Framing:** https://json-ld.org/spec/latest/json-ld-framing/
- **DFC Ontology:** https://github.com/datafoodconsortium/ontology

### Support

- **Questions:** [GitHub Discussions](../../discussions)
- **Bugs:** [GitHub Issues](../../issues)
- **Developer guide:** [docs/DEVELOPMENT-en.md](DEVELOPMENT-en.md)

