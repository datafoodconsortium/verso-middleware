# Principe et Usage Fonctionnel

## Vue d'ensemble

Le **Verso Middleware** est un pont entre :
- Le **protocole DFC** (Data Food Consortium) utilisé par les plateformes alimentaires
- L'**API Verso** spécialisée dans l'optimisation logistique (VRP - Vehicle Routing Problem)

## Problématique

### Sans le Middleware

Chaque plateforme devrait :
1. Apprendre l'API Verso (format propriétaire)
2. Implémenter les transformations DFC ↔ Verso
3. Gérer la complexité du mapping de données
4. Maintenir le code de transformation

### Avec le Middleware

Les plateformes :
1. Envoient leurs commandes au **format DFC standard**
2. Reçoivent les routes optimisées au **format DFC standard**
3. Aucune connaissance de Verso requise

## Flux de Données

```
┌──────────────────────────────────────────────────────────┐
│                   PLATEFORME DFC                         │
│                                                          │
│  Commandes :                                             │
│   - Order 1 : Producteur A → Client 1                   │
│   - Order 2 : Producteur B → Client 1                   │
│   - Order 3 : Producteur A → Client 2                   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ POST /optim
                     │ DFC JSON-LD (Orders)
                     ▼
┌──────────────────────────────────────────────────────────┐
│              VERSO MIDDLEWARE                            │
│                                                          │
│  Étape 1: Parse DFC                                      │
│   → Extraction des adresses (lat/lon)                    │
│   → Extraction des horaires                              │
│   → Création de la structure Verso                       │
│                                                          │
│  Étape 2: Optimisation                                   │
│   → Appel API Verso avec vehicles + shipments           │
│   → Réception des routes optimisées                      │
│                                                          │
│  Étape 3: Reconstruction DFC                             │
│   → Création des Route, Vehicle, Shipment, Step         │
│   → Liaison avec les Orders originales                   │
│   → Enrichissement du graphe DFC                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Response 200 OK
                     │ DFC JSON-LD (Routes + Orders)
                     ▼
┌──────────────────────────────────────────────────────────┐
│                   PLATEFORME DFC                         │
│                                                          │
│  Résultat :                                              │
│   - Route 1 : Producteur A → Client 1 → Client 2        │
│   - Route 2 : Producteur B → Client 1                   │
│   - Géométrie des routes (polylines)                    │
│   - Horaires d'arrivée estimés                           │
└──────────────────────────────────────────────────────────┘
```

## Cas d'Usage Validés

### 1. Optimisation Multi-Plateformes

**Scénario :** Un producteur a des commandes sur Open Food Network ET sur Cagette.

**Solution :** Le producteur récupère toutes ses commandes (protocole DFC), les envoie au middleware, et obtient une route optimisée unique.

**Bénéfice :** Économie de temps et de carburant.

### 2. Optimisation Multi-Producteurs

**Scénario :** Un logisticien livre pour plusieurs producteurs.

**Solution :** Le logisticien accède aux commandes de ses producteurs, envoie l'ensemble au middleware, et obtient des routes mutualisées.

**Bénéfice :** Mutualisation des coûts logistiques.

### 3. Combinaison Multi-Plateformes + Multi-Producteurs

**Scénario :** Un logisticien gère plusieurs producteurs présents sur plusieurs plateformes.

**Solution :** Optimisation globale de toutes les commandes en une seule requête.

**Bénéfice :** Optimisation maximale.

## Concepts Clés

### Données en Entrée (DFC)

- **Order** - Une commande client
- **OrderLine** - Une ligne de commande (produit + quantité)
- **PhysicalPlace** - Lieu physique (producteur, point de retrait)
- **Address** - Adresse avec coordonnées GPS
- **TimeWindow** - Créneau horaire (horaires d'ouverture)

### Données en Sortie (DFC Enrichi)

Tout ce qui était en entrée **+** :

- **Route** - Itinéraire optimisé avec géométrie
- **Vehicle** - Véhicule de livraison
- **Shipment** - Envoi (de quel stock vers quel client)
- **Step** - Étape d'une route (départ, collecte, livraison, retour)

## Exemple Visuel

### Avant Optimisation

```
Producteur A (Stock) ──┐
Producteur B (Stock) ──┤
Producteur C (Stock) ──┤
                       │
                       ├──> Client 1
                       ├──> Client 2
                       └──> Client 3
                       
Comment livrer efficacement ?
```

### Après Optimisation

```
Route 1: Producteur A → Client 1 → Client 3 → Producteur A
         Départ 8h00, Arrivée 12h30, 45km

Route 2: Producteur B → Client 2 → Client 1 → Producteur B
         Départ 8h30, Arrivée 11h00, 32km

Route 3: Producteur C → Client 3 → Producteur C
         Départ 9h00, Arrivée 10h30, 18km
```

## Avantages du Middleware

✅ **Simplicité** - Pas besoin d'apprendre l'API Verso  
✅ **Standard** - Utilise uniquement le protocole DFC  
✅ **Interopérabilité** - Fonctionne avec toute plateforme DFC  
✅ **Enrichissement** - Combine données métier + logistique  
✅ **Flexibilité** - Supporte plusieurs cas d'usage  

## Limitations Actuelles

⚠️ **Service time fixe** - 1000 secondes par défaut  
⚠️ **Un véhicule par source** - Pas de regroupement automatique  
⚠️ **Pas de contraintes de capacité** - Volume illimité  
⚠️ **Pas de gestion des retours** - Uniquement aller-retour dépôt  

**📖 Évolutions prévues :** [Contexte et Roadmap](docs/CONTEXTE.md)

---

## Pour Aller Plus Loin

- [📖 Guide API détaillé](docs/API.md) - Tous les endpoints et formats
- [📦 Exemples concrets](docs/EXEMPLES.md) - Code et datasets
- [🏗️ Architecture technique](docs/ARCHITECTURE.md) - Fonctionnement interne
- [⚙️ Transformations](docs/TRANSFORMATIONS.md) - Logique de conversion
- [🚀 Déploiement](docs/DEPLOIEMENT.md) - Installation production
- [💻 Développement](docs/DEVELOPPEMENT.md) - Contribuer au code

