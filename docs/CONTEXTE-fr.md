# Contexte du Projet

Document de contexte sur l'expérimentation Verso ↔ Data Food Consortium.

---

## Objectif

Expérimenter l'usage du **protocole DFC** (Data Food Consortium) pour réaliser des **optimisations logistiques** via l'API Verso, tout en garantissant l'interopérabilité entre plateformes.

---

## Architecture

### Problématique

**Verso** est une solution d'optimisation logistique spécialisée dans le VRP (Vehicle Routing Problem). Verso ne souhaite pas gérer directement des API entrantes/sortantes au format DFC.

### Solution : Middleware

Création d'un **middleware** qui :

1. **Reçoit** des données DFC (commandes, adresses, horaires)
2. **Transforme** ces besoins en format Verso
3. **Appelle** l'API Verso pour optimisation
4. **Transforme** le résultat Verso en format DFC enrichi
5. **Retourne** les routes optimisées au format DFC

```
Plateformes DFC  →  Middleware  →  API Verso
                        ↓
                  Routes DFC optimisées
```

### Avantages

✅ **Interopérabilité** - Les plateformes n'ont pas à connaître Verso  
✅ **Standard DFC** - Utilisation du protocole commun  
✅ **Séparation des responsabilités** - Verso focus sur l'optimisation, pas sur le protocole DFC  
✅ **Enrichissement** - Combine données métier (commandes, produits) + logistique (routes, étapes)  

---

## Cas d'Usage Validés

### 1. Multi-Plateformes

**Scénario :**  
Un producteur a des commandes sur **Open Food Network** ET **Cagette**.

**Besoin :**  
Optimiser toutes ses livraisons en une seule tournée.

**Solution :**  
Le producteur récupère toutes ses commandes via le protocole DFC, les envoie au middleware, et reçoit un itinéraire optimisé.

**Statut :** ✅ Validé

---

### 2. Multi-Producteurs (Logisticien)

**Scénario :**  
Un logisticien livre pour plusieurs producteurs.

**Besoin :**  
Mutualiser les livraisons pour optimiser les coûts.

**Solution :**  
Le logisticien accède aux commandes de plusieurs producteurs (avec leur accord), les regroupe, et obtient des routes mutualisées.

**Implémentation actuelle :**  
Un utilisateur marqué "logisticien" en base de données obtient toutes les commandes à optimiser.

**Statut :** ✅ Validé (implémentation simpliste mais fonctionnelle)

---

### 3. Multi-Plateformes + Multi-Producteurs

**Scénario :**  
Un logisticien gère plusieurs producteurs présents sur plusieurs plateformes.

**Besoin :**  
Optimisation globale.

**Solution :**  
Combinaison des cas 1 et 2.

**Statut :** ✅ Validé sans difficultés

---

## Valeur Ajoutée Principale

### Croisement Données Métier + Logistique

**Problématique Verso :**  
Verso retourne un résultat d'optimisation qui contient :
- Routes avec géométries
- Étapes (pickup, delivery)
- Horaires

Mais **ne contient pas** :
- Les commandes détaillées
- Les produits
- Les volumes
- La nature des déplacements (quel produit va où ?)

**Solution du Middleware :**

1. **À l'aller (DFC → Verso)** :  
   - Assigner des IDs Verso aux OrderLines  
   - Conserver le graphe DFC original

2. **Au retour (Verso → DFC)** :  
   - Utiliser les IDs Verso pour retrouver les OrderLines  
   - Créer les entités `Shipment` liant routes et commandes  
   - Enrichir le graphe DFC avec les routes optimisées

**Résultat :**  
Le consommateur reçoit un graphe DFC complet avec :
- ✅ Commandes originales
- ✅ Produits et quantités
- ✅ Routes optimisées
- ✅ Liens entre routes et commandes
- ✅ Horaires d'arrivée estimés

---

## Impacts sur l'Ontologie DFC

### Constat

L'expérimentation a montré qu'il **manque plusieurs concepts et propriétés** dans l'ontologie DFC pour exprimer :
- Les besoins d'optimisation
- Les résultats d'optimisation

### Extensions Nécessaires

Le middleware a ajouté dans son contexte JSON-LD :

**Entités :**
- `dfc-b:Route` - Itinéraire optimisé
- `dfc-b:Vehicle` - Véhicule de livraison
- `dfc-b:Shipment` - Envoi (lien entre commande et route)
- `dfc-b:Step` - Étape d'une route

