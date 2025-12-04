# Technical Architecture

Overview of the Verso Middleware architecture and its components.

---

## Global View

### Middleware Role

The middleware acts as a **translator and orchestrator** between two worlds:

**DFC World (Data Food Consortium):**
- Standardized protocol for food systems
- JSON-LD format (linked data)
- Business ontology (orders, products, places)

**Verso World:**
- Specialized logistics optimization API
- Proprietary JSON format
- Focus on VRP (Vehicle Routing Problem)

**The middleware enables:**
- DFC platforms to benefit from Verso optimization without knowing it
- Verso to process data without managing the DFC protocol
- Enrichment of business data with logistics

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│          DFC PLATFORMS (clients)                        │
│   - Open Food Network                                   │
│   - Cagette                                             │
│   - Other DFC-compatible platforms                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP POST /optim
                 │ Content-Type: application/json
                 │ Body: JSON-LD (DFC Orders)
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│             VERSO MIDDLEWARE                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Express Server (src/index.js)                  │   │
│  │  - HTTP request handling                        │   │
│  │  - Security (helmet, cors)                      │   │
│  │  - Logging (morgan)                             │   │
│  │  - Routes: /health, /optim                      │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                   │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │  Optimization Service                           │   │
│  │  (src/optimizationService.js)                   │   │
│  │                                                  │   │
│  │  Phase 1: DFC → Verso Transformation            │   │
│  │   - JSON-LD framing (extract Orders)            │   │
│  │   - GPS coordinates extraction                  │   │
│  │   - Time windows extraction                     │   │
│  │   - Build vehicles & shipments                  │   │
│  │                                                  │   │
│  │  Phase 2: Verso API Call                        │   │
│  │   - HTTP POST with authentication               │   │
│  │   - Error and timeout handling                  │   │
│  │                                                  │   │
│  │  Phase 3: Verso → DFC Transformation            │   │
│  │   - DFC context enrichment                      │   │
│  │   - Create logistics entities                   │   │
│  │   - Link with original orders                   │   │
│  │   - JSON-LD framing result                      │   │
│  └──────────────────┬──────────────────────────────┘   │
└────────────────────┼──────────────────────────────────┘
                     │
                     │ HTTP POST
                     │ Content-Type: application/json
                     │ Body: JSON (Verso format)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              VERSO API                                  │
│   - VRP optimization engine                             │
│   - Optimal route calculation                           │
│   - Return: routes with geometries                      │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Components

### 1. Express Server (src/index.js)

**Responsibilities:**
- HTTP entry point
- Request orchestration
- Global error handling
- Basic security

**Middleware used:**

| Middleware | Role |
|-----------|------|
| `helmet` | HTTP headers protection (XSS, clickjacking, etc.) |
| `cors` | Cross-origin request management |
| `morgan` | Request logging (combined format) |
| `express.json()` | JSON body parsing (10MB limit) |

**Exposed routes:**

| Route | Method | Handler | Role |
|-------|---------|---------|------|
| `/health` | GET | Direct | Service health |
| `/optim` | POST | `OptimizationService` | Complete optimization |
| `/optimWhithVersoReturn` | POST | `OptimizationService` | Transformation debug |

**File reference:** `src/index.js` (~100 lines)

---

### 2. Optimization Service (src/optimizationService.js)

**Responsibilities:**
- Transformation business logic
- Verso API call
- JSON-LD data handling

**Class:** `OptimizationService`

**Main methods:**

#### `transformDFCtoVerso(dfcGraph)`

**Role:** Convert a DFC graph to Verso format

**Input:** DFC JSON-LD object
**Output:** `{ versoNeeds, dfcNeeds }`

**Steps:**
1. Graph validation
2. JSON-LD framing to extract Orders
3. Loop over each Order/OrderLine
4. Extract source (stock) and destination (pickup) coordinates
5. Extract time windows
6. Create Verso vehicles (one per source)
7. Create Verso shipments (pickup + delivery)
8. Add Verso IDs to OrderLines (traceability)

**Reference:** ~150 lines in `optimizationService.js`

---

#### `callVersoOptimization(versoNeeds)`

**Role:** Call Verso API and retrieve routes

**Input:** Verso object `{ vehicles, shipments }`
**Output:** Verso result `{ routes }`

**Steps:**
1. Retrieve URL and API key (config)
2. HTTP POST to Verso
3. Headers: Content-Type + Authorization Bearer
4. HTTP error handling
5. JSON response parsing

