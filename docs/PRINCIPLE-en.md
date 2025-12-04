# Functional Principle and Usage

## Overview

The **Verso Middleware** acts as a bridge between:
- The **DFC protocol** (Data Food Consortium) used by food platforms
- The **Verso API** specialized in logistics optimization (VRP - Vehicle Routing Problem)

## Problem Statement

### Without the Middleware

Each platform would need to:
1. Learn the Verso API (proprietary format)
2. Implement DFC ↔ Verso transformations
3. Handle the complexity of data mapping
4. Maintain the transformation code

### With the Middleware

Platforms:
1. Send their orders in **standard DFC format**
2. Receive optimized routes in **standard DFC format**
3. No knowledge of Verso required

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                   DFC PLATFORM                           │
│                                                          │
│  Orders:                                                 │
│   - Order 1: Producer A → Customer 1                     │
│   - Order 2: Producer B → Customer 1                     │
│   - Order 3: Producer A → Customer 2                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ POST /optim
                     │ DFC JSON-LD (Orders)
                     ▼
┌──────────────────────────────────────────────────────────┐
│              VERSO MIDDLEWARE                            │
│                                                          │
│  Step 1: Parse DFC                                       │
│   → Extract addresses (lat/lon)                          │
│   → Extract time windows                                 │
│   → Build Verso structure                                │
│                                                          │
│  Step 2: Optimization                                    │
│   → Call Verso API with vehicles + shipments            │
│   → Receive optimized routes                             │
│                                                          │
│  Step 3: DFC Reconstruction                              │
│   → Create Route, Vehicle, Shipment, Step               │
│   → Link with original Orders                            │
│   → Enrich DFC graph                                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Response 200 OK
                     │ DFC JSON-LD (Routes + Orders)
                     ▼
┌──────────────────────────────────────────────────────────┐
│                   DFC PLATFORM                           │
│                                                          │
│  Result:                                                 │
│   - Route 1: Producer A → Customer 1 → Customer 2        │
│   - Route 2: Producer B → Customer 1                     │
│   - Route geometries (polylines)                         │
│   - Estimated arrival times                              │
└──────────────────────────────────────────────────────────┘
```

## Validated Use Cases

### 1. Multi-Platform Optimization

**Scenario:** A producer has orders on Open Food Network AND Cagette.

**Solution:** The producer retrieves all orders (DFC protocol), sends them to the middleware, and gets a single optimized route.

**Benefit:** Saves time and fuel.

### 2. Multi-Producer Optimization

**Scenario:** A logistics provider delivers for multiple producers.

**Solution:** The logistics provider accesses orders from multiple producers, sends them all to the middleware, and gets consolidated routes.

**Benefit:** Shared logistics costs.

### 3. Multi-Platform + Multi-Producer Combination

**Scenario:** A logistics provider manages multiple producers across multiple platforms.

**Solution:** Global optimization of all orders in a single request.

**Benefit:** Maximum optimization.

## Key Concepts

### Input Data (DFC)

- **Order** - A customer order
- **OrderLine** - An order line (product + quantity)
- **PhysicalPlace** - Physical location (producer, pickup point)
- **Address** - Address with GPS coordinates
- **TimeWindow** - Time slot (opening hours)

### Output Data (Enriched DFC)

Everything from input **+**:

- **Route** - Optimized itinerary with geometry
- **Vehicle** - Delivery vehicle
- **Shipment** - Shipment (from which stock to which customer)
- **Step** - Route step (start, pickup, delivery, return)

## Visual Example

### Before Optimization

```
Producer A (Stock) ──┐
Producer B (Stock) ──┤
Producer C (Stock) ──┤
                     │
                     ├──> Customer 1
                     ├──> Customer 2
                     └──> Customer 3
                     
How to deliver efficiently?
```

### After Optimization

```
Route 1: Producer A → Customer 1 → Customer 3 → Producer A
         Depart 8:00 AM, Arrive 12:30 PM, 45km

Route 2: Producer B → Customer 2 → Customer 1 → Producer B
         Depart 8:30 AM, Arrive 11:00 AM, 32km

Route 3: Producer C → Customer 3 → Producer C
         Depart 9:00 AM, Arrive 10:30 AM, 18km
```

## Middleware Benefits

✅ **Simplicity** - No need to learn the Verso API  
✅ **Standard** - Uses only the DFC protocol  
✅ **Interoperability** - Works with any DFC platform  
✅ **Enrichment** - Combines business data + logistics  
✅ **Flexibility** - Supports multiple use cases  

## Current Limitations

⚠️ **Fixed service time** - 1000 seconds by default  
⚠️ **One vehicle per source** - No automatic grouping  
⚠️ **No capacity constraints** - Unlimited volume  
⚠️ **No return management** - Only round-trip depot  

**📖 Planned evolutions:** [Context and Roadmap](docs/CONTEXT-en.md)

---

## Going Further

- [📖 Detailed API guide](docs/API-en.md) - All endpoints and formats
- [📦 Concrete examples](docs/EXAMPLES-en.md) - Code and datasets
- [🏗️ Technical architecture](docs/ARCHITECTURE-en.md) - Internal workings
- [⚙️ Transformations](docs/TRANSFORMATIONS-en.md) - Conversion logic
- [🚀 Deployment](docs/DEPLOYMENT-en.md) - Production installation
- [💻 Development](docs/DEVELOPMENT-en.md) - Contributing to the code


