# Guide Pratique d'Utilisation

Guide pratique pour intégrer et utiliser le Verso Middleware dans différents contextes.

---

## Données de Démonstration

### Fichiers Disponibles

Le projet fournit un ensemble complet de données d'exemple dans le dossier `dataset/` :

| Fichier | Contenu | Utilité |
|---------|---------|---------|
| `orders-DFC.json` | Commandes DFC complètes | Tester l'entrée du middleware |
| `needs-verso.json` | Format Verso généré | Comprendre la transformation |
| `results-verso.json` | Résultat Verso brut | Voir la réponse de l'API |
| `results-DFC.json` | Résultat DFC enrichi | Exemple de sortie complète |

### Utilisation des Exemples

**Pour tester rapidement :**
- Utilisez `orders-DFC.json` comme modèle pour vos propres données
- Comparez votre structure avec cet exemple
- Vérifiez que vous avez tous les champs obligatoires

**Pour comprendre les transformations :**
- Suivez le cheminement : orders-DFC → needs-verso → results-verso → results-DFC
- Observez comment les entités sont créées et liées

---

## Scénarios d'Usage

### Scénario 1 : Producteur Multi-Plateformes

**Contexte :**
Un producteur de légumes utilise Open Food Network et Cagette. Il a 5 commandes à livrer cette semaine.

**Workflow :**

1. **Collecte des Données**
   - Récupérer les commandes depuis OFN (API DFC)
   - Récupérer les commandes depuis Cagette (API DFC)
   - Fusionner les graphes DFC

2. **Vérification**
   - S'assurer que toutes les adresses ont des coordonnées GPS
   - Vérifier les horaires d'ouverture des points de retrait

3. **Optimisation**
   - Envoyer le graphe fusionné au middleware
   - Recevoir les routes optimisées

4. **Exploitation**
   - Afficher l'itinéraire sur une carte
   - Imprimer la feuille de route
   - Informer les clients des horaires de passage

**Bénéfices :**
- Une seule tournée au lieu de deux
- Économie de temps et carburant
- Ordre optimal des livraisons

---

### Scénario 2 : Logisticien Mutualisé

**Contexte :**
Un logisticien livre pour 3 producteurs différents. Il doit optimiser 15 commandes sur une journée.

**Workflow :**

1. **Accès aux Données**
   - Le logisticien a accès (avec autorisation) aux commandes de ses producteurs
   - Chaque producteur expose ses commandes via DFC

2. **Agrégation**
   - Le système du logisticien collecte toutes les commandes
   - Création d'un graphe DFC global

3. **Optimisation**
   - Une seule requête au middleware avec toutes les commandes
   - Verso calcule les routes mutualisées

4. **Répartition des Résultats**
   - Le logisticien reçoit les routes
   - Chaque producteur est informé de son planning

**Bénéfices :**
- Mutualisation des coûts de transport
- Optimisation globale meilleure qu'individuelle
- Réduction de l'empreinte carbone

---

### Scénario 3 : Plateforme Territoriale

**Contexte :**
Une plateforme gère 10 producteurs et 50 points de vente/retrait sur un territoire.

**Workflow :**

1. **Collecte Quotidienne**
   - Agrégation automatique des commandes de la veille
   - Construction d'un graphe DFC complet

2. **Pré-traitement**
   - Validation des adresses (géocodage si nécessaire)
   - Vérification des créneaux horaires
   - Filtrage des commandes prêtes

3. **Optimisation**
   - Appel au middleware avec toutes les commandes validées
   - Gestion du timeout (volume important)

4. **Distribution**
   - Génération de feuilles de route par producteur
   - Envoi de notifications aux clients
   - Export vers système de suivi

**Bénéfices :**
- Automatisation complète
- Vision d'ensemble du territoire
- Optimisation à l'échelle

---

## Intégrations Techniques

### Application Web Frontend