**Reference:** ~30 lines in `optimizationService.js`

---

#### `transformVersoToDFC(versoResult, dfcNeeds)`

**Role:** Enrich DFC graph with Verso routes

**Input:** Verso result + Original DFC graph
**Output:** Enriched DFC graph

**Steps:**
1. Load and enrich DFC context
2. Flatten DFC graph (easier access)
3. Loop over each Verso route:
   - Create DFC Vehicle entity
   - Create DFC Route entity (with geometry)
   - Loop over each step:
     - Create DFC Step entity
     - If pickup/delivery: create Shipment and link with OrderLine
4. Return enriched graph

**Reference:** ~200 lines in `optimizationService.js`

---

### 3. Configuration (config.js)

**Role:** Centralize configuration

**Configuration sources:**
1. `config.json` file (priority)
2. Environment variables (fallback)
3. Default values

**Managed parameters:**
- `VERSO_OPTIM_API_URL` - Verso API URL
- `VERSO_API_KEY` - Authentication key
- `CONTEXT_JSON_URL` - DFC context URL
- `JSONLD_BASE` - Base URI for identifiers

**Reference:** File `config.example.json`

---

## Detailed Data Flow

### Phase 1: Reception and Validation

```
HTTP Request → Express → JSON Parsing → Basic validation
                             ↓
                   DFC Graph (JavaScript object)
```

**Validations:**
- Well-formed JSON
- Presence of `@context`
- Object type (object, not array at root)

---

### Phase 2: DFC → Verso Transformation

```
DFC Graph → JSON-LD Framing → Extracted Orders
              ↓
         Loop OrderLines
              ↓
    Extract GPS coordinates
              ↓
    Extract time windows
              ↓
    Build Verso
    {vehicles: [...], shipments: [...]}
```

**Key points:**
- One Verso `vehicle` per source location (stock)
- One Verso `shipment` per OrderLine
- Add Verso IDs to OrderLines for traceability

---

### Phase 3: Verso Optimization

```
Verso Data → HTTP POST → Verso API → Optimized routes
                              ↓
                      Error handling
                              ↓
                     Verso JSON result
                     {routes: [...]}
```

**Attention points:**
- Authentication via Bearer token
- Potential timeout (depends on complexity)
- HTTP errors to handle (400, 401, 500, etc.)

---

### Phase 4: Verso → DFC Transformation

```
Verso Routes + Original DFC Graph
              ↓
    DFC context enrichment
              ↓
    Graph flattening
              ↓
    Loop over routes
              ↓
Create Vehicle, Route, Shipment, Step
              ↓
   Link with OrderLines
              ↓
   Final enriched DFC graph
```

**Entity mapping:**
- Verso Route → DFC Route + DFC Vehicle
- Verso Step → DFC Step
- Step ↔ OrderLine association via Verso IDs
- Create Shipment to link OrderLine and Route

---

## Technologies and Dependencies

### Technical Stack

**Runtime:**
- **Node.js 20+** - Server-side JavaScript
- **ES6+** - Modern syntax (async/await, arrow functions, etc.)

**Web Framework:**
- **Express.js 4.18** - HTTP server and routing

**Data Processing:**
- **jsonld 8.3** - JSON-LD manipulation (framing, flattening, expansion)
- **node-fetch 2.7** - HTTP client for Verso call

**Security and Utilities:**
- **helmet 7.1** - HTTP headers security
- **cors 2.8** - CORS configuration
- **morgan 1.10** - Request logging
- **dotenv 16.4** - Environment variables management

**Tests:**
- **Jest 29.7** - Unit testing framework

**Development:**
- **Nodemon 3.0** - Auto-reload in dev mode

**Reference:** File `package.json`

---

## Data Management

### JSON-LD and DFC Ontology

**Why JSON-LD:**
- W3C standard for linked data
- Allows integrating multiple data sources
- Shared context (DFC ontology)
- Framing to query the graph

**JSON-LD operations used:**

| Operation | Role | Used in |
|-----------|------|---------------|
| **Frame** | Extract specific entities | `transformDFCtoVerso()` |
| **Flatten** | Flatten graph for easy access | `transformVersoToDFC()` |
| **Context** | Define vocabulary and types | All transformations |

**Reference:** `jsonld.js` library

---

### DFC Ontology Extension

**Problem:** The standard DFC ontology doesn't contain logistics concepts.

**Solution:** The middleware adds custom properties to the context:

