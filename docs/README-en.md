# Verso Middleware - DFC ↔ Verso

Middleware enabling logistics optimization of orders in [Data Food Consortium (DFC)](https://datafoodconsortium.org/) format via the [Verso](https://verso-optim.com/) API.

**📖 Documentation:** [Français](../README.md) | [English](README-en.md)

---

## 🎯 1. Functional Principle and Usage

### What is it?

A service that transforms **DFC orders** into **optimized routes**:

```
DFC Orders (JSON-LD)  →  Verso Middleware  →  Optimized DFC Routes (JSON-LD)
                                  ↓
                          Verso API (optimization)
```

### What is it for?

**3 main use cases:**

1. ✅ **Multi-platform** - A producer optimizes deliveries for orders from multiple platforms
2. ✅ **Multi-producer** - A logistics provider shares deliveries for multiple producers
3. ✅ **Multi-platform + Multi-producer** - Global optimization

### How does it work?

1. You send your **orders in DFC format** (with addresses and schedules)
2. The middleware transforms them for the Verso API
3. Verso calculates **optimized routes**
4. The middleware returns the result **in enriched DFC format** (routes, vehicles, steps)

**📖 More details:** [Understanding how it works](PRINCIPLE-en.md) | [🇫🇷 Français](PRINCIPE-fr.md)

---

## 🔌 2. Using the API (Consumers)

### Quick Start

```bash
# Service health
curl http://localhost:3001/health

# Optimize routes
curl -X POST http://localhost:3001/optim \
  -H "Content-Type: application/json" \
  -d @my-dfc-orders.json
```

### Available Endpoints

| Endpoint | Method | Usage |
|----------|--------|-------|
| `/health` | GET | Check that the service is running |
| `/optim` | POST | Optimize orders (DFC input and output) |

### Data Format

**Input:** DFC JSON-LD graph containing `Order` with:
- Addresses (latitude/longitude)
- Opening hours
- Products and stocks

**Output:** Enriched DFC JSON-LD graph with:
- `Route` - Optimized itineraries
- `Vehicle` - Vehicles
- `Shipment` - Shipments/deliveries
- `Step` - Steps of each route

**📖 Complete documentation:** [API Guide](API-en.md) | [🇫🇷 Français](API-fr.md)

**📦 Data examples:** [Examples](EXAMPLES-en.md) | [🇫🇷 Français](EXEMPLES-fr.md)

---

## 🚀 3. Deploy the Service (Managers)

### Installation with Docker

**⚠️ Recommended and required method**

```bash
# 1. Create configuration
mkdir -p ../secrets/production
cp config.example.json ../secrets/production/config-verso.json
# Edit config-verso.json with your Verso API key

# 2. Create Docker network
docker network create dfc_shared_network

# 3. Start in production
docker-compose -f docker-compose-prod.yml up -d

# 4. Verify
curl http://localhost:3001/health
```

**Available environments:**
- `docker-compose.yml` - Development (auto-reload)
- `docker-compose-test.yml` - Tests
- `docker-compose-prod.yml` - Production

### Required Configuration

**File:** `../secrets/production/config-verso.json`

```json
{
  "VERSO_OPTIM_API_URL": "https://api.verso-optim.com/vrp/v1/solve",
  "VERSO_API_KEY": "your-verso-api-key",
  "CONTEXT_JSON_URL": "https://cdn.jsdelivr.net/.../context.json",
  "JSONLD_BASE": "http://verso-middleware.org"
}
```

**⚠️ Important:**
- Configuration stored in `@secrets` (private repository)
- Mounted as Docker volume in `/app/config.json`
- Never commit to public repository

**📖 Complete guide:** [Deployment](DEPLOYMENT-en.md) | [🇫🇷 Français](DEPLOIEMENT-fr.md)

---

## 💻 4. Develop and Maintain (Developers)

### Architecture

```
┌─────────────┐
│  Platform   │──┐
│     DFC     │  │
└─────────────┘  │ DFC JSON-LD
                 │ (Orders)
┌─────────────┐  │
│  Platform   │──┤
│     DFC     │  │
└─────────────┘  ▼
         ┌───────────────────┐
         │ Verso Middleware  │
         │                   │
         │ 1. DFC → Verso    │
         │ 2. Call API       │──→ Verso API
         │ 3. Verso → DFC    │
         └─────────┬─────────┘
                   │ DFC JSON-LD
                   │ (Routes + Orders)
                   ▼
         ┌─────────────────┐
         │    Platform     │
         │       DFC       │
         └─────────────────┘
```

### Code Structure

```
src/
├── index.js                 # Express server + routes
└── optimizationService.js   # Transformation logic
    ├── transformDFCtoVerso()    # DFC → Verso
    ├── callVersoOptimization()  # API call
    └── transformVersoToDFC()    # Verso → DFC
```

### Local Development

**Using Docker Compose:**

```bash
# 1. Configuration
mkdir -p ../secrets/production
cp config.example.json ../secrets/production/config-verso.json
# Edit with your Verso API key

# 2. Create network (once)
docker network create dfc_shared_network

# 3. Start in development mode (auto-reload)
docker-compose up

# 4. Run tests
docker-compose -f docker-compose-test.yml up

# 5. Test with example data
curl -X POST http://localhost:3001/optim \
  -H "Content-Type: application/json" \
  -d @dataset/orders-DFC.json
```

### Technologies

- **Node.js 20+** - Runtime
- **Express.js** - Web server
- **jsonld.js** - JSON-LD processing
- **node-fetch** - HTTP client (Verso call)
- **Jest** - Tests

### Developer Documentation

| Document | Content |
|----------|---------|
| [Architecture](ARCHITECTURE-en.md) \| [🇫🇷](ARCHITECTURE-fr.md) | Detailed system architecture |
| [Transformations](TRANSFORMATIONS-en.md) \| [🇫🇷](TRANSFORMATIONS-fr.md) | DFC ↔ Verso logic in detail |
| [Development](DEVELOPMENT-en.md) \| [🇫🇷](DEVELOPPEMENT-fr.md) | Complete developer guide |
| [Contributing](CONTRIBUTING-en.md) \| [🇫🇷](CONTRIBUER-fr.md) | How to contribute to the project |

---

## 📚 Complete Documentation

### By Role

| Role | Documents |
|------|-----------|
| 🎯 **User** | [Principle](PRINCIPLE-en.md) · [API](API-en.md) · [Examples](EXAMPLES-en.md) |
| 🚀 **Manager** | [Deployment](DEPLOYMENT-en.md) · [Configuration](DEPLOYMENT-en.md#required-configuration) |
| 💻 **Developer** | [Architecture](ARCHITECTURE-en.md) · [Transformations](TRANSFORMATIONS-en.md) · [Development](DEVELOPMENT-en.md) |

**🇫🇷 French versions available** - Each document has a French version (suffix `-fr.md`)

### Additional Documents

- [Project context](CONTEXT-en.md) | [🇫🇷](CONTEXTE-fr.md) - Objectives and DFC experimentation
- [Changelog](CHANGELOG-en.md) | [🇫🇷](CHANGELOG-fr.md) - Version history
- [Contributing](CONTRIBUTING-en.md) | [🇫🇷](CONTRIBUER-fr.md) - Contribution guide

---

## 🔗 Resources

- **DFC**: [Official website](https://datafoodconsortium.org/) · [Ontology](https://github.com/datafoodconsortium/ontology)
- **Verso**: [Official website](https://verso-optim.com/)
- **Support**: [GitHub Issues](../../../issues)

---

## 📄 License

[To be completed]