**Propriétés :**
- `dfc-b:geometry` - Géométrie de la route (polyline)
- `dfc-b:vehicle` - Véhicule d'une route
- `dfc-b:steps` - Étapes d'une route
- `dfc-b:stepType` - Type d'étape (start, pickup, delivery, end)
- `dfc-b:geo` - Coordonnées GPS
- `dfc-b:arrival` - Timestamp d'arrivée
- `dfc-b:duration` - Durée de l'étape
- `dfc-b:ships` - Envois d'un véhicule
- `dfc-b:transports` - Commande transportée
- `dfc-b:isChippedIn` - Véhicule d'un envoi
- `dfc-b:startAt` - Étape de départ d'un envoi
- `dfc-b:endAt` - Étape d'arrivée d'un envoi
- `dfc-b:versoIdPickup` - ID Verso pickup (traçabilité)
- `dfc-b:versoIdDelivery` - ID Verso delivery (traçabilité)

### Recommandations

Ces extensions devraient être :
1. **Formalisées** dans l'ontologie DFC
2. **Standardisées** pour interopérabilité
3. **Documentées** avec exemples

---

## Limitations Actuelles

### Techniques

⚠️ **Service time fixe** - 1000 secondes par défaut pour toutes les étapes  
⚠️ **Un véhicule par source** - Pas de regroupement multi-véhicules  
⚠️ **Pas de capacités** - Volume illimité pour les véhicules  
⚠️ **Retour au dépôt obligatoire** - Pas de circuit ouvert  
⚠️ **Time windows simples** - Un seul créneau par lieu  

### Fonctionnelles

⚠️ **Authentification simpliste** - Utilisateur "logisticien" marqué manuellement  
⚠️ **Pas de gestion des droits** - Accès total aux commandes  
⚠️ **Pas de validation avancée** - Coordonnées invalides = skip  

---

## Évolutions Prévues

### Court Terme

- [ ] Support des capacités véhicules
- [ ] Multi-véhicules par producteur
- [ ] Validation JSON Schema
- [ ] Meilleure gestion des time windows
- [ ] Configuration du service time

### Moyen Terme

- [ ] Authentification robuste
- [ ] Gestion des permissions (qui voit quelles commandes)
- [ ] Support circuits ouverts
- [ ] Optimisation incrémentale
- [ ] Interface de visualisation

### Long Terme

- [ ] Intégration avec d'autres moteurs d'optimisation
- [ ] Prédictions IA (temps de trajet, etc.)
- [ ] Optimisation temps réel
- [ ] Carbon footprint calculation

---

## Ressources Projet

### Repositories

- **Middleware :** [verso-middleware](https://github.com/...)
- **Prototype DFC :** [dfc-prototype-V3](https://github.com/...)
- **Ontologie DFC :** [ontology](https://github.com/datafoodconsortium/ontology)

### Documentation

- **DFC :** https://datafoodconsortium.org/
- **Verso :** https://verso-optim.com/
- **Business API :** https://github.com/datafoodconsortium/business-api

### Datasets de Test

Disponibles dans `dataset/` :
- `orders-DFC.json` - Commandes DFC exemple
- `needs-verso.json` - Format Verso généré
- `results-verso.json` - Résultat Verso
- `results-DFC.json` - Résultat DFC enrichi

---

## Retours d'Expérience

### Succès

✅ **Interopérabilité validée** - Le protocole DFC fonctionne pour la logistique  
✅ **Multi-plateformes fonctionnel** - Agrégation de commandes de sources diverses  
✅ **Multi-producteurs fonctionnel** - Mutualisation validée  
✅ **Enrichissement de données** - Combinaison métier + logistique réussie  

### Défis

⚠️ **Ontologie à étendre** - Concepts logistiques manquants  
⚠️ **Complexité JSON-LD** - Framing et flattening parfois difficiles  
⚠️ **Performance** - Traitement de gros graphes à optimiser  
⚠️ **Gestion des identifiants** - Traçabilité DFC ↔ Verso complexe  

### Leçons Apprises

💡 **JSON-LD puissant mais exigeant** - Nécessite une bonne compréhension  
💡 **Séparation claire des responsabilités** - Middleware = bonne approche  
💡 **Tests avec vraies données** - Essentiel pour validation  
💡 **Documentation critique** - JSON-LD complexe = doc indispensable  

---

## Conclusion

Cette expérimentation a démontré la **viabilité du protocole DFC pour la logistique**. 

Le middleware Verso prouve qu'il est possible de :
- ✅ Utiliser DFC pour des cas d'usage logistiques
- ✅ Intégrer des services externes (Verso)
- ✅ Enrichir les données métier avec des données logistiques
- ✅ Maintenir l'interopérabilité

**Prochaines étapes :**
1. Formaliser les extensions ontologiques
2. Industrialiser le middleware
3. Étendre à d'autres moteurs d'optimisation
4. Déployer en production

---

**Pour plus d'informations :**  
- [README principal](../README.md)
- [Architecture technique](ARCHITECTURE-fr.md)
- [Guide API](API-fr.md)