**Added entities:**
- `dfc-b:Route` - Optimized itinerary
- `dfc-b:Vehicle` - Vehicle
- `dfc-b:Shipment` - Shipment
- `dfc-b:Step` - Itinerary step

**Added properties:**
- `dfc-b:geometry` - Geometry (polyline)
- `dfc-b:vehicle`, `dfc-b:steps` - Relations
- `dfc-b:stepType`, `dfc-b:geo`, `dfc-b:arrival` - Step data
- `dfc-b:versoIdPickup`, `dfc-b:versoIdDelivery` - Traceability IDs

**Reference:** Method `transformVersoToDFC()` for enriched context

---

## Performance and Scalability

### Processing Times

**Typical breakdown (10 orders):**

| Phase | Time | % |
|-------|-------|---|
| DFC parsing and framing | ~100ms | 3% |
| DFC → Verso transformation | ~50ms | 2% |
| Verso API call | ~3000ms | 90% |
| Verso → DFC transformation | ~150ms | 5% |
| **Total** | **~3300ms** | **100%** |

**Observation:** Verso API represents 90% of time, middleware is fast.

---

### Performance Factors

**Middleware side:**
- DFC graph size (number of entities)
- JSON-LD framing/flattening complexity
- Server resources (CPU, RAM)

**Verso side:**
- Number of points to optimize
- Geographic dispersion
- Time constraints
- Verso API load

---

### Possible Optimizations

**Short term:**
- DFC context cache (avoid repeated download)
- Early data validation (fail fast)
- Response compression

**Medium term:**
- Queue system for asynchronous requests
- Cache of recent optimizations (if identical orders)
- HTTP connection pool

**Long term:**
- Horizontal scalability (multiple instances)
- Load balancing
- Incremental optimization (reuse previous results)

**Reference:** "Evolutions" section in [docs/CONTEXT-en.md](CONTEXT-en.md)

---

## Security

### Implemented Measures

**Headers Protection (Helmet):**
- XSS protection
- Clickjacking prevention
- HSTS (if HTTPS)
- Content Security Policy

**Data Validation:**
- GPS coordinates verification
- Graceful error handling
- No injection possible (typed JSON-LD)

---

### Attention Points

**Currently not implemented:**
- ⚠️ Authentication (no identity verification)
- ⚠️ Rate limiting (no usage limitation)
- ⚠️ JSON schema validation (minimal validation)
- ⚠️ Audit logging (basic logs only)

**Production recommendations:**
- Add authentication (JWT, API key)
- Configure rate limiting (express-rate-limit)
- Restrict CORS to authorized domains
- Log access for audit

**Reference:** Security section in [docs/DEPLOYMENT-en.md](DEPLOYMENT-en.md)

---

## Tests

### Test Architecture

**File:** `tests/optimizationService.test.js`

**Framework:** Jest

**Coverage:**
- DFC → Verso transformation
- Verso API call (mocked)
- Verso → DFC transformation

**Strategy:**
- Unit tests on `OptimizationService`
- Verso API mocking
- Use of real example data

**Reference:** Command `yarn test` for execution

---

## Architecture Evolution

### Current Limitations

**Design:**
- Synchronous architecture (no async jobs)
- No persistence (completely stateless)
- Single optimization point (no distribution)

**Scalability:**
- Single instance
- No cache
- No queue

---

### Possible Future Architecture

**Evolution to microservices:**

```
API Gateway → Auth Service
              ↓
      Verso Middleware (multiple instances)
              ↓
      Queue (RabbitMQ/Kafka)
              ↓
      Optimization Workers
              ↓
      Cache (Redis) + Database
```

**Benefits:**
- Horizontal scalability
- Resilience (retry, fallback)
- Granular monitoring
- Asynchronous optimization

**Reference:** Discussion in [docs/CONTEXT-en.md](CONTEXT-en.md)

---

## Resources

### Technical Documentation

- **Source code:** `src/` folder
- **Tests:** `tests/` folder
- **Detailed transformations:** [docs/TRANSFORMATIONS-en.md](TRANSFORMATIONS-en.md)

### Standards and Specifications

- **JSON-LD:** https://json-ld.org/
- **DFC Ontology:** https://github.com/datafoodconsortium/ontology
- **Express.js:** https://expressjs.com/
- **Node.js:** https://nodejs.org/

### Support

- **Issues:** [GitHub Issues](../../issues)
- **Development:** [docs/DEVELOPMENT-en.md](DEVELOPMENT-en.md)

