# Architecture Technique

Vue d'ensemble de l'architecture du Verso Middleware et de ses composants.

---

## Vue Globale

### Rôle du Middleware

Le middleware agit comme un **traducteur et orchestrateur** entre deux mondes :

**Monde DFC (Data Food Consortium) :**
- Protocole standardisé pour l'agroalimentaire
- Format JSON-LD (données liées)
- Ontologie métier (commandes, produits, lieux)

**Monde Verso :**
- API d'optimisation logistique spécialisée
- Format JSON propriétaire
- Focus sur le VRP (Vehicle Routing Problem)

**Le middleware permet :**
- Aux plateformes DFC de bénéficier d'optimisation Verso sans le connaître
- À Verso de traiter des données sans gérer le protocole DFC
- L'enrichissement des données métier avec de la logistique

---

## Schéma d'Architecture

```
┌─────────────────────────────────────────────────────────┐
│          PLATEFORMES DFC (clients)                      │
│   - Open Food Network                                   │
│   - Cagette                                             │
│   - Autres plateformes compatibles DFC                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP POST /optim
                 │ Content-Type: application/json
                 │ Body: JSON-LD (Orders DFC)
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│             VERSO MIDDLEWARE                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Serveur Express (src/index.js)                 │   │
│  │  - Gestion des requêtes HTTP                    │   │
│  │  - Sécurité (helmet, cors)                      │   │
│  │  - Logging (morgan)                             │   │
│  │  - Routes : /health, /optim                     │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                   │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │  Service d'Optimisation                         │   │
│  │  (src/optimizationService.js)                   │   │
│  │                                                  │   │
│  │  Phase 1: Transformation DFC → Verso            │   │
│  │   - JSON-LD framing (extraction Orders)         │   │
│  │   - Extraction coordonnées GPS                  │   │
│  │   - Extraction time windows                     │   │
│  │   - Construction vehicles & shipments           │   │
│  │                                                  │   │
│  │  Phase 2: Appel API Verso                       │   │
│  │   - HTTP POST avec authentification             │   │
│  │   - Gestion erreurs et timeouts                 │   │
│  │                                                  │   │
│  │  Phase 3: Transformation Verso → DFC            │   │
│  │   - Enrichissement contexte DFC                 │   │
│  │   - Création entités logistiques                │   │
│  │   - Liaison avec commandes originales           │   │
│  │   - JSON-LD framing résultat                    │   │
│  └──────────────────┬──────────────────────────────┘   │
└────────────────────┼──────────────────────────────────┘
                     │
                     │ HTTP POST
                     │ Content-Type: application/json
                     │ Body: JSON (format Verso)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API VERSO                                  │
│   - Moteur d'optimisation VRP                           │
│   - Calcul de routes optimales                          │
│   - Retour: routes avec géométries                      │
└─────────────────────────────────────────────────────────┘
```

---

## Composants Détaillés

### 1. Serveur Express (src/index.js)

**Responsabilités :**
- Point d'entrée HTTP
- Orchestration des requêtes
- Gestion des erreurs globales
- Sécurité de base

**Middleware utilisés :**

| Middleware | Rôle |
|-----------|------|
| `helmet` | Protection headers HTTP (XSS, clickjacking, etc.) |
| `cors` | Gestion des requêtes cross-origin |
| `morgan` | Logging des requêtes (format combiné) |
| `express.json()` | Parsing du body JSON (limite 10MB) |

**Routes exposées :**

| Route | Méthode | Handler | Rôle |
|-------|---------|---------|------|
| `/health` | GET | Direct | Santé du service |
| `/optim` | POST | `OptimizationService` | Optimisation complète |
| `/optimWhithVersoReturn` | POST | `OptimizationService` | Debug transformation |

**Référence fichier :** `src/index.js` (~100 lignes)

---

### 2. Service d'Optimisation (src/optimizationService.js)