**Architecture type :**
```
Frontend (React/Vue) → Backend (Node.js/Python) → Verso Middleware → API Verso
                            ↓
                    Base de données DFC
```

**Responsabilités Frontend :**
- Interface utilisateur pour sélectionner les commandes
- Carte interactive pour visualiser les routes
- Affichage des horaires estimés

**Responsabilités Backend :**
- Construction du graphe DFC
- Appel au middleware
- Traitement des résultats
- Stockage de l'optimisation

**Référence :** Le prototype DFC (`dfc-prototype-V3`) implémente ce pattern

---

### Système Batch Automatisé

**Use case :** Optimisation quotidienne automatique

**Architecture :**
```
Cron/Scheduler → Script → Verso Middleware
                   ↓
         Export PDF/Email/API
```

**Étapes du script :**
1. Récupération des commandes du jour
2. Construction du graphe DFC
3. Appel au middleware
4. Génération de rapports
5. Notification des parties prenantes

**Considérations :**
- Gestion des erreurs (retry, alertes)
- Logging détaillé
- Archivage des résultats

---

### Microservices Architecture

**Pattern recommandé :**
```
Order Service → DFC Aggregator → Verso Middleware → Optimization Service
                                                           ↓
                                                    Notification Service
```

**Avantages :**
- Découplage des services
- Scalabilité
- Résilience (retry, fallback)

**Communication :**
- REST pour le middleware
- Queue (RabbitMQ, Kafka) pour async si besoin

---

## Traitement des Résultats

### Extraction des Routes

**Ce que vous recevez :**
Un graphe DFC enrichi contenant vos données originales + les nouvelles entités logistiques.

**Comment extraire :**
1. Parser le JSON-LD reçu
2. Filtrer les entités par type (`@type === 'dfc-b:Route'`)
3. Pour chaque route, récupérer les steps associés
4. Retrouver les commandes liées via les Shipments

**Référence :** Voir la méthode `transformVersoToDFC()` dans `src/optimizationService.js`

---

### Affichage sur Carte

**Géométrie des Routes :**
- Format : Polyline encodée (standard Google)
- Décodage nécessaire avant affichage

**Librairies recommandées :**
- **JavaScript :** Leaflet + `@mapbox/polyline`
- **Python :** Folium + `polyline`

