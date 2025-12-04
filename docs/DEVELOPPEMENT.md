# Guide de Développement

Guide pour les développeurs souhaitant contribuer ou maintenir le projet.

---

## Installation de l'Environnement

### Prérequis Système

**Obligatoires :**
- **Node.js 20+** - Runtime JavaScript
- **Yarn** ou npm - Gestionnaire de paquets
- **Git** - Gestion de version

**Recommandés :**
- **VSCode** - Éditeur avec bon support Node.js/JavaScript
- **Docker** - Pour tests en environnement isolé
- **Compte GitHub** - Pour contributions

---

### Setup Initial

**Étapes :**

1. **Cloner le dépôt**
   - Forker le projet sur GitHub (si contribution)
   - Cloner localement

2. **Installer les dépendances**
   - Commande : `yarn install`
   - Installe toutes les dépendances (prod + dev)

3. **Créer la configuration**
   - Copier `.env.example` vers `.env`
   - Renseigner la clé API Verso (nécessaire pour tests réels)

4. **Vérifier l'installation**
   - Lancer les tests : `yarn test`
   - Démarrer le serveur : `yarn dev`
   - Tester : `curl http://localhost:3001/health`

---

## Structure du Projet

```
verso-middleware/
├── src/                           # Code source
│   ├── index.js                   # Point d'entrée, serveur Express
│   ├── optimizationService.js     # Logique métier transformations
│   └── config.js                  # Gestion configuration
├── tests/                         # Tests unitaires
│   └── optimizationService.test.js
├── dataset/                       # Données d'exemple
│   ├── orders-DFC.json
│   ├── needs-verso.json
│   ├── results-verso.json
│   └── results-DFC.json
├── docs/                          # Documentation
├── .env.example                   # Template configuration
├── config.example.json            # Template configuration JSON
├── docker-compose*.yml            # Configurations Docker
├── package.json                   # Dépendances et scripts
├── yarn.lock                      # Lock des versions
└── README.md                      # Point d'entrée documentation
```

---

## Comprendre le Code

### Fichier 1 : src/index.js

**Rôle :** Serveur Express et définition des routes

**Sections principales :**
1. **Imports** - Dépendances nécessaires
2. **Initialisation Express** - Configuration app
3. **Middleware** - helmet, cors, morgan, json parser
4. **Initialisation Service** - Instance de `OptimizationService`
5. **Routes** - Définition /health, /optim, /optimWhithVersoReturn
6. **Démarrage serveur** - Écoute sur le port configuré

**Points d'attention :**
- Toutes les routes utilisent `async/await`
- Gestion d'erreur systématique avec `try/catch`
- Logs des erreurs avec `console.error()`

**Taille :** ~100 lignes

---

### Fichier 2 : src/optimizationService.js

**Rôle :** Logique métier de transformation

**Classe :** `OptimizationService`

**Méthodes principales :**

| Méthode | Lignes | Rôle |
|---------|--------|------|
| `transformDFCtoVerso()` | ~150 | Transformation DFC → Verso |
| `callVersoOptimization()` | ~30 | Appel API Verso |
| `transformVersoToDFC()` | ~200 | Transformation Verso → DFC |
| `cleanObject()` | ~20 | Utilitaire nettoyage objets |

**Fonctions helper :**
- Extraction coordonnées GPS
- Extraction time windows
- Validation données

**Points d'attention :**
- Utilisation intensive de `jsonld` library
- Beaucoup de navigation dans objets imbriqués
- Gestion des cas d'erreur (coordonnées manquantes, etc.)

**Taille :** ~400 lignes

---

### Fichier 3 : tests/optimizationService.test.js

**Framework :** Jest

**Structure :**
- Setup / Teardown (beforeEach, afterEach)
- Tests par méthode (describe blocks)
- Données de test (mocks et fixtures)

**Tests couverts :**
- Transformation DFC → Verso avec données valides
- Gestion des coordonnées invalides
- Appel API Verso (mocké)
- Transformation Verso → DFC

**Taille :** ~200 lignes

---

## Workflow de Développement

### Cycle de Développement Standard

```
1. Créer une branche feature
   ↓
2. Développer en mode watch (yarn dev)
   ↓
3. Tester manuellement (curl, Postman)
   ↓
4. Écrire/ajuster tests unitaires
   ↓
5. Vérifier que tests passent (yarn test)
   ↓
6. Commiter avec message conventionnel
   ↓
7. Push et créer Pull Request
```

---

### Mode Développement

**Commande :** `yarn dev`

**Ce que ça fait :**
- Lance Nodemon (auto-reload)
- Recharge le serveur à chaque modification
- Affiche les logs en temps réel

