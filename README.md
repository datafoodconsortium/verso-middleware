# Verso Middleware - DFC ↔ Verso

Middleware permettant l'optimisation logistique de commandes au format [Data Food Consortium (DFC)](https://datafoodconsortium.org/) via l'API [Verso](https://verso-optim.com/).

---

## 🎯 1. Principe et Usage Fonctionnel

### Qu'est-ce que c'est ?

Un service qui transforme des **commandes DFC** en **routes optimisées** :

```
Commandes DFC (JSON-LD)  →  Middleware Verso  →  Routes optimisées DFC (JSON-LD)
                                    ↓
                            API Verso (optimisation)
```

### À quoi ça sert ?

**3 cas d'usage principaux :**

1. ✅ **Multi-plateformes** - Un producteur optimise ses livraisons pour des commandes provenant de plusieurs plateformes
2. ✅ **Multi-producteurs** - Un logisticien mutualise les livraisons de plusieurs producteurs
3. ✅ **Multi-plateformes + Multi-producteurs** - Optimisation globale

### Comment ça marche ?

1. Vous envoyez vos **commandes au format DFC** (avec adresses et horaires)
2. Le middleware les transforme pour l'API Verso
3. Verso calcule les **routes optimisées**
4. Le middleware renvoie le résultat **au format DFC enrichi** (routes, véhicules, étapes)

**📖 Plus de détails :** [Comprendre le fonctionnement](docs/PRINCIPE.md)

---

## 🔌 2. Utiliser l'API (Consommateurs)

### Démarrage Rapide

```bash
# Santé du service
curl http://localhost:3001/health

# Optimiser des routes
curl -X POST http://localhost:3001/optim \
  -H "Content-Type: application/json" \
  -d @mes-commandes-dfc.json
```

### Endpoints Disponibles

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/health` | GET | Vérifier que le service fonctionne |
| `/optim` | POST | Optimiser des commandes (entrée et sortie DFC) |

### Format des Données

**Entrée :** Graphe JSON-LD DFC contenant des `Order` avec :
- Adresses (latitude/longitude)
- Horaires d'ouverture
- Produits et stocks

**Sortie :** Graphe JSON-LD DFC enrichi avec :
- `Route` - Itinéraires optimisés
- `Vehicle` - Véhicules
- `Shipment` - Envois/livraisons
- `Step` - Étapes de chaque route

**📖 Documentation complète :** [Guide API](docs/API.md)

**📦 Exemples de données :** [Exemples](docs/EXEMPLES.md)

---

## 🚀 3. Déployer le Service (Gestionnaires)

### Installation avec Docker

**⚠️ Méthode recommandée et requise**

```bash
# 1. Créer la configuration
mkdir -p ../secrets/production
cp config.example.json ../secrets/production/config-verso.json
# Éditer config-verso.json avec votre clé API Verso

# 2. Créer le réseau Docker
docker network create dfc_shared_network

# 3. Démarrer en production
docker-compose -f docker-compose-prod.yml up -d

# 4. Vérifier
curl http://localhost:3001/health
```

**Environnements disponibles :**
- `docker-compose.yml` - Développement (auto-reload)
- `docker-compose-test.yml` - Tests
- `docker-compose-prod.yml` - Production

### Configuration Requise

```json
{
  "VERSO_OPTIM_API_URL": "https://api.verso-optim.com/vrp/v1/solve",
  "VERSO_API_KEY": "votre-clé-api-verso",
  "CONTEXT_JSON_URL": "https://cdn.jsdelivr.net/.../context.json",
  "JSONLD_BASE": "http://verso-middleware.org"
}
```

**📖 Guide complet de déploiement :** [Déploiement](docs/DEPLOIEMENT.md)

---

## 💻 4. Développer et Maintenir (Développeurs)

### Architecture

```
┌─────────────┐
│ Plateforme  │──┐
│    DFC      │  │
└─────────────┘  │ DFC JSON-LD
                 │ (Orders)
┌─────────────┐  │
│ Plateforme  │──┤
│    DFC      │  │
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
         │   Plateforme    │
         │      DFC        │
         └─────────────────┘
```

### Structure du Code

```
src/
├── index.js                 # Serveur Express + routes
└── optimizationService.js   # Logique de transformation
    ├── transformDFCtoVerso()    # DFC → Verso
    ├── callVersoOptimization()  # Appel API
    └── transformVersoToDFC()    # Verso → DFC
```

### Développement Local

**Utiliser Docker Compose :**

```bash
# 1. Configuration
mkdir -p ../secrets/production
cp config.example.json ../secrets/production/config-verso.json
# Éditer avec votre clé API Verso

# 2. Créer le réseau (une seule fois)
docker network create dfc_shared_network

# 3. Démarrer en mode développement (auto-reload)
docker-compose up

# 4. Lancer les tests
docker-compose -f docker-compose-test.yml up

# 5. Tester avec des données d'exemple
curl -X POST http://localhost:3001/optim \
  -H "Content-Type: application/json" \
  -d @dataset/orders-DFC.json
```

### Technologies

- **Node.js 20+** - Runtime
- **Express.js** - Serveur web
- **jsonld.js** - Traitement JSON-LD
- **node-fetch** - Client HTTP (appel Verso)
- **Jest** - Tests

### Documentation Développeurs

| Document | Contenu |
|----------|---------|
| [Architecture](docs/ARCHITECTURE.md) | Architecture détaillée du système |
| [Transformations](docs/TRANSFORMATIONS.md) | Logique DFC ↔ Verso en détail |
| [Développement](docs/DEVELOPPEMENT.md) | Guide complet pour développeurs |
| [Contribuer](docs/CONTRIBUER.md) | Comment contribuer au projet |

---

## 📚 Documentation Complète

### Par Rôle

| Rôle | Documents |
|------|-----------|
| 🎯 **Utilisateur** | [Principe](docs/PRINCIPE.md) · [API](docs/API.md) · [Exemples](docs/EXEMPLES.md) |
| 🚀 **Gestionnaire** | [Déploiement](docs/DEPLOIEMENT.md) · [Configuration](docs/DEPLOIEMENT.md#configuration) |
| 💻 **Développeur** | [Architecture](docs/ARCHITECTURE.md) · [Transformations](docs/TRANSFORMATIONS.md) · [Développement](docs/DEVELOPPEMENT.md) |

### Documents Complémentaires

- [Contexte du projet (FR)](docs/CONTEXTE.md) - Objectifs et expérimentation DFC
- [Changelog](docs/CHANGELOG.md) - Historique des versions
- [Contribuer](docs/CONTRIBUER.md) - Guide de contribution

---

## 🔗 Ressources

- **DFC** : [Site officiel](https://datafoodconsortium.org/) · [Ontologie](https://github.com/datafoodconsortium/ontology)
- **Verso** : [Site officiel](https://verso-optim.com/)
- **Support** : [Issues GitHub](../../issues)

---

## 📄 Licence

[À compléter]