**Éléments à afficher :**
- Tracé de la route (polyline décodée)
- Markers pour chaque step
- Popup avec informations (horaire, type d'étape)
- Différenciation visuelle (pickup vs delivery)

---

### Génération de Feuille de Route

**Informations utiles par étape :**
- Type d'étape (départ, collecte, livraison, retour)
- Adresse (à extraire via l'OrderLine liée)
- Horaire d'arrivée estimé
- Durée de l'arrêt
- Produits à charger/décharger (via OrderLine → Offer)

**Formats de sortie possibles :**
- PDF imprimable
- CSV pour import dans un GPS
- Application mobile dédiée

---

## Gestion des Cas Particuliers

### Commandes Sans Coordonnées GPS

**Problème :** Certaines adresses n'ont pas de coordonnées.

**Solutions :**
1. **Géocodage préalable :** Utiliser une API de géocodage (Nominatim, Google Geocoding) pour obtenir les coordonnées
2. **Interface utilisateur :** Permettre à l'utilisateur de placer un marker sur une carte
3. **Base de données d'adresses :** Maintenir un référentiel d'adresses géocodées

**Important :** Le middleware ignorera les OrderLines sans coordonnées.

---

### Horaires d'Ouverture Complexes

**Limitation actuelle :** Un seul créneau horaire par lieu.

**Si vous avez plusieurs créneaux :**
1. Choisir le créneau le plus large
2. Ou créer plusieurs OrderLines (une par créneau)
3. Ou post-traiter les résultats pour vérifier la compatibilité

**Évolution future :** Support des time windows multiples (voir [docs/CONTEXTE.md](CONTEXTE.md))

---

### Grandes Volumétries

**Problème :** Plus de 100 commandes à optimiser.

**Stratégies :**
1. **Découpage géographique :** Optimiser par zone
2. **Découpage temporel :** Optimiser par jour
3. **Pré-clustering :** Regrouper les commandes proches avant optimisation
4. **Timeout adapté :** Augmenter le timeout de votre client HTTP

**Référence :** Les performances sont documentées dans [docs/ARCHITECTURE.md](ARCHITECTURE.md)

---

### Résultats Insatisfaisants

**Si l'optimisation ne convient pas :**

**Causes possibles :**
- Contraintes horaires trop strictes
- Coordonnées GPS incorrectes
- Points très dispersés géographiquement

**Actions :**
1. Vérifier les données d'entrée (coordonnées, horaires)
2. Assouplir les contraintes horaires
3. Contacter l'administrateur pour ajuster les paramètres Verso

**Note :** Le middleware utilise les paramètres par défaut de Verso (service time = 1000s, etc.)

---

## Tests et Validation

### Phase de Tests Recommandée

#### 1. Tests Unitaires (Données Exemples)

**Objectif :** Valider votre intégration technique

- Utiliser `dataset/orders-DFC.json`
- Vérifier que vous recevez un résultat
- Valider le parsing du résultat

#### 2. Tests avec Données Réelles (Petit Volume)

**Objectif :** Valider la qualité des données

- Commencer avec 2-3 commandes réelles
- Vérifier que les coordonnées sont correctes
- Valider les horaires sur une carte

#### 3. Tests de Montée en Charge

**Objectif :** Valider les performances

- Tester avec 10, 20, 50 commandes
- Mesurer les temps de réponse
- Ajuster les timeouts

#### 4. Tests Utilisateurs

**Objectif :** Valider l'UX et la pertinence

- Faire tester par des producteurs/logisticiens réels
- Recueillir les feedbacks sur les routes proposées
- Ajuster les paramètres si nécessaire

---

## Monitoring et Suivi

### Métriques à Surveiller

**Côté Application :**
- Taux de succès des optimisations
- Temps de réponse du middleware
- Nombre de commandes traitées par jour

**Côté Métier :**
- Économies de distance/temps réalisées
- Taux de satisfaction des livreurs
- Respect des horaires clients

### Debugging

**En cas de problème :**

1. **Vérifier les logs serveur** du middleware
2. **Utiliser `/optimWhithVersoReturn`** pour voir la transformation
3. **Isoler le problème** : tester avec une seule commande
4. **Comparer avec les exemples** du dossier `dataset/`

**Référence :** Le guide de développement [docs/DEVELOPPEMENT.md](DEVELOPPEMENT.md) détaille le debugging

---

## Évolutions et Personnalisations

### Paramètres Configurables

Actuellement, certains paramètres sont fixes dans le code. Pour les modifier :

**Fichier :** `src/optimizationService.js`

**Paramètres modifiables :**
- Service time (temps d'arrêt par défaut)
- URL de l'API Verso
- Format des identifiants générés

**Attention :** Modifications nécessitant une bonne compréhension du code.

### Extensions Possibles

**Idées d'améliorations :**
- Cache des optimisations récentes
- Historique des routes réalisées
- Calcul d'empreinte carbone
- Export vers applications GPS
- Interface de visualisation dédiée

**Référence :** Les évolutions prévues sont dans [docs/CONTEXTE.md](CONTEXTE.md)

---

## Ressources

### Documentation

- **API détaillée :** [docs/API.md](API.md)
- **Architecture :** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Transformations :** [docs/TRANSFORMATIONS.md](TRANSFORMATIONS.md)

### Support

- **Questions :** [GitHub Discussions](../../discussions)
- **Bugs :** [GitHub Issues](../../issues)

### Communauté DFC

- **Site officiel :** https://datafoodconsortium.org/
- **GitHub :** https://github.com/datafoodconsortium
