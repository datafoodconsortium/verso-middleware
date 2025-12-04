# API Guide - Consumers

Documentation for using the Verso Middleware API.

---

## Basic Configuration

### Service URL

The middleware exposes a REST API on port 3001 by default:
- **Development:** `http://localhost:3001`
- **Production:** URL configured by your administrator

### Communication Format

All communications use **JSON-LD** according to the DFC standard:
- Content-Type: `application/json`
- Format: JSON-LD with DFC context
- Method: HTTP POST for optimization

---

## Available Endpoints

### 1. Health Check

**Route:** `GET /health`

**Purpose:** Verify that the service is active and responding correctly.

**Expected response:** Code 200 with "OK" status

**When to use:**
- Before sending an optimization request
- In your monitoring systems
- To debug connectivity issues

---

### 2. Route Optimization

**Route:** `POST /optim`

**Purpose:** Send DFC orders and receive optimized routes in DFC format.

**Flow:**
1. You send a DFC JSON-LD graph containing your orders
2. The middleware transforms your data for Verso
3. Verso calculates optimal routes
4. The middleware enriches your DFC graph with routes
5. You receive the enriched graph

**What you send:**
- DFC graph with `Order` and `OrderLine` entities
- Addresses with GPS coordinates (mandatory)
- Opening hours (optional)

**What you receive:**
- All your original graph
- New `Route` entities with optimized itineraries
- `Vehicle`, `Shipment`, `Step` entities linked to your orders
- Route geometries (polylines)
- Estimated arrival times

---

### 3. Transformation Debug

**Route:** `POST /optimWhithVersoReturn`

**Purpose:** See how your DFC data is transformed to Verso format, without receiving DFC result.

**When to use:**
- Debug transformation issues
- Understand how the middleware interprets your data
- Verify that coordinates are correctly extracted

⚠️ **Warning:** This endpoint returns Verso JSON (not DFC), it's for debugging only.

---

## Required Data

### Mandatory Data

For optimization to work, your DFC graph **must** contain:

#### 1. Addresses with GPS Coordinates

**Why:** Verso needs exact coordinates to calculate distances and travel times.

**Where to provide them:**
- Address of the storage location (where the goods are)
- Address of the pickup/delivery point (where the order goes)

**Required format:**
- `dfc-b:latitude`: Decimal number (-90 to 90)
- `dfc-b:longitude`: Decimal number (-180 to 180)

**⚠️ If missing:** The OrderLine will be ignored with a warning in the logs.

#### 2. Complete Order Structure

**Required path in the graph:**
```
Order → OrderLine → Offer → RealStock → PhysicalPlace (with Address)
      → selects → Order → pickedUpAt → PhysicalPlace (with Address)
```

**Reference:** See example files in `dataset/orders-DFC.json`

### Optional Data

#### Opening Hours (Time Windows)

**Purpose:** Constrain visit times (e.g., open 8 AM-6 PM).

**DFC property:** `dfc-b:isOpeningDuring` with `start` and `end`

**If not provided:** No time constraint applied.

**Reference:** See `optimizationService.js` → function `extractTimeWindow()`

---

## Understanding the Results

### Result Structure

You receive your DFC graph **enriched** with new logistics entities:

#### Added Entities

| Entity | Role | Relation with your data |
|--------|------|-------------------------|
| **Route** | Complete optimized itinerary | One route per vehicle |
| **Vehicle** | Delivery vehicle | Automatically created per source |
| **Shipment** | Goods shipment | Links your OrderLine to a Route |
| **Step** | Itinerary step | Each stop with time and duration |

#### Route Geometries

**Property:** `dfc-b:geometry`

**Format:** Encoded polyline (Google format)

**Purpose:** Display the route on a map (Leaflet, Google Maps, etc.)

**Decoding:** Use a library like `@mapbox/polyline` (JavaScript) or `polyline` (Python)

#### Times and Durations

**For each Step:**
- `dfc-b:arrival`: UNIX timestamp of arrival time
- `dfc-b:duration`: Step duration in seconds
- `dfc-b:waiting_time`: Waiting time before opening hours

**Possible calculations:**
- End time of step = arrival + duration
- Total route duration = sum of durations
- Estimated time to inform your customers

---

## Data Validation

### What the Middleware Checks

#### GPS Coordinates

**Validation:**
- Presence of latitude AND longitude
- Valid numeric values
- In correct ranges (-90/90, -180/180)

**If invalid:** The OrderLine is **silently ignored** with a warning in server logs.

#### JSON-LD Format