**Utilisation :**
- Modifier le code dans `src/`
- Sauvegarder
- Serveur redémarre automatiquement
- Tester vos changements

---

### Tests Unitaires

**Commande :** `yarn test`

**Options utiles :**
- `yarn test --watch` - Mode watch (relance à chaque modif)
- `yarn test --coverage` - Rapport de couverture

**Bonnes pratiques :**
- ✅ Tester les cas nominaux
- ✅ Tester les cas d'erreur
- ✅ Tester les cas limites (null, undefined, etc.)
- ✅ Mocker les dépendances externes (API Verso)

---

### Tests Manuels

**Avec les données d'exemple :**
```bash
curl -X POST http://localhost:3001/optim \
  -H "Content-Type: application/json" \
  -d @dataset/orders-DFC.json
```

**Avec vos propres données :**
1. Créer un fichier JSON avec votre graphe DFC
2. Tester la transformation : `/optimWhithVersoReturn`
3. Tester l'optimisation complète : `/optim`

---

## Conventions de Code

### Style JavaScript

**Indentation :** 2 espaces (pas de tabs)

**Quotes :** Single quotes `'string'`

**Semicolons :** Oui, toujours

**Naming :**
- Variables/fonctions : `camelCase`
- Classes : `PascalCase`
- Constantes : `UPPER_SNAKE_CASE`

**Exemple :**
```javascript
const API_URL = 'https://...';

class OptimizationService {
  async transformData(input) {
    const result = await this.process(input);
    return result;
  }
}
```

---

### Commentaires

**Langue :** Anglais pour le code

**Quand commenter :**
- ✅ Fonctions complexes (jsdoc)
- ✅ Algorithmes non évidents
- ✅ Workarounds temporaires (avec TODO)
- ✅ Points d'attention importants

**Quand NE PAS commenter :**
- ❌ Code évident
- ❌ Répétition du code en français
- ❌ Vieux code commenté (supprimer plutôt)

**Exemple de bon commentaire :**
```javascript
// Extract source coordinates from stock location
// Path: OrderLine → Offer → RealStock → PhysicalPlace → Address
const offer = orderLine['dfc-b:fulfilledBy'];
```

---

### Gestion des Erreurs

**Pattern standard :**
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Error in riskyOperation:', error);
  throw new Error(`Failed to do X: ${error.message}`);
}
```

**Bonnes pratiques :**
- ✅ Toujours catch les erreurs async
- ✅ Logger avec `console.error()`
- ✅ Rethrow avec message explicite
- ✅ Ne jamais avoir de catch vide

---

## Ajouter une Fonctionnalité

### Process Recommandé

#### 1. Comprendre le Besoin

**Questions à se poser :**
- Quel problème résout cette feature ?
- Est-ce un cas d'usage réel ?
- Impact sur l'existant ?
- Breaking change ?

#### 2. Designer la Solution

**Considérations :**
- Où placer le code ? (`index.js` vs `optimizationService.js`)
- Nouvelle méthode ou modification existante ?
- Impact sur les transformations ?
- Besoin de nouvelles dépendances ?

#### 3. Implémenter

**Étapes :**
1. Créer une branche `feature/nom-feature`
2. Implémenter le code
3. Ajouter les logs nécessaires
4. Tester manuellement

#### 4. Tester

**Tests à ajouter :**
- Test unitaire pour la nouvelle feature
- Tests de non-régression (existant fonctionne toujours)
- Test avec données d'exemple

#### 5. Documenter

**Documentation à mettre à jour :**
- README si feature majeure
- `docs/API.md` si endpoint modifié
- `docs/ARCHITECTURE.md` si architecture impactée
- `docs/CHANGELOG.md` obligatoire

---

## Débugger

### Stratégies de Debug

#### 1. Logs Console

**Ajout temporaire de logs :**
```javascript
console.log('Debug variable:', JSON.stringify(variable, null, 2));
```

**⚠️ Important :** Retirer avant de commiter !

#### 2. Debugger Node.js

**Lancer avec inspecteur :**
```bash
node --inspect src/index.js
```

**Connecter Chrome DevTools :**
- Ouvrir `chrome://inspect`
- Cliquer sur le processus Node.js
- Utiliser breakpoints, watch, etc.

#### 3. Tests Isolés

**Tester une fonction spécifique :**
```bash
yarn test -t "nom du test"
```

#### 4. Endpoint de Debug

**Utiliser `/optimWhithVersoReturn` :**
Voir la transformation DFC → Verso sans appeler Verso.

---

### Problèmes Courants

#### Le serveur ne démarre pas

