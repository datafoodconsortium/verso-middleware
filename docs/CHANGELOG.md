# Changelog

Historique des versions et changements du projet Verso Middleware.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [Unreleased]

### À venir
- Support des capacités véhicules
- Multi-véhicules par producteur
- Validation JSON Schema
- Rate limiting
- Authentification API

---

## [1.0.0] - 2024-12-04

### Added
- Serveur Express avec middleware de sécurité (helmet, cors)
- Endpoint `/health` pour health check
- Endpoint `/optim` pour optimisation DFC → Verso → DFC
- Endpoint `/optimWhithVersoReturn` pour debug (retourne format Verso)
- Transformation DFC → Verso :
  - Extraction des commandes via JSON-LD framing
  - Parsing des coordonnées GPS
  - Parsing des time windows
  - Génération de vehicles et shipments Verso
- Appel API Verso pour optimisation VRP
- Transformation Verso → DFC :
  - Enrichissement du contexte DFC avec propriétés logistiques
  - Création entités Route, Vehicle, Shipment, Step
  - Liaison routes ↔ commandes via IDs Verso
  - JSON-LD framing du résultat
- Tests Jest pour toutes les transformations
- Docker support :
  - `docker-compose.yml` (dev)
  - `docker-compose-prod.yml` (production)
  - `docker-compose-test.yml` (tests)
- Configuration via `.env` ou `config.json`
- Dataset d'exemple dans `dataset/`
- Documentation complète :
  - README restructuré par rôle
  - Guide fonctionnel (PRINCIPE.md)
  - Guide API (API.md)
  - Exemples pratiques (EXEMPLES.md)
  - Guide déploiement (DEPLOIEMENT.md)
  - Architecture détaillée (ARCHITECTURE.md)
  - Transformations détaillées (TRANSFORMATIONS.md)
  - Guide développement (DEVELOPPEMENT.md)
  - Guide contribution (CONTRIBUER.md)
  - Contexte projet (CONTEXTE.md)

### Changed
- N/A (première version)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Helmet middleware pour sécurité headers HTTP
- Validation des coordonnées GPS (skip si invalides)
- Gestion des erreurs API Verso

---

## Format des Changements

### Types de Changements

- **Added** - Nouvelles fonctionnalités
- **Changed** - Changements dans fonctionnalités existantes
- **Deprecated** - Fonctionnalités bientôt supprimées
- **Removed** - Fonctionnalités supprimées
- **Fixed** - Corrections de bugs
- **Security** - Correctifs de sécurité

### Exemples

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

## Liens

- [GitHub Releases](../../releases)
- [Issues](../../issues)
- [Pull Requests](../../pulls)

