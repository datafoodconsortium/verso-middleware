# Guide de Contribution

Merci de votre intérêt pour contribuer au projet Verso Middleware !

---

## Comment Contribuer ?

### 1. Reporter un Bug

**Avant de reporter :**
- ✅ Vérifier que le bug n'est pas déjà reporté dans [Issues](../../issues)
- ✅ Tester avec la dernière version

**Créer une issue avec :**
- Description claire du bug
- Étapes pour reproduire
- Comportement attendu vs actuel
- Version Node.js, OS
- Logs d'erreur si disponibles

**Template :**

```markdown
**Description**
[Description du bug]

**Étapes de reproduction**
1. Faire ceci...
2. Puis cela...
3. Observer l'erreur

**Comportement attendu**
[Ce qui devrait se passer]

**Comportement actuel**
[Ce qui se passe réellement]

**Environnement**
- OS: [Ubuntu 22.04]
- Node.js: [20.x]
- Version: [1.0.0]

**Logs**
```
[Coller les logs]
```
```

---

### 2. Proposer une Amélioration

**Créer une issue avec :**
- Problème à résoudre
- Solution proposée
- Alternatives considérées
- Impact (breaking change ?)

---

### 3. Contribuer du Code

#### Fork & Clone

```bash
# 1. Fork sur GitHub
# Cliquer sur "Fork" en haut à droite

# 2. Cloner votre fork
git clone https://github.com/votre-username/verso-middleware.git
cd verso-middleware

# 3. Ajouter l'upstream
git remote add upstream https://github.com/org-originale/verso-middleware.git
```

#### Créer une Branche

```bash
# Mettre à jour main
git checkout main
git pull upstream main

# Créer une branche
git checkout -b feature/ma-feature
# ou
git checkout -b fix/mon-bug
```

#### Développer

```bash
# Installer les dépendances
yarn install

# Configurer
cp config.example.json ../secrets/production/config-verso.json
# Éditer config-verso.json dans @secrets

# Développer en mode watch
yarn dev

# Tester
yarn test
```

#### Commiter

**Convention de commits :**

```
<type>: <description courte>

[description longue optionnelle]

[footer optionnel]
```

**Types :**
- `feat` - Nouvelle fonctionnalité
- `fix` - Correction de bug
- `docs` - Documentation
- `style` - Formatage (pas de changement de code)
- `refactor` - Refactoring
- `test` - Ajout/modification de tests
- `chore` - Maintenance, configuration

**Exemples :**

```bash
git commit -m "feat: add vehicle capacity support"
git commit -m "fix: handle missing coordinates gracefully"
git commit -m "docs: update API examples"
```

#### Push & Pull Request

```bash
# Push vers votre fork
git push origin feature/ma-feature

# Créer une Pull Request sur GitHub
# Base: main <- Compare: feature/ma-feature
```

**Template Pull Request :**

```markdown
## Description
[Description claire des changements]

## Type de Changement
- [ ] 🐛 Bug fix (non-breaking change)
- [ ] ✨ Nouvelle feature (non-breaking change)
- [ ] 💥 Breaking change
- [ ] 📝 Documentation

## Motivation et Contexte
[Pourquoi ce changement est nécessaire ? Quel problème résout-il ?]
[Lien vers l'issue : Fixes #123]

## Tests Effectués
- [ ] Tests unitaires passent (`yarn test`)
- [ ] Testé avec les données d'exemple
- [ ] Testé manuellement
- [ ] Nouveaux tests ajoutés

## Checklist
- [ ] Code suit les conventions du projet
- [ ] Auto-review effectué
- [ ] Commentaires ajoutés pour code complexe
- [ ] Documentation mise à jour
- [ ] Pas de warnings de compilation
- [ ] Tests ajoutés/mis à jour
- [ ] CHANGELOG.md mis à jour
```

---

## Standards de Code

### Style

**JavaScript :**
- Indentation : 2 espaces
- Quotes : Single quotes `'`
- Semicolons : Oui
- Trailing commas : Oui pour les objets/arrays multilignes
- Line length : 80-100 caractères max

**Exemple :**

```javascript
// ✅ Bon
const myFunction = async (param1, param2) => {
  const result = await someAsyncCall();
  return result;
};

// ❌ Mauvais
const myFunction = async(param1,param2)=>{
const result=await someAsyncCall()
return result
}
```

### Naming

```javascript
// Variables & fonctions : camelCase
const myVariable = 'value';
function myFunction() { }

// Classes : PascalCase
class MyClass { }

// Constants : UPPER_SNAKE_CASE
const API_URL = 'https://...';

// Private (convention) : _prefixé
const _privateFunction = () => { };
```

