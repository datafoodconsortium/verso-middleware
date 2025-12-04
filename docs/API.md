# Guide API - Consommateurs

Documentation pour utiliser l'API du Verso Middleware.

---

## Configuration de Base

### URL du Service

Le middleware expose une API REST sur le port 3001 par défaut :
- **Développement :** `http://localhost:3001`
- **Production :** URL configurée par votre administrateur

### Format de Communication

Toutes les communications utilisent **JSON-LD** conformément au standard DFC :
- Content-Type : `application/json`
- Format : JSON-LD avec contexte DFC
- Méthode : HTTP POST pour l'optimisation

---

## Endpoints Disponibles

### 1. Vérification de Santé

**Route :** `GET /health`

**Utilité :** Vérifier que le service est actif et répond correctement.

**Réponse attendue :** Code 200 avec statut "OK"

**Quand l'utiliser :**
- Avant d'envoyer une demande d'optimisation
- Dans vos systèmes de monitoring
- Pour débugger des problèmes de connectivité

---

### 2. Optimisation de Routes

**Route :** `POST /optim`

**Utilité :** Envoyer des commandes DFC et recevoir des routes optimisées au format DFC.

**Flux :**
1. Vous envoyez un graphe JSON-LD DFC contenant vos commandes
2. Le middleware transforme vos données pour Verso
3. Verso calcule les routes optimales
4. Le middleware enrichit votre graphe DFC avec les routes
5. Vous recevez le graphe enrichi

**Ce que vous envoyez :**
- Graphe DFC avec entités `Order` et `OrderLine`
- Adresses avec coordonnées GPS (obligatoire)
- Horaires d'ouverture (optionnel)

**Ce que vous recevez :**
- Tout votre graphe original
- Nouvelles entités `Route` avec itinéraires optimisés
- Entités `Vehicle`, `Shipment`, `Step` liées à vos commandes
- Géométrie des routes (polylines)
- Horaires d'arrivée estimés

---

### 3. Debug de Transformation

**Route :** `POST /optimWhithVersoReturn`

**Utilité :** Voir comment vos données DFC sont transformées au format Verso, sans recevoir de résultat DFC.

**Quand l'utiliser :**
- Débugger des problèmes de transformation
- Comprendre comment le middleware interprète vos données
- Vérifier que les coordonnées sont correctement extraites

⚠️ **Attention :** Cet endpoint retourne du JSON Verso (pas DFC), il est destiné au débogage uniquement.

---

## Données Requises

### Données Obligatoires

Pour que l'optimisation fonctionne, votre graphe DFC **doit** contenir :

#### 1. Adresses avec Coordonnées GPS

**Pourquoi :** Verso a besoin des coordonnées exactes pour calculer les distances et temps de trajet.

**Où les fournir :**
- Adresse du lieu de stockage (où est la marchandise)
- Adresse du point de retrait/livraison (où va la commande)

**Format requis :**
- `dfc-b:latitude` : Nombre décimal (-90 à 90)
- `dfc-b:longitude` : Nombre décimal (-180 à 180)

**⚠️ Si manquant :** L'OrderLine sera ignorée avec un warning dans les logs.

#### 2. Structure de Commande Complète

**Chemin requis dans le graphe :**
```
Order → OrderLine → Offer → RealStock → PhysicalPlace (avec Address)
      → selects → Order → pickedUpAt → PhysicalPlace (avec Address)
```

**Référence :** Voir les fichiers d'exemple dans `dataset/orders-DFC.json`

### Données Optionnelles

#### Horaires d'Ouverture (Time Windows)

**Utilité :** Contraindre les heures de passage (ex: ouvert 8h-18h).

**Propriété DFC :** `dfc-b:isOpeningDuring` avec `start` et `end`

**Si non fourni :** Aucune contrainte horaire appliquée.

**Référence :** Voir `optimizationService.js` → fonction `extractTimeWindow()`

---

## Comprendre les Résultats

### Structure du Résultat

Vous recevez votre graphe DFC **enrichi** avec de nouvelles entités logistiques :

#### Entités Ajoutées

| Entité | Rôle | Relation avec vos données |
|--------|------|---------------------------|
| **Route** | Itinéraire optimisé complet | Une route par véhicule |
| **Vehicle** | Véhicule de livraison | Créé automatiquement par source |
| **Shipment** | Envoi d'une marchandise | Lie votre OrderLine à une Route |
| **Step** | Étape d'un itinéraire | Chaque arrêt avec horaire et durée |

#### Géométrie des Routes

**Propriété :** `dfc-b:geometry`

**Format :** Polyline encodée (format Google)

**Utilité :** Afficher l'itinéraire sur une carte (Leaflet, Google Maps, etc.)

**Décodage :** Utiliser une bibliothèque comme `@mapbox/polyline` (JavaScript) ou `polyline` (Python)

#### Horaires et Durées

**Pour chaque Step :**
- `dfc-b:arrival` : Timestamp UNIX de l'heure d'arrivée
- `dfc-b:duration` : Durée de l'étape en secondes
- `dfc-b:waiting_time` : Temps d'attente avant l'horaire d'ouverture

**Calculs possibles :**
- Heure de fin d'étape = arrival + duration
- Durée totale de la route = somme des durées
- Horaire estimé pour informer vos clients

---

## Validation des Données

### Ce que le Middleware Vérifie

#### Coordonnées GPS

**Validation :**
- Présence de latitude ET longitude
- Valeurs numériques valides
- Dans les plages correctes (-90/90, -180/180)

**Si invalide :** L'OrderLine est **ignorée silencieusement** avec un warning dans les logs serveur.

#### Format JSON-LD

**Validation :**
- Présence du `@context`
- Structure de graphe avec `@graph` ou objets directs
- Types DFC reconnus (`dfc-b:Order`, etc.)

