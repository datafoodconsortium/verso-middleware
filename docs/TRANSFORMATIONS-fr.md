# Guide des Transformations de Données

Explication détaillée de la logique de transformation entre DFC et Verso.

---

## Vue d'Ensemble

Le middleware effectue **deux transformations critiques** qui permettent la communication entre le monde DFC et le monde Verso :

```
1️⃣ DFC → Verso : Extraire les besoins logistiques
2️⃣ Verso → DFC : Enrichir avec les routes optimisées
```

**Pourquoi ces transformations sont nécessaires :**
- Les formats de données sont incompatibles
- Les concepts métier sont différents
- Le middleware agit comme un traducteur bidirectionnel

---

## Transformation 1 : DFC → Verso

### Objectif

Convertir des **commandes alimentaires** (ontologie DFC) en **problème de transport** (format Verso VRP).

### Concepts à Mapper

| Concept DFC | Signification | Devient en Verso |
|-------------|---------------|------------------|
| **Order** + **OrderLine** | Une commande client avec des produits | **Shipment** (un envoi à livrer) |
| **RealStock** dans un lieu | Marchandise disponible quelque part | Point **pickup** du shipment |
| **Point de retrait** client | Où le client récupère sa commande | Point **delivery** du shipment |
| **Lieu de stock** | Dépôt/ferme du producteur | Point de départ/retour du **vehicle** |
| **Horaires d'ouverture** | Quand on peut accéder au lieu | **time_windows** (contraintes horaires) |

---

### Chemin de Navigation dans le Graphe DFC

#### Pour trouver le lieu SOURCE (où est la marchandise) :

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

**Référence :** Méthode `transformDFCtoVerso()`, partie extraction source

#### Pour trouver le lieu DESTINATION (où va la commande) :

```
Order
  └─ selects → Order (pickup info)
       └─ pickedUpAt → PhysicalPlace
            └─ hasAddress → Address
                 ├─ latitude ✓
                 └─ longitude ✓
```

**Référence :** Méthode `transformDFCtoVerso()`, partie extraction destination

---

### Extraction des Coordonnées GPS

**Pourquoi c'est critique :**
Verso a besoin de coordonnées précises pour calculer :
- Distances entre points
- Temps de trajet
- Routes optimales

**Validation effectuée :**
1. Présence de `latitude` ET `longitude`
2. Valeurs numériques (pas de string)
3. Dans les plages valides

**Si invalide :**
- L'OrderLine est **ignorée** silencieusement
- Un warning est loggé
- Les autres OrderLines sont traitées normalement

**Référence :** Fonction helper dans `optimizationService.js`

---

### Extraction des Time Windows

**Concept :** Fenêtres horaires pendant lesquelles un lieu est accessible.

**Propriété DFC utilisée :**
```
PhysicalPlace → isOpeningDuring
                  ├─ start (ISO 8601 datetime)
                  └─ end (ISO 8601 datetime)
```

**Transformation :**
1. Parser les dates ISO 8601
2. Convertir en timestamps UNIX (secondes depuis epoch)
3. Former un tableau `[start_timestamp, end_timestamp]`

**Si non fourni :**
- Utilisation de `[null, null]` = aucune contrainte horaire

**Format Verso attendu :**
```
time_windows: [[start, end]] // Tableau de tableaux
```

**Référence :** Fonction `extractTimeWindow()` dans `optimizationService.js`

---

### Construction des Entités Verso

#### Vehicle (Véhicule)

**Règle de création :** Un vehicle par lieu source unique.

**Propriétés générées :**
- `id` : Identifiant séquentiel (1, 2, 3...)
- `start` : Coordonnées du lieu source `[longitude, latitude]`
- `end` : Même coordonnées (retour au dépôt)

**Note :** Le format Verso utilise `[lon, lat]` (longitude en premier).

#### Shipment (Envoi)

**Règle de création :** Un shipment par OrderLine.

**Structure :**
- **pickup** : Point de collecte de la marchandise
  - `id` : Identifiant unique séquentiel
  - `location` : `[longitude, latitude]` du stock
  - `time_windows` : Horaires d'ouverture du lieu stock
  - `service` : Temps de service (1000s par défaut)

