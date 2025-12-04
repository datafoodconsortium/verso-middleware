# Practical Usage Guide

Practical guide to integrate and use the Verso Middleware in different contexts.

---

## Demonstration Data

### Available Files

The project provides a complete set of example data in the `dataset/` folder:

| File | Content | Purpose |
|------|---------|---------|
| `orders-DFC.json` | Complete DFC orders | Test middleware input |
| `needs-verso.json` | Generated Verso format | Understand transformation |
| `results-verso.json` | Raw Verso result | See API response |
| `results-DFC.json` | Enriched DFC result | Example complete output |

### Using Examples

**To test quickly:**
- Use `orders-DFC.json` as a model for your own data
- Compare your structure with this example
- Verify that you have all mandatory fields

**To understand transformations:**
- Follow the path: orders-DFC → needs-verso → results-verso → results-DFC
- Observe how entities are created and linked

---

## Usage Scenarios

### Scenario 1: Multi-Platform Producer

**Context:**
A vegetable producer uses Open Food Network and Cagette. They have 5 orders to deliver this week.

**Workflow:**

1. **Data Collection**
   - Retrieve orders from OFN (DFC API)
   - Retrieve orders from Cagette (DFC API)
   - Merge DFC graphs

2. **Verification**
   - Ensure all addresses have GPS coordinates
   - Check pickup point opening hours

3. **Optimization**
   - Send the merged graph to the middleware
   - Receive optimized routes

4. **Exploitation**
   - Display the route on a map
   - Print the route sheet
   - Inform customers of visit times

**Benefits:**
- One round instead of two
- Time and fuel savings
- Optimal delivery order

---

### Scenario 2: Shared Logistics Provider

**Context:**
A logistics provider delivers for 3 different producers. They need to optimize 15 orders in one day.

**Workflow:**

1. **Data Access**
   - The logistics provider has access (with authorization) to their producers' orders
   - Each producer exposes their orders via DFC

2. **Aggregation**
   - The logistics provider's system collects all orders
   - Creation of a global DFC graph

3. **Optimization**
   - Single request to the middleware with all orders
   - Verso calculates shared routes

4. **Results Distribution**
   - The logistics provider receives the routes
   - Each producer is informed of their schedule

**Benefits:**
- Shared transport costs
- Better global optimization than individual
- Reduced carbon footprint

---

### Scenario 3: Territorial Platform

**Context:**
A platform manages 10 producers and 50 sales/pickup points in a territory.

**Workflow:**

1. **Daily Collection**
   - Automatic aggregation of yesterday's orders
   - Building a complete DFC graph

2. **Pre-processing**
   - Address validation (geocoding if necessary)
   - Time slot verification
   - Filtering ready orders

3. **Optimization**
   - Call to middleware with all validated orders
   - Timeout handling (large volume)

4. **Distribution**
   - Route sheet generation per producer
   - Customer notifications
   - Export to tracking system

**Benefits:**
- Complete automation
- Territory-wide overview
- Scale optimization

---

## Technical Integrations

### Frontend Web Application

**Typical architecture:**
```
Frontend (React/Vue) → Backend (Node.js/Python) → Verso Middleware → Verso API
                            ↓
                    DFC Database
```

**Frontend Responsibilities:**
- User interface to select orders
- Interactive map to visualize routes
- Display estimated times

**Backend Responsibilities:**
- DFC graph construction
- Middleware call
- Results processing
- Optimization storage

**Reference:** The DFC prototype (`dfc-prototype-V3`) implements this pattern

---

### Automated Batch System

**Use case:** Automatic daily optimization

**Architecture:**
```
Cron/Scheduler → Script → Verso Middleware
                   ↓
         PDF/Email/API Export
```

**Script steps:**
1. Retrieve today's orders
2. Build DFC graph
3. Call middleware
4. Generate reports
5. Stakeholder notification

**Considerations:**
- Error handling (retry, alerts)
- Detailed logging
- Results archiving

---

### Microservices Architecture

**Recommended pattern:**
```
Order Service → DFC Aggregator → Verso Middleware → Optimization Service
                                                           ↓
                                                    Notification Service
```

**Advantages:**
- Service decoupling
- Scalability
- Resilience (retry, fallback)

**Communication:**
- REST for middleware
- Queue (RabbitMQ, Kafka) for async if needed

---

## Results Processing

### Extracting Routes

**What you receive:**
An enriched DFC graph containing your original data + new logistics entities.

**How to extract:**
1. Parse received JSON-LD
2. Filter entities by type (`@type === 'dfc-b:Route'`)
3. For each route, retrieve associated steps
4. Find linked orders via Shipments

**Reference:** See method `transformVersoToDFC()` in `src/optimizationService.js`

---

### Map Display