**Si invalide :** Erreur 400 ou 500 selon le type d'erreur.

### Ce que le Middleware NE Vérifie PAS

⚠️ Le middleware ne valide pas :
- La cohérence métier de vos commandes
- Les quantités ou stocks disponibles
- Les droits d'accès ou permissions
- La validité des dates/horaires futurs

Ces validations doivent être faites **dans votre plateforme** avant l'appel au middleware.

---

## Gestion des Erreurs

### Types d'Erreurs

#### Erreur 400 - Données Invalides

**Causes possibles :**
- JSON mal formé
- Contexte DFC manquant ou invalide
- Structure de graphe incorrecte

**Solution :** Vérifier le format de vos données avec les exemples dans `dataset/`

#### Erreur 500 - Erreur Serveur

**Causes possibles :**
- Erreur API Verso (clé invalide, service indisponible)
- Toutes les coordonnées de votre graphe sont invalides
- Erreur interne de transformation

**Solution :** 
- Vérifier les logs serveur
- Contacter l'administrateur si le problème persiste

#### Timeout

**Cause :** L'optimisation prend trop de temps (graphe très complexe)

**Délai recommandé :** Minimum 60 secondes pour les requêtes

**Solution :** Réduire le nombre de commandes ou contacter l'administrateur

---

## Performances et Limites

### Temps de Traitement Typiques

| Nombre de Commandes | Temps Estimé |
|---------------------|--------------|
| 1-10 commandes | 2-5 secondes |
| 10-50 commandes | 5-15 secondes |
| 50-100 commandes | 15-60 secondes |

**Variables influençant le temps :**
- Complexité géographique (dispersion des points)
- Contraintes horaires
- Charge du serveur Verso

### Limites Techniques

**Taille maximale de requête :** 10 MB

**Limites actuelles non configurables :**
- Service time fixe (1000 secondes)
- Un véhicule par lieu source
- Pas de limite de capacité véhicule

**Référence :** Ces limites sont définies dans `src/optimizationService.js`

---

## Intégration dans Votre Application

### Étapes d'Intégration

#### 1. Récupération des Données DFC

Rassemblez vos commandes au format DFC depuis :
- Votre plateforme locale
- D'autres plateformes DFC (via API)
- Un système de fédération DFC

#### 2. Validation Préalable

Avant d'envoyer au middleware :
- ✅ Vérifier que toutes les adresses ont des coordonnées
- ✅ Valider la structure du graphe JSON-LD
- ✅ S'assurer que les commandes sont prêtes à être livrées

#### 3. Appel au Middleware

Configurer votre client HTTP :
- URL du middleware
- Timeout suffisant (60s+)
- Gestion des erreurs réseau

#### 4. Exploitation des Résultats

Avec le graphe enrichi reçu :
- Afficher les routes sur une carte
- Informer les clients des horaires estimés
- Générer des feuilles de route pour les livreurs
- Archiver l'optimisation pour analyse

### Considérations Techniques

**Format des Identifiants :**
- Les IDs des nouvelles entités sont générés par le middleware
- Format : `http://verso-middleware.org/vehicle-1`, etc.
- Ces IDs sont stables pour une requête donnée

**Gestion du Cache :**
- Pas de cache côté middleware actuellement
- Les mêmes données renvoient des routes potentiellement différentes (optimisation peut varier)

**Idempotence :**
- L'API n'est **pas idempotente** : deux appels identiques peuvent donner des résultats légèrement différents

---

## Tests et Validation

### Tester Votre Intégration

#### Phase 1 : Health Check

Vérifiez que vous pouvez joindre le service.

#### Phase 2 : Données d'Exemple

Testez avec les fichiers fournis dans `dataset/orders-DFC.json` pour valider que votre client fonctionne.

#### Phase 3 : Vos Données Réelles

Commencez avec un petit sous-ensemble (2-3 commandes) avant de monter en charge.

### Debugging

#### Problème : Aucune Route Retournée

**Causes :**
- Toutes les coordonnées sont invalides
- Structure DFC incorrecte

**Debug :** Utiliser `/optimWhithVersoReturn` pour voir la transformation Verso

#### Problème : Routes Incohérentes

**Causes :**
- Coordonnées GPS incorrectes (inversées lat/lon ?)
- Horaires d'ouverture trop restrictifs

**Solution :** Vérifier vos données sources

---

## Sécurité et Bonnes Pratiques

### Données Sensibles

⚠️ **Attention :**
- Actuellement pas d'authentification
- Toutes les données envoyées transitent en clair (HTTPS recommandé)
- Les données sont envoyées à l'API Verso tierce

**Recommandations :**
- Ne pas envoyer de données personnelles non nécessaires
- Utiliser HTTPS en production
- Vérifier les conditions d'utilisation de Verso

### Rate Limiting

⚠️ **Actuellement non implémenté**

En production, un rate limiting devrait être configuré :
- Pour éviter la surcharge du service
- Pour contrôler les coûts API Verso

**Référence :** Voir [docs/DEPLOIEMENT.md](DEPLOIEMENT.md) pour la configuration recommandée

---

## Ressources Complémentaires

### Documentation Technique

- **Format DFC détaillé :** [Business API DFC](https://github.com/datafoodconsortium/business-api)
- **Exemples de données :** Dossier `dataset/` du projet
- **Transformations :** [docs/TRANSFORMATIONS.md](TRANSFORMATIONS.md)

### Support

- **Questions générales :** [GitHub Discussions](../../discussions)
- **Bugs et problèmes :** [GitHub Issues](../../issues)
- **Guide de déploiement :** [docs/DEPLOIEMENT.md](DEPLOIEMENT.md)
