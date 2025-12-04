# Changelog

Version history and changes of the Verso Middleware project.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Upcoming
- Vehicle capacity support
- Multi-vehicle per producer
- JSON Schema validation
- Rate limiting
- API authentication

---

## [1.0.0] - 2024-12-04

### Added
- Express server with security middleware (helmet, cors)
- `/health` endpoint for health check
- `/optim` endpoint for DFC → Verso → DFC optimization
- `/optimWhithVersoReturn` endpoint for debug (returns Verso format)
- DFC → Verso transformation:
  - Order extraction via JSON-LD framing
  - GPS coordinates parsing
  - Time windows parsing
  - Verso vehicles and shipments generation
- Verso API call for VRP optimization
- Verso → DFC transformation:
  - DFC context enrichment with logistics properties
  - Route, Vehicle, Shipment, Step entities creation
  - Routes ↔ orders linking via Verso IDs
  - Result JSON-LD framing
- Jest tests for all transformations
- Docker support:
  - `docker-compose.yml` (dev)
  - `docker-compose-prod.yml` (production)
  - `docker-compose-test.yml` (tests)
- Configuration via `config.json` mounted from `../secrets/production/`
- Example dataset in `dataset/`
- Complete documentation:
  - Restructured README by role
  - Functional guide (PRINCIPLE-en.md)
  - API guide (API-en.md)
  - Practical examples (EXAMPLES-en.md)
  - Deployment guide (DEPLOYMENT-en.md)
  - Detailed architecture (ARCHITECTURE-en.md)
  - Detailed transformations (TRANSFORMATIONS-en.md)
  - Development guide (DEVELOPMENT-en.md)
  - Contribution guide (CONTRIBUTING-en.md)
  - Project context (CONTEXT-en.md)

### Changed
- N/A (first version)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Helmet middleware for HTTP headers security
- GPS coordinates validation (skip if invalid)
- Verso API error handling

---

## Change Format

### Change Types

- **Added** - New features
- **Changed** - Changes in existing features
- **Deprecated** - Features to be removed soon
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes

### Examples

```markdown
### Added
- Support for vehicle capacity constraints (#42)
- New endpoint `/optim/batch` for batch processing (#45)

### Changed
- Improved error messages for invalid coordinates (#40)
- Updated DFC context to latest version (#43)

### Fixed
- Handle missing time windows gracefully (#38)
- Fix crash when OrderLine has no offer (#41)

### Security
- Add rate limiting to prevent abuse (#44)
```

---

## Links

- [GitHub Releases](../../releases)
- [Issues](../../issues)
- [Pull Requests](../../pulls)