- **delivery** : Point de livraison
  - `id` : Identifiant unique séquentiel (différent du pickup)
  - `location` : `[longitude, latitude]` du point de retrait
  - `time_windows` : Horaires d'ouverture du point de retrait
  - `service` : Temps de service (1000s par défaut)

---

### Traçabilité des IDs

**Problème à résoudre :**
Comment retrouver les OrderLines DFC après l'optimisation Verso ?

**Solution :**
Le middleware ajoute temporairement des propriétés aux OrderLines :
- `dfc-b:versoIdPickup` → ID Verso du pickup
- `dfc-b:versoIdDelivery` → ID Verso du delivery

**Utilité :**
Lors de la transformation inverse (Verso → DFC), ces IDs permettent de :
1. Identifier quel Step Verso correspond à quelle OrderLine
2. Créer les Shipments DFC liés aux bonnes commandes
3. Enrichir le graphe correctement

**Référence :** Variables `pickupId` et `deliveryId` dans `transformDFCtoVerso()`

---

### Résultat de la Transformation

**Sortie :**
```javascript
{
  versoNeeds: {
    vehicles: [...],   // Tableau de vehicles
    shipments: [...]   // Tableau de shipments
  },
  dfcNeeds: {
    // Graphe DFC original avec IDs Verso ajoutés
  }
}
```

**Le `versoNeeds` est envoyé à l'API Verso.**
**Le `dfcNeeds` est conservé pour la transformation inverse.**

---

## Transformation 2 : Verso → DFC

### Objectif

Enrichir le graphe DFC original avec les **routes optimisées** retournées par Verso.

### Ce que Verso Retourne

**Structure simplifiée :**
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

**Points clés :**
- Une route par vehicle
- Géométrie encodée (polyline Google)
- Steps avec timestamps et types
- IDs pickup/delivery pour traçabilité

---

### Enrichissement du Contexte DFC

**Problème :** L'ontologie DFC ne contient pas les concepts logistiques.

**Solution :** Extension du contexte JSON-LD.

**Entités ajoutées :**
- `dfc-b:Route` - Itinéraire optimisé complet
- `dfc-b:Vehicle` - Véhicule de livraison
- `dfc-b:Shipment` - Envoi d'une marchandise
- `dfc-b:Step` - Étape d'un itinéraire

**Propriétés ajoutées :**
- `dfc-b:geometry` - Géométrie de la route (string polyline)
- `dfc-b:vehicle`, `dfc-b:steps` - Relations entre entités
- `dfc-b:stepType` - Type d'étape (start, pickup, delivery, end)
- `dfc-b:geo` - Coordonnées GPS `[lon, lat]`
- `dfc-b:arrival` - Timestamp d'arrivée (integer UNIX)
- `dfc-b:duration` - Durée de l'étape en secondes
- Et d'autres...

**Référence :** Début de `transformVersoToDFC()`, construction du contexte enrichi

---

### Flattening du Graphe DFC

**Pourquoi :**
Le graphe DFC original est complexe et imbriqué. Le flatten le transforme en liste plate d'entités, facilitant :
- La recherche d'entités par ID
- La modification d'entités existantes
- L'ajout de nouvelles entités

**Opération JSON-LD :**
```javascript
const flattened = await jsonld.flatten(dfcGraph, context);
```

**Résultat :**
```javascript
{
  '@graph': [
    { '@id': 'order-1', '@type': 'dfc-b:Order', ... },
    { '@id': 'orderline-1', '@type': 'dfc-b:OrderLine', ... },
    ...
  ]
}
```

**Référence :** Bibliothèque `jsonld.js` documentation

---

### Création des Entités Logistiques

#### Vehicle (Véhicule)

**Un vehicle DFC par route Verso.**

**Propriétés :**
- `@id` : URI générée (ex: `http://verso-middleware.org/vehicle-1`)
- `@type` : `dfc-b:Vehicle`
- `dfc-b:ships` : Tableau des shipments transportés

**Référence :** Boucle sur `versoResult.routes` dans `transformVersoToDFC()`

#### Route (Itinéraire)

**Une route DFC par route Verso.**