**Route Geometries:**
- Format: Encoded polyline (Google standard)
- Decoding required before display

**Recommended libraries:**
- **JavaScript:** Leaflet + `@mapbox/polyline`
- **Python:** Folium + `polyline`

**Elements to display:**
- Route trace (decoded polyline)
- Markers for each step
- Popup with information (time, step type)
- Visual differentiation (pickup vs delivery)

---

### Route Sheet Generation

**Useful information per step:**
- Step type (start, pickup, delivery, return)
- Address (extract via linked OrderLine)
- Estimated arrival time
- Stop duration
- Products to load/unload (via OrderLine → Offer)

**Possible output formats:**
- Printable PDF
- CSV for GPS import
- Dedicated mobile application

---

## Handling Special Cases

### Orders Without GPS Coordinates

**Problem:** Some addresses don't have coordinates.

**Solutions:**
1. **Pre-geocoding:** Use a geocoding API (Nominatim, Google Geocoding) to get coordinates
2. **User interface:** Allow the user to place a marker on a map
3. **Address database:** Maintain a geocoded address repository

**Important:** The middleware will ignore OrderLines without coordinates.

---

### Complex Opening Hours

**Current limitation:** Only one time slot per location.

**If you have multiple slots:**
1. Choose the widest slot
2. Or create multiple OrderLines (one per slot)
3. Or post-process results to check compatibility

**Future evolution:** Support for multiple time windows (see [docs/CONTEXT-en.md](CONTEXT-en.md))

---

### Large Volumes

**Problem:** More than 100 orders to optimize.

**Strategies:**
1. **Geographic splitting:** Optimize by zone
2. **Temporal splitting:** Optimize by day
3. **Pre-clustering:** Group nearby orders before optimization
4. **Adapted timeout:** Increase your HTTP client timeout

**Reference:** Performance is documented in [docs/ARCHITECTURE-en.md](ARCHITECTURE-en.md)

---

### Unsatisfactory Results

**If the optimization doesn't suit:**

**Possible causes:**
- Too strict time constraints
- Incorrect GPS coordinates
- Very dispersed points geographically

**Actions:**
1. Check input data (coordinates, times)
2. Relax time constraints
3. Contact administrator to adjust Verso parameters

**Note:** The middleware uses Verso default parameters (service time = 1000s, etc.)

---

## Testing and Validation

### Recommended Testing Phase

#### 1. Unit Tests (Sample Data)

**Objective:** Validate your technical integration

- Use `dataset/orders-DFC.json`
- Verify that you receive a result
- Validate result parsing

#### 2. Tests with Real Data (Small Volume)

**Objective:** Validate data quality

- Start with 2-3 real orders
- Verify that coordinates are correct
- Validate times on a map

#### 3. Load Tests

**Objective:** Validate performance

- Test with 10, 20, 50 orders
- Measure response times
- Adjust timeouts

#### 4. User Tests

**Objective:** Validate UX and relevance

- Have real producers/logistics providers test
- Collect feedback on proposed routes
- Adjust parameters if necessary

---

## Monitoring and Tracking

### Metrics to Monitor

**Application side:**
- Optimization success rate
- Middleware response time
- Number of orders processed per day

**Business side:**
- Distance/time savings achieved
- Driver satisfaction rate
- Customer time compliance

### Debugging

**In case of problem:**

1. **Check server logs** of the middleware
2. **Use `/optimWhithVersoReturn`** to see transformation
3. **Isolate the problem:** test with a single order
4. **Compare with examples** from `dataset/` folder

**Reference:** The development guide [docs/DEVELOPMENT-en.md](DEVELOPMENT-en.md) details debugging

---

## Evolutions and Customizations

### Configurable Parameters

Currently, some parameters are fixed in the code. To modify them:

**File:** `src/optimizationService.js`

**Modifiable parameters:**
- Service time (default stop time)
- Verso API URL
- Generated identifier format

**Warning:** Modifications require good code understanding.

### Possible Extensions

**Improvement ideas:**
- Cache of recent optimizations
- History of completed routes
- Carbon footprint calculation
- Export to GPS applications
- Dedicated visualization interface

**Reference:** Planned evolutions are in [docs/CONTEXT-en.md](CONTEXT-en.md)

---

## Resources

### Documentation

- **Detailed API:** [docs/API-en.md](API-en.md)
- **Architecture:** [docs/ARCHITECTURE-en.md](ARCHITECTURE-en.md)
- **Transformations:** [docs/TRANSFORMATIONS-en.md](TRANSFORMATIONS-en.md)

### Support

- **Questions:** [GitHub Discussions](../../discussions)
- **Bugs:** [GitHub Issues](../../issues)

### DFC Community

- **Official website:** https://datafoodconsortium.org/
- **GitHub:** https://github.com/datafoodconsortium