**Validation:**
- Presence of `@context`
- Graph structure with `@graph` or direct objects
- Recognized DFC types (`dfc-b:Order`, etc.)

**If invalid:** Error 400 or 500 depending on error type.

### What the Middleware Does NOT Check

⚠️ The middleware does not validate:
- Business consistency of your orders
- Quantities or available stock
- Access rights or permissions
- Validity of future dates/times

These validations must be done **in your platform** before calling the middleware.

---

## Error Handling

### Error Types

#### Error 400 - Invalid Data

**Possible causes:**
- Malformed JSON
- Missing or invalid DFC context
- Incorrect graph structure

**Solution:** Check your data format with examples in `dataset/`

#### Error 500 - Server Error

**Possible causes:**
- Verso API error (invalid key, service unavailable)
- All coordinates in your graph are invalid
- Internal transformation error

**Solution:**
- Check server logs
- Contact the administrator if the problem persists

#### Timeout

**Cause:** Optimization takes too long (very complex graph)

**Recommended timeout:** Minimum 60 seconds for requests

**Solution:** Reduce the number of orders or contact the administrator

---

## Performance and Limits

### Typical Processing Times

| Number of Orders | Estimated Time |
|------------------|----------------|
| 1-10 orders | 2-5 seconds |
| 10-50 orders | 5-15 seconds |
| 50-100 orders | 15-60 seconds |

**Variables influencing time:**
- Geographic complexity (dispersion of points)
- Time constraints
- Verso server load

### Technical Limits

**Maximum request size:** 10 MB

**Current non-configurable limits:**
- Fixed service time (1000 seconds)
- One vehicle per source location
- No vehicle capacity limit

**Reference:** These limits are defined in `src/optimizationService.js`

---

## Integration in Your Application

### Integration Steps

#### 1. DFC Data Retrieval

Gather your orders in DFC format from:
- Your local platform
- Other DFC platforms (via API)
- A DFC federation system

#### 2. Pre-validation

Before sending to the middleware:
- ✅ Check that all addresses have coordinates
- ✅ Validate the JSON-LD graph structure
- ✅ Ensure that orders are ready to be delivered

#### 3. Middleware Call

Configure your HTTP client:
- Middleware URL
- Sufficient timeout (60s+)
- Network error handling

#### 4. Results Exploitation

With the enriched graph received:
- Display routes on a map
- Inform customers of estimated times
- Generate route sheets for drivers
- Archive the optimization for analysis

### Technical Considerations

**Identifier Format:**
- IDs of new entities are generated by the middleware
- Format: `http://verso-middleware.org/vehicle-1`, etc.
- These IDs are stable for a given request

**Cache Management:**
- No middleware-side cache currently
- Same data may return slightly different routes (optimization can vary)

**Idempotence:**
- The API is **not idempotent**: two identical calls may give slightly different results

---

## Testing and Validation

### Test Your Integration

#### Phase 1: Health Check

Verify that you can reach the service.

#### Phase 2: Sample Data

Test with the files provided in `dataset/orders-DFC.json` to validate that your client works.

#### Phase 3: Your Real Data

Start with a small subset (2-3 orders) before scaling up.

### Debugging

#### Problem: No Routes Returned

**Causes:**
- All coordinates are invalid
- Incorrect DFC structure

**Debug:** Use `/optimWhithVersoReturn` to see the Verso transformation

#### Problem: Inconsistent Routes

**Causes:**
- Incorrect GPS coordinates (reversed lat/lon?)
- Too restrictive opening hours

**Solution:** Check your source data

---

## Security and Best Practices

### Sensitive Data

⚠️ **Warning:**
- Currently no authentication
- All data sent travels in clear text (HTTPS recommended)
- Data is sent to the third-party Verso API

**Recommendations:**
- Do not send unnecessary personal data
- Use HTTPS in production
- Check Verso's terms of use

### Rate Limiting

⚠️ **Currently not implemented**

In production, rate limiting should be configured:
- To avoid service overload
- To control Verso API costs

**Reference:** See [docs/DEPLOYMENT-en.md](DEPLOYMENT-en.md) for recommended configuration

---

## Additional Resources

### Technical Documentation

- **Detailed DFC format:** [Business API DFC](https://github.com/datafoodconsortium/business-api)
- **Data examples:** Project `dataset/` folder
- **Transformations:** [docs/TRANSFORMATIONS-en.md](TRANSFORMATIONS-en.md)

### Support

- **General questions:** [GitHub Discussions](../../discussions)
- **Bugs and issues:** [GitHub Issues](../../issues)
- **Deployment guide:** [docs/DEPLOYMENT-en.md](DEPLOYMENT-en.md)