**Propriétés :**
- `@id` : URI générée
- `@type` : `dfc-b:Route`
- `dfc-b:geometry` : Polyline encodée (copiée de Verso)
- `dfc-b:vehicle` : Référence au vehicle
- `dfc-b:steps` : Tableau ordonné des steps

**Note :** `steps` utilise `@container: @list` pour préserver l'ordre.

#### Step (Étape)

**Un step DFC par step Verso.**

**Propriétés :**
- `@id` : URI générée
- `@type` : `dfc-b:Step`
- `dfc-b:stepType` : Type copié de Verso (start, pickup, delivery, end)
- `dfc-b:geo` : Coordonnées `[longitude, latitude]`
- `dfc-b:arrival` : Timestamp UNIX
- `dfc-b:duration` : Durée en secondes
- `dfc-b:waiting_time` : Temps d'attente (si arrivée avant ouverture)
- `dfc-b:hasRoute` : Référence à la route parente

**Si step de type pickup ou delivery :**
Ajout de la propriété `dfc-b:pickup` ou `dfc-b:delivery` pointant vers le shipment.

#### Shipment (Envoi)

**Un shipment DFC par OrderLine transportée.**

**Création conditionnelle :**
Le shipment est créé lors du premier step (pickup ou delivery) rencontré qui référence l'OrderLine.

**Propriétés :**
- `@id` : URI générée
- `@type` : `dfc-b:Shipment`
- `dfc-b:transports` : Référence à l'OrderLine
- `dfc-b:isChippedIn` : Référence au vehicle
- `dfc-b:startAt` : Référence au step de pickup
- `dfc-b:endAt` : Référence au step de delivery

---

### Liaison Step ↔ OrderLine

**Algorithme :**

1. **Pour chaque step de type pickup ou delivery :**
   - Récupérer l'ID Verso du step (`step.id`)

2. **Chercher l'OrderLine correspondante :**
   - Si pickup : chercher où `dfc-b:versoIdPickup === step.id`
   - Si delivery : chercher où `dfc-b:versoIdDelivery === step.id`

3. **Si OrderLine trouvée :**
   - Créer ou récupérer le Shipment lié
   - Ajouter la référence step → shipment
   - Ajouter la référence shipment → step (startAt ou endAt)

**Résultat :**
Chaque step de pickup/delivery est lié à une OrderLine via un Shipment, permettant de savoir :
- Quelle commande est chargée/déchargée à chaque étape
- Quel véhicule transporte quelle commande
- Quels sont les horaires de chaque opération

**Référence :** Boucle sur `route.steps` dans `transformVersoToDFC()`

---

### Construction du Résultat Final

**Étapes finales :**

1. **Ajout des entités au graphe :**
   - Toutes les entités DFC originales (Orders, OrderLines, etc.)
   - Nouvelles entités (Vehicle, Route, Shipment, Step)

2. **Organisation :**
   - Tri par type d'entité (optionnel, pour lisibilité)

3. **Retour :**
   - Objet JSON-LD avec contexte enrichi et graphe complet

**Structure :**
```javascript
{
  '@context': { /* contexte DFC enrichi */ },
  '@graph': [
    /* Entités originales */,
    /* Nouvelles entités logistiques */
  ]
}
```

---

## Cas Particuliers Gérés

### Coordonnées Manquantes ou Invalides

**Détection :**
Vérification de la présence et validité lors de l'extraction.

**Action :**
- Log d'un warning
- Skip de l'OrderLine concernée
- Continuation du traitement des autres

**Conséquence :**
L'OrderLine n'apparaîtra pas dans l'optimisation, mais le reste du graphe est traité.

---

### Time Windows Absentes

**Détection :**
Propriété `isOpeningDuring` manquante ou invalide.

**Action :**
Utilisation de `[null, null]` = pas de contrainte horaire.

**Conséquence :**
Le lieu peut être visité à n'importe quelle heure selon l'optimisation.

---

### Plusieurs OrderLines par Order

**Comportement :**
Chaque OrderLine est traitée **indépendamment**.

**Conséquence :**
- Un shipment par OrderLine
- Possibilité de livraisons séparées si optimisé ainsi par Verso

**Note :** Ce comportement peut être modifié si besoin de regrouper par Order.