**Vérifications :**
- Port 3001 disponible ? (`lsof -i :3001`)
- Configuration valide ? (JSON bien formé)
- Node.js version >= 20 ?

#### Tests échouent

**Causes fréquentes :**
- Dépendances pas à jour (`yarn install`)
- Mocks incorrects
- Tests dépendent d'un ordre d'exécution (mauvaise pratique)

#### Transformation échoue

**Debug :**
1. Vérifier la structure du graphe DFC en entrée
2. Utiliser `/optimWhithVersoReturn` pour voir Verso généré
3. Comparer avec `dataset/orders-DFC.json`
4. Vérifier les logs pour warnings

---

## Dépendances

### Ajouter une Dépendance

**Production :**
```bash
yarn add nom-package
```

**Développement :**
```bash
yarn add -D nom-package
```

**Vérifier :**
- Taille du package (éviter packages lourds)
- Dernière mise à jour (éviter packages abandonnés)
- Nombre de dépendances transitives
- Licence compatible

---

### Mettre à Jour les Dépendances

**Vérifier les updates disponibles :**
```bash
yarn outdated
```

**Mettre à jour :**
```bash
yarn upgrade nom-package
```

**⚠️ Attention :**
- Toujours tester après update
- Lire les CHANGELOG des packages
- Attention aux breaking changes

---

## Git et Versioning

### Branches

**Convention :**
- `main` - Production stable
- `develop` - Développement (si utilisé)
- `feature/nom-feature` - Nouvelle fonctionnalité
- `fix/nom-bug` - Correction bug
- `docs/sujet` - Documentation seule

---

### Commits

**Convention (Conventional Commits) :**

```
type: description courte

[corps optionnel]

[footer optionnel]
```

**Types :**
- `feat` - Nouvelle fonctionnalité
- `fix` - Correction de bug
- `docs` - Documentation seule
- `refactor` - Refactoring sans changement fonctionnel
- `test` - Ajout/modification tests
- `chore` - Maintenance, config, etc.

**Exemples :**
```
feat: add vehicle capacity support
fix: handle missing coordinates gracefully
docs: update API examples
refactor: simplify coordinate extraction
```

---

### Pull Requests

**Avant de créer une PR :**
- [ ] Tests passent
- [ ] Code respecte les conventions
- [ ] Documentation à jour
- [ ] CHANGELOG.md mis à jour
- [ ] Commits propres et atomiques

**Template PR :**
Voir [docs/CONTRIBUER.md](CONTRIBUER.md) pour le template complet

---

## Bonnes Pratiques

### Code Quality

**Principes :**
- **DRY** (Don't Repeat Yourself) - Factoriser le code dupliqué
- **KISS** (Keep It Simple) - Simplicité > cleverness
- **Single Responsibility** - Une fonction = une responsabilité
- **Explicit > Implicit** - Code clair > code court

---

### Performance

**Considérations :**
- Ne pas optimiser prématurément
- Profiler avant d'optimiser
- Éviter les opérations synchrones bloquantes
- Utiliser `async/await` pour I/O

**Points d'attention dans le projet :**
- JSON-LD operations (framing, flattening) peuvent être lentes sur gros graphes
- Appel API Verso est le bottleneck principal
- Cache du contexte DFC pourrait améliorer perfs

---

### Sécurité

**À faire :**
- ✅ Valider les entrées utilisateur
- ✅ Gérer les erreurs sans exposer de détails internes
- ✅ Ne jamais logger de données sensibles
- ✅ Utiliser HTTPS en production

**À ne pas faire :**
- ❌ Commiter des secrets (clés API, passwords)
- ❌ Eval() ou Function() avec input utilisateur
- ❌ Désactiver validations "pour tester"

---

## Ressources pour Développeurs

### Documentation Interne

- **Architecture :** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Transformations :** [docs/TRANSFORMATIONS.md](TRANSFORMATIONS.md)
- **API :** [docs/API.md](API.md)
- **Contribution :** [docs/CONTRIBUER.md](CONTRIBUER.md)

### Documentation Externe

**Technologies :**
- Node.js : https://nodejs.org/docs/
- Express.js : https://expressjs.com/
- JSON-LD : https://json-ld.org/
- Jest : https://jestjs.io/

**Standards :**
- DFC Ontology : https://github.com/datafoodconsortium/ontology
- Conventional Commits : https://www.conventionalcommits.org/

---

## Support et Communauté

**Questions :**
- GitHub Discussions : [Discussions](../../discussions)
- Issues : [GitHub Issues](../../issues)

**Contribution :**
- Lire [docs/CONTRIBUER.md](CONTRIBUER.md)
- Proposer des features via Issues
- Soumettre des Pull Requests

---

**Bon développement ! 🚀**