### Commentaires

**En anglais** pour le code :

```javascript
// Good: Extract coordinates from address
const lat = address['dfc-b:latitude'];

// Bad: Extraire les coordonnées
const lat = address['dfc-b:latitude'];
```

**En français** pour la documentation utilisateur (README, docs/).

### Gestion des Erreurs

```javascript
// ✅ Toujours gérer les erreurs
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Error in riskyOperation:', error);
  throw new Error(`Failed to do X: ${error.message}`);
}

// ❌ Pas de catch vide
try {
  await riskyOperation();
} catch (error) {
  // Silent fail
}
```

---

## Tests

### Écrire des Tests

**Pour chaque nouvelle feature :**

```javascript
// tests/monService.test.js
describe('MonService', () => {
  
  test('should handle valid input', () => {
    const result = service.process(validInput);
    expect(result).toEqual(expectedOutput);
  });
  
  test('should throw on invalid input', () => {
    expect(() => service.process(invalidInput))
      .toThrow('Invalid input');
  });
  
  test('should handle edge cases', () => {
    expect(service.process(null)).toBeNull();
    expect(service.process([])).toEqual([]);
  });
  
});
```

### Lancer les Tests

```bash
# Tous les tests
yarn test

# Mode watch
yarn test --watch

# Couverture
yarn test --coverage
```

**Objectif couverture :** > 70%

---

## Documentation

### Mettre à Jour la Documentation

**Si votre PR change :**

- **API** → Mettre à jour [docs/API-fr.md](API-fr.md)
- **Architecture** → Mettre à jour [docs/ARCHITECTURE-fr.md](ARCHITECTURE-fr.md)
- **Transformations** → Mettre à jour [docs/TRANSFORMATIONS-fr.md](TRANSFORMATIONS-fr.md)
- **Configuration** → Mettre à jour [docs/DEPLOIEMENT-fr.md](DEPLOIEMENT-fr.md)
- **README** → Mettre à jour si impact majeur

### CHANGELOG.md

**Toujours mettre à jour** [docs/CHANGELOG-fr.md](CHANGELOG-fr.md) :

```markdown
## [Unreleased]

### Added
- Support for vehicle capacity constraints (#42)

### Fixed
- Handle missing coordinates gracefully (#38)

### Changed
- Improved error messages for API calls (#40)
```

---

## Revue de Code

### Reviewer un PR

**Vérifier :**

- ✅ Code clair et lisible
- ✅ Tests passent
- ✅ Documentation à jour
- ✅ Pas de régression
- ✅ Performance acceptable
- ✅ Sécurité (pas de données sensibles exposées)

**Ton de la revue :**
- 👍 Constructif et bienveillant
- 💡 Proposer des alternatives
- ❓ Poser des questions plutôt qu'imposer

---

## Processus de Release

**Mainteneurs uniquement**

### 1. Préparer la Release

```bash
# Créer une branche release
git checkout -b release/1.2.0

# Mettre à jour le CHANGELOG
nano docs/CHANGELOG-fr.md
# Remplacer [Unreleased] par [1.2.0] - 2024-12-05

# Mettre à jour package.json
npm version 1.2.0

# Commit
git commit -am "chore: prepare release 1.2.0"
```

### 2. Merger & Tagger

```bash
# Merger dans main
git checkout main
git merge release/1.2.0

# Créer le tag
git tag -a v1.2.0 -m "Release 1.2.0"

# Push
git push origin main --tags
```

### 3. Publier

- Créer une GitHub Release
- Ajouter les notes de version (depuis CHANGELOG)
- Publier les images Docker (si applicable)

---

## Code of Conduct

### Nos Engagements

- 🤝 Accueillir tout le monde
- 💬 Communication respectueuse
- 🎯 Focus sur ce qui est meilleur pour la communauté
- 🙏 Empathie envers les autres

### Comportements Inacceptables

- ❌ Langage ou imagerie sexualisés
- ❌ Trolling, insultes, attaques personnelles
- ❌ Harcèlement public ou privé
- ❌ Publication d'informations privées d'autrui

### Application

Les mainteneurs se réservent le droit de supprimer, éditer ou rejeter les contributions qui ne respectent pas ce code de conduite.

---

## Questions ?

- 💬 [Discussions GitHub](../../discussions)
- 🐛 [Issues](../../issues)
- 📧 Email : [à compléter]

---

**Merci de contribuer ! 🙏**

