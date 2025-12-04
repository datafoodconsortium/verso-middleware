# Contribution Guide

Thank you for your interest in contributing to the Verso Middleware project!

---

## How to Contribute?

### 1. Report a Bug

**Before reporting:**
- ✅ Check that the bug is not already reported in [Issues](../../issues)
- ✅ Test with latest version

**Create an issue with:**
- Clear bug description
- Steps to reproduce
- Expected vs actual behavior
- Node.js version, OS
- Error logs if available

**Template:**

```markdown
**Description**
[Bug description]

**Reproduction Steps**
1. Do this...
2. Then that...
3. Observe the error

**Expected Behavior**
[What should happen]

**Actual Behavior**
[What actually happens]

**Environment**
- OS: [Ubuntu 22.04]
- Node.js: [20.x]
- Version: [1.0.0]

**Logs**
```
[Paste logs]
```
```

---

### 2. Propose an Improvement

**Create an issue with:**
- Problem to solve
- Proposed solution
- Considered alternatives
- Impact (breaking change?)

---

### 3. Contribute Code

#### Fork & Clone

```bash
# 1. Fork on GitHub
# Click "Fork" at top right

# 2. Clone your fork
git clone https://github.com/your-username/verso-middleware.git
cd verso-middleware

# 3. Add upstream
git remote add upstream https://github.com/original-org/verso-middleware.git
```

#### Create Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create branch
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bug
```

#### Develop

```bash
# Install dependencies
yarn install

# Configure
cp config.example.json ../secrets/production/config-verso.json
# Edit config-verso.json in @secrets

# Develop in watch mode
yarn dev

# Test
yarn test
```

#### Commit

**Commit convention:**

```
<type>: <short description>

[optional long description]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Refactoring
- `test` - Add/modify tests
- `chore` - Maintenance, configuration

**Examples:**

```bash
git commit -m "feat: add vehicle capacity support"
git commit -m "fix: handle missing coordinates gracefully"
git commit -m "docs: update API examples"
```

#### Push & Pull Request

```bash
# Push to your fork
git push origin feature/my-feature

# Create Pull Request on GitHub
# Base: main <- Compare: feature/my-feature
```

**Pull Request Template:**

```markdown
## Description
[Clear description of changes]

## Change Type
- [ ] 🐛 Bug fix (non-breaking change)
- [ ] ✨ New feature (non-breaking change)
- [ ] 💥 Breaking change
- [ ] 📝 Documentation

## Motivation and Context
[Why is this change necessary? What problem does it solve?]
[Link to issue: Fixes #123]

## Tests Performed
- [ ] Unit tests pass (`yarn test`)
- [ ] Tested with example data
- [ ] Manually tested
- [ ] New tests added

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review performed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No compilation warnings
- [ ] Tests added/updated
- [ ] CHANGELOG.md updated
```

---

## Code Standards

### Style

**JavaScript:**
- Indentation: 2 spaces
- Quotes: Single quotes `'`
- Semicolons: Yes
- Trailing commas: Yes for multiline objects/arrays
- Line length: 80-100 characters max

**Example:**

```javascript
// ✅ Good
const myFunction = async (param1, param2) => {
  const result = await someAsyncCall();
  return result;
};

// ❌ Bad
const myFunction = async(param1,param2)=>{
const result=await someAsyncCall()
return result
}
```

### Naming

```javascript
// Variables & functions: camelCase
const myVariable = 'value';
function myFunction() { }

// Classes: PascalCase
class MyClass { }

// Constants: UPPER_SNAKE_CASE
const API_URL = 'https://...';

// Private (convention): _prefixed
const _privateFunction = () => { };
```

### Comments

**In English** for code:

```javascript
// Good: Extract coordinates from address
const lat = address['dfc-b:latitude'];

// Bad: Extraire les coordonnées
const lat = address['dfc-b:latitude'];
```

**In French** for user documentation (README, docs/).

### Error Handling

```javascript
// ✅ Always handle errors
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Error in riskyOperation:', error);
  throw new Error(`Failed to do X: ${error.message}`);
}

// ❌ No empty catch
try {
  await riskyOperation();
} catch (error) {
  // Silent fail
}
```

---

## Tests

### Writing Tests

**For each new feature:**

```javascript
// tests/myService.test.js
describe('MyService', () => {
  
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

### Run Tests

```bash
# All tests
yarn test

# Watch mode
yarn test --watch

# Coverage
yarn test --coverage
```

**Coverage goal:** > 70%

---

## Documentation

### Update Documentation

**If your PR changes:**

- **API** → Update [docs/API-en.md](API-en.md)
- **Architecture** → Update [docs/ARCHITECTURE-en.md](ARCHITECTURE-en.md)
- **Transformations** → Update [docs/TRANSFORMATIONS-en.md](TRANSFORMATIONS-en.md)
- **Configuration** → Update [docs/DEPLOYMENT-en.md](DEPLOYMENT-en.md)
- **README** → Update if major impact

### CHANGELOG.md

**Always update** [docs/CHANGELOG-en.md](CHANGELOG-en.md):

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

## Code Review

### Reviewing a PR

**Check:**

- ✅ Clear and readable code
- ✅ Tests pass
- ✅ Documentation updated
- ✅ No regression
- ✅ Acceptable performance
- ✅ Security (no exposed sensitive data)

**Review tone:**
- 👍 Constructive and benevolent
- 💡 Propose alternatives
- ❓ Ask questions rather than impose

---

## Release Process

**Maintainers only**

### 1. Prepare Release

```bash
# Create release branch
git checkout -b release/1.2.0

# Update CHANGELOG
nano docs/CHANGELOG-en.md
# Replace [Unreleased] with [1.2.0] - 2024-12-05

# Update package.json
npm version 1.2.0

# Commit
git commit -am "chore: prepare release 1.2.0"
```

### 2. Merge & Tag

```bash
# Merge to main
git checkout main
git merge release/1.2.0

# Create tag
git tag -a v1.2.0 -m "Release 1.2.0"

# Push
git push origin main --tags
```

### 3. Publish

- Create GitHub Release
- Add release notes (from CHANGELOG)
- Publish Docker images (if applicable)

---

## Code of Conduct

### Our Commitments

- 🤝 Welcome everyone
- 💬 Respectful communication
- 🎯 Focus on what's best for the community
- 🙏 Empathy towards others

### Unacceptable Behaviors

- ❌ Sexualized language or imagery
- ❌ Trolling, insults, personal attacks
- ❌ Public or private harassment
- ❌ Publishing others' private information

### Enforcement

Maintainers reserve the right to remove, edit, or reject contributions that do not respect this code of conduct.

---

## Questions?

- 💬 [GitHub Discussions](../../discussions)
- 🐛 [Issues](../../issues)
- 📧 Email: [to be completed]

---

**Thank you for contributing! 🙏**