**Responsabilités :**
- Logique métier de transformation
- Appel à l'API Verso
- Gestion des données JSON-LD

**Classe :** `OptimizationService`

**Méthodes principales :**

#### `transformDFCtoVerso(dfcGraph)`

**Rôle :** Convertir un graphe DFC en format Verso

**Entrée :** Objet JSON-LD DFC
**Sortie :** `{ versoNeeds, dfcNeeds }`

**Étapes :**
1. Validation du graphe
2. JSON-LD framing pour extraire les Orders
3. Boucle sur chaque Order/OrderLine
4. Extraction coordonnées source (stock) et destination (pickup)
5. Extraction time windows
6. Création vehicles Verso (un par source)
7. Création shipments Verso (pickup + delivery)
8. Ajout d'IDs Verso aux OrderLines (traçabilité)

**Référence :** ~150 lignes dans `optimizationService.js`

---

#### `callVersoOptimization(versoNeeds)`

**Rôle :** Appeler l'API Verso et récupérer les routes

**Entrée :** Objet Verso `{ vehicles, shipments }`
**Sortie :** Résultat Verso `{ routes }`

**Étapes :**
1. Récupération de l'URL et clé API (config)
2. HTTP POST vers Verso
3. Headers : Content-Type + Authorization Bearer
4. Gestion des erreurs HTTP
5. Parsing de la réponse JSON

**Référence :** ~30 lignes dans `optimizationService.js`

---

#### `transformVersoToDFC(versoResult, dfcNeeds)`

**Rôle :** Enrichir le graphe DFC avec les routes Verso

**Entrée :** Résultat Verso + Graphe DFC original
**Sortie :** Graphe DFC enrichi

**Étapes :**
1. Chargement et enrichissement du contexte DFC
2. Flattening du graphe DFC (accès facilité)
3. Boucle sur chaque route Verso :
   - Création entité Vehicle DFC
   - Création entité Route DFC (avec géométrie)
   - Boucle sur chaque step :
     - Création entité Step DFC
     - Si pickup/delivery : création Shipment et liaison avec OrderLine
4. Retour du graphe enrichi

**Référence :** ~200 lignes dans `optimizationService.js`

---

### 3. Configuration (config.js)

**Rôle :** Centraliser la configuration

**Sources de configuration :**
1. Fichier `config.json` (prioritaire)
2. Variables d'environnement (fallback)
3. Valeurs par défaut

**Paramètres gérés :**
- `VERSO_OPTIM_API_URL` - URL API Verso
- `VERSO_API_KEY` - Clé d'authentification
- `CONTEXT_JSON_URL` - URL du contexte DFC
- `JSONLD_BASE` - Base URI pour les identifiants

**Référence :** Fichier `config.example.json`

---

## Flux de Données Détaillé

### Phase 1 : Réception et Validation

```
Requête HTTP → Express → Parsing JSON → Validation basique
                             ↓
                   Graphe DFC (objet JavaScript)
```

**Validations :**
- JSON bien formé
- Présence de `@context`
- Type d'objet (object, pas array à la racine)

---

### Phase 2 : Transformation DFC → Verso

```
Graphe DFC → JSON-LD Framing → Orders extraits
              ↓
         Boucle OrderLines
              ↓
    Extraction coordonnées GPS
              ↓
    Extraction time windows
              ↓
    Construction Verso
    {vehicles: [...], shipments: [...]}
```

**Points clés :**
- Un `vehicle` Verso par lieu source (stock)
- Un `shipment` Verso par OrderLine
- Ajout d'IDs Verso aux OrderLines pour traçabilité

---

### Phase 3 : Optimisation Verso

```
Données Verso → HTTP POST → API Verso → Routes optimisées
                              ↓
                      Gestion erreurs
                              ↓
                     Résultat JSON Verso
                     {routes: [...]}
```