---

### Steps Sans ID (start/end)

**Cas :**
Les steps de type `start` et `end` n'ont pas d'ID Verso.

**Traitement :**
- Création du Step DFC
- Pas de liaison avec Shipment/OrderLine
- Utilité : marquer le début et la fin de la route

---

## Propriétés Par Défaut

| Propriété | Valeur par défaut | Raison |
|-----------|-------------------|--------|
| `service` (Verso) | 1000 secondes | Temps d'arrêt standard (paramétrable) |
| `time_windows` | `[null, null]` | Pas de contrainte si non fourni |
| `waiting_time` | 0 | Calculé par Verso si arrivée précoce |
| `end` (vehicle) | Même que `start` | Retour au dépôt |

**Référence :** Constantes dans `optimizationService.js`

---

## Validation et Qualité des Données

### Ce qui est Validé

**Par le middleware :**
- ✅ Format JSON valide
- ✅ Présence du contexte DFC
- ✅ Coordonnées GPS numériques et dans les plages
- ✅ Structure de graphe JSON-LD basique

**Par Verso (indirectement) :**
- ✅ Cohérence géographique des points
- ✅ Faisabilité des contraintes horaires
- ✅ Format des données envoyées

---

### Ce qui N'est PAS Validé

**Responsabilité de l'application cliente :**
- ⚠️ Cohérence métier des commandes
- ⚠️ Disponibilité des stocks
- ⚠️ Droits d'accès aux données
- ⚠️ Validité des adresses
- ⚠️ Pertinence des horaires

**Important :** Faire ces validations **avant** d'appeler le middleware.

---

## Debugging des Transformations

### Endpoint de Debug

**Route :** `POST /optimWhithVersoReturn`

**Utilité :**
Voir le résultat de la transformation DFC → Verso **sans** appeler Verso ni faire la transformation inverse.

**Retour :**
```javascript
{
  vehicles: [...],
  shipments: [...]
}
```

**Quand l'utiliser :**
- Vérifier que vos coordonnées sont bien extraites
- Voir combien de vehicles/shipments sont générés
- Debugger des problèmes de mapping

---

### Logs Serveur

**Informations loggées :**
- Warnings sur coordonnées invalides
- Erreurs de parsing JSON-LD
- Erreurs API Verso
- Requêtes HTTP (via morgan)

**Où les trouver :**
- Logs Docker : `docker-compose logs -f`
- Logs PM2 : `pm2 logs verso-middleware`
- Console si mode dev

---

### Fichiers d'Exemple

**Dataset complet fourni :**
- `dataset/orders-DFC.json` → Entrée
- `dataset/needs-verso.json` → Après transformation 1
- `dataset/results-verso.json` → Retour Verso
- `dataset/results-DFC.json` → Sortie finale

**Utilisation :**
Comparer vos données avec ces exemples pour identifier les différences.

---

## Optimisations et Améliorations

### Optimisations Possibles

**Performance :**
- Cache du contexte DFC (éviter fetch répété)
- Batch processing des transformations
- Parallélisation du framing JSON-LD

**Qualité :**
- Validation JSON Schema stricte
- Géocodage automatique des adresses
- Détection des doublons (même lieu)

**Fonctionnalités :**
- Support time windows multiples
- Gestion des capacités véhicules
- Prise en compte des volumes/poids

**Référence :** Issues GitHub pour suivre les évolutions

---

## Ressources

### Documentation Technique

- **Code source :** `src/optimizationService.js` (~400 lignes)
- **Tests :** `tests/optimizationService.test.js`
- **Architecture :** [docs/ARCHITECTURE-fr.md](ARCHITECTURE-fr.md)

### Standards

- **JSON-LD Spec :** https://json-ld.org/spec/latest/
- **JSON-LD Framing :** https://json-ld.org/spec/latest/json-ld-framing/
- **DFC Ontology :** https://github.com/datafoodconsortium/ontology

### Support

- **Questions :** [GitHub Discussions](../../discussions)
- **Bugs :** [GitHub Issues](../../issues)
- **Guide développeur :** [docs/DEVELOPPEMENT-fr.md](DEVELOPPEMENT-fr.md)