**Points d'attention :**
- Authentification via Bearer token
- Timeout potentiel (dépend de la complexité)
- Erreurs HTTP à gérer (400, 401, 500, etc.)

---

### Phase 4 : Transformation Verso → DFC

```
Routes Verso + Graphe DFC original
              ↓
    Enrichissement contexte DFC
              ↓
    Flattening du graphe
              ↓
    Boucle sur les routes
              ↓
Création Vehicle, Route, Shipment, Step
              ↓
   Liaison avec OrderLines
              ↓
   Graphe DFC enrichi final
```

**Mapping des entités :**
- Route Verso → Route DFC + Vehicle DFC
- Step Verso → Step DFC
- Association step ↔ OrderLine via IDs Verso
- Création Shipment pour lier OrderLine et Route

---

## Technologies et Dépendances

### Stack Technique

**Runtime :**
- **Node.js 20+** - JavaScript côté serveur
- **ES6+** - Syntaxe moderne (async/await, arrow functions, etc.)

**Framework Web :**
- **Express.js 4.18** - Serveur HTTP et routing

**Traitement Données :**
- **jsonld 8.3** - Manipulation JSON-LD (framing, flattening, expansion)
- **node-fetch 2.7** - Client HTTP pour appel Verso

**Sécurité et Utilitaires :**
- **helmet 7.1** - Sécurisation headers HTTP
- **cors 2.8** - Configuration CORS
- **morgan 1.10** - Logging requêtes
- **dotenv 16.4** - Gestion variables d'environnement

**Tests :**
- **Jest 29.7** - Framework de tests unitaires

**Développement :**
- **Nodemon 3.0** - Auto-reload en mode dev

**Référence :** Fichier `package.json`

---

## Gestion des Données

### JSON-LD et Ontologie DFC

**Pourquoi JSON-LD :**
- Standard W3C pour les données liées
- Permet d'intégrer plusieurs sources de données
- Contexte partagé (ontologie DFC)
- Framing pour requêter le graphe

**Opérations JSON-LD utilisées :**

| Opération | Rôle | Utilisée dans |
|-----------|------|---------------|
| **Frame** | Extraire des entités spécifiques | `transformDFCtoVerso()` |
| **Flatten** | Aplatir le graphe pour accès facile | `transformVersoToDFC()` |
| **Context** | Définir le vocabulaire et types | Toutes les transformations |

**Référence :** Bibliothèque `jsonld.js`

---

### Extension de l'Ontologie DFC

**Problème :** L'ontologie DFC standard ne contient pas de concepts logistiques.

**Solution :** Le middleware ajoute des propriétés custom au contexte :

**Entités ajoutées :**
- `dfc-b:Route` - Itinéraire optimisé
- `dfc-b:Vehicle` - Véhicule
- `dfc-b:Shipment` - Envoi
- `dfc-b:Step` - Étape d'itinéraire

**Propriétés ajoutées :**
- `dfc-b:geometry` - Géométrie (polyline)
- `dfc-b:vehicle`, `dfc-b:steps` - Relations
- `dfc-b:stepType`, `dfc-b:geo`, `dfc-b:arrival` - Données d'étape
- `dfc-b:versoIdPickup`, `dfc-b:versoIdDelivery` - IDs traçabilité

**Référence :** Méthode `transformVersoToDFC()` pour le contexte enrichi

---

## Performances et Scalabilité

### Temps de Traitement

**Décomposition typique (10 commandes) :**

| Phase | Temps | % |
|-------|-------|---|
| Parsing et framing DFC | ~100ms | 3% |
| Transformation DFC → Verso | ~50ms | 2% |
| Appel API Verso | ~3000ms | 90% |
| Transformation Verso → DFC | ~150ms | 5% |
| **Total** | **~3300ms** | **100%** |

**Observation :** L'API Verso représente 90% du temps, le middleware est rapide.

---

### Facteurs de Performance

**Côté Middleware :**
- Taille du graphe DFC (nombre d'entités)
- Complexité du framing/flattening JSON-LD
- Ressources serveur (CPU, RAM)

**Côté Verso :**
- Nombre de points à optimiser
- Dispersion géographique
- Contraintes horaires
- Charge de l'API Verso

---

### Optimisations Possibles

**Court terme :**
- Cache du contexte DFC (éviter le téléchargement à chaque requête)
- Validation précoce des données (fail fast)
- Compression des réponses

**Moyen terme :**
- Queue système pour requêtes asynchrones
- Cache des optimisations récentes (si commandes identiques)
- Pool de connexions HTTP

**Long terme :**
- Scalabilité horizontale (plusieurs instances)
- Load balancing
- Optimisation incrémentale (réutilisation résultats précédents)

**Référence :** Section "Évolutions" dans [docs/CONTEXTE-fr.md](CONTEXTE-fr.md)

---

## Sécurité

### Mesures Implémentées

**Protection Headers (Helmet) :**
- Protection XSS
- Prévention clickjacking
- HSTS (si HTTPS)
- Content Security Policy

**Validation Données :**
- Vérification coordonnées GPS
- Gestion erreurs gracieuse
- Pas d'injection possible (JSON-LD typé)

---

### Points d'Attention

**Non implémenté actuellement :**
- ⚠️ Authentification (pas de vérification d'identité)
- ⚠️ Rate limiting (pas de limitation d'usage)
- ⚠️ Validation schema JSON (validation minimale)
- ⚠️ Audit logging (logs basiques uniquement)

**Recommandations production :**
- Ajouter authentification (JWT, API key)
- Configurer rate limiting (express-rate-limit)
- Restreindre CORS aux domaines autorisés
- Logger les accès pour audit

**Référence :** Section Sécurité dans [docs/DEPLOIEMENT-fr.md](DEPLOIEMENT-fr.md)

---

## Tests

### Architecture des Tests

**Fichier :** `tests/optimizationService.test.js`

**Framework :** Jest

**Couverture :**
- Transformation DFC → Verso
- Appel API Verso (mocked)
- Transformation Verso → DFC

**Stratégie :**
- Tests unitaires sur `OptimizationService`
- Mocking de l'API Verso
- Utilisation de données d'exemple réelles

**Référence :** Commande `yarn test` pour exécution

---

## Évolution de l'Architecture

### Limitations Actuelles

**Design :**
- Architecture synchrone (pas d'async jobs)
- Pas de persistence (stateless complet)
- Un seul point d'optimisation (pas de distribution)

**Scalabilité :**
- Instance unique
- Pas de cache
- Pas de queue

---

### Architecture Future Possible

**Évolution vers microservices :**

```
API Gateway → Auth Service
              ↓
      Verso Middleware (plusieurs instances)
              ↓
      Queue (RabbitMQ/Kafka)
              ↓
      Workers d'optimisation
              ↓
      Cache (Redis) + Database
```

**Bénéfices :**
- Scalabilité horizontale
- Résilience (retry, fallback)
- Monitoring granulaire
- Optimisation asynchrone

**Référence :** Discussion dans [docs/CONTEXTE-fr.md](CONTEXTE-fr.md)

---

## Ressources

### Documentation Technique

- **Code source :** Dossier `src/`
- **Tests :** Dossier `tests/`
- **Transformations détaillées :** [docs/TRANSFORMATIONS-fr.md](TRANSFORMATIONS-fr.md)

### Standards et Spécifications

- **JSON-LD :** https://json-ld.org/
- **DFC Ontology :** https://github.com/datafoodconsortium/ontology
- **Express.js :** https://expressjs.com/
- **Node.js :** https://nodejs.org/

### Support

- **Issues :** [GitHub Issues](../../issues)
- **Développement :** [docs/DEVELOPPEMENT-fr.md](DEVELOPPEMENT-fr.md)
