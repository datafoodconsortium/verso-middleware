# Development Guide

Guide for developers wishing to contribute or maintain the project.

---

## Environment Setup

### System Prerequisites

**Required:**
- **Node.js 20+** - JavaScript runtime
- **Yarn** or npm - Package manager
- **Git** - Version control
-**Docker** - For isolated environment testing

**Recommended:**
- **VSCode** - Editor with good Node.js/JavaScript support
- **GitHub account** - For contributions

---

### Initial Setup

**Steps:**

1. **Clone repository**
   - Fork project on GitHub (if contributing)
   - Clone locally

2. **Verify configuration**
   - Ensure `../secrets/production/config-verso.json` exists
   - Verify Verso API key is filled in
   - Reference: `config.example.json` for structure

3. **Create Docker network (once)**
   - `docker network create dfc_shared_network`

4. **Verify installation**
   - Start: `docker-compose up`
   - Test: `curl http://localhost:3001/health`
   - Tests: `docker-compose -f docker-compose-test.yml up`

---

## Project Structure

```
verso-middleware/
├── src/                           # Source code
│   ├── index.js                   # Entry point, Express server
│   ├── optimizationService.js     # Transformation business logic
│   └── config.js                  # Configuration management
├── tests/                         # Unit tests
│   └── optimizationService.test.js
├── dataset/                       # Example data
│   ├── orders-DFC.json
│   ├── needs-verso.json
│   ├── results-verso.json
│   └── results-DFC.json
├── docs/                          # Documentation
├── config.example.json            # JSON configuration template
├── docker-compose*.yml            # Docker configurations
├── package.json                   # Dependencies and scripts
├── yarn.lock                      # Version lock
└── README.md                      # Documentation entry point
```

---

## Understanding the Code

### File 1: src/index.js

**Role:** Express server and route definition

**Main sections:**
1. **Imports** - Required dependencies
2. **Express initialization** - App configuration
3. **Middleware** - helmet, cors, morgan, json parser
4. **Service initialization** - `OptimizationService` instance
5. **Routes** - Definition /health, /optim, /optimWhithVersoReturn
6. **Server start** - Listen on configured port

**Attention points:**
- All routes use `async/await`
- Systematic error handling with `try/catch`
- Error logging with `console.error()`

**Size:** ~100 lines

---

### File 2: src/optimizationService.js

**Role:** Transformation business logic

**Class:** `OptimizationService`

**Main methods:**

| Method | Lines | Role |
|--------|-------|------|
| `transformDFCtoVerso()` | ~150 | DFC → Verso transformation |
| `callVersoOptimization()` | ~30 | Verso API call |
| `transformVersoToDFC()` | ~200 | Verso → DFC transformation |
| `cleanObject()` | ~20 | Object cleaning utility |

**Helper functions:**
- GPS coordinates extraction
- Time windows extraction
- Data validation

**Attention points:**
- Intensive use of `jsonld` library
- Lots of nested object navigation
- Error case handling (missing coordinates, etc.)

**Size:** ~400 lines

---

### File 3: tests/optimizationService.test.js

**Framework:** Jest

**Structure:**
- Setup / Teardown (beforeEach, afterEach)
- Tests by method (describe blocks)
- Test data (mocks and fixtures)

**Covered tests:**
- DFC → Verso transformation with valid data
- Invalid coordinates handling
- Verso API call (mocked)
- Verso → DFC transformation

**Size:** ~200 lines

---

## Development Workflow

### Standard Development Cycle

```
1. Create feature branch
   ↓
2. Develop in watch mode (docker-compose up)
   ↓
3. Test manually (curl, Postman)
   ↓
4. Write/adjust unit tests
   ↓
5. Verify tests pass (docker-compose -f docker-compose-test.yml up)
   ↓
6. Commit with conventional message
   ↓
7. Push and create Pull Request
```

---

### Development Mode with Docker Compose

**Commands:**

| Action | Command |
|--------|----------|
| **Start in dev** | `docker-compose up` |
| **Run tests** | `docker-compose -f docker-compose-test.yml up` |
| **Stop** | `docker-compose down` |
| **View logs** | `docker-compose logs -f` |

**Environments:**
- `docker-compose.yml` → `yarn dev` (auto-reload with nodemon)
- `docker-compose-test.yml` → `yarn test` (Jest)
- `docker-compose-prod.yml` → `yarn start` (production)

**Usage:**
- Modify code in `src/`
- Save
- Container reloads automatically (dev mode)
- Test your changes

---

### Unit Tests

**With Docker Compose:**
```bash
docker-compose -f docker-compose-test.yml up
```

**Best practices:**
- ✅ Test nominal cases
- ✅ Test error cases
- ✅ Test edge cases (null, undefined, etc.)
- ✅ Mock external dependencies (Verso API)

---

### Manual Tests

**Ensure service is running:**
```bash
docker-compose up -d
```

**With example data:**
```bash
curl -X POST http://localhost:3001/optim \
  -H "Content-Type: application/json" \
  -d @dataset/orders-DFC.json
```

**With your own data:**
1. Create JSON file with your DFC graph
2. Test transformation: `/optimWhithVersoReturn`
3. Test complete optimization: `/optim`

**Stop after tests:**
```bash
docker-compose down
```

---

## Code Conventions

### JavaScript Style

**Indentation:** 2 spaces (no tabs)

**Quotes:** Single quotes `'string'`

**Semicolons:** Yes, always

**Naming:**
- Variables/functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

**Example:**
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

### Comments

**Language:** English for code

**When to comment:**
- ✅ Complex functions (jsdoc)
- ✅ Non-obvious algorithms
- ✅ Temporary workarounds (with TODO)
- ✅ Important attention points

**When NOT to comment:**
- ❌ Obvious code
- ❌ Code repetition in French
- ❌ Old commented-out code (delete instead)

**Example of good comment:**
```javascript
// Extract source coordinates from stock location
// Path: OrderLine → Offer → RealStock → PhysicalPlace → Address
const offer = orderLine['dfc-b:fulfilledBy'];
```

---

### Error Handling

**Standard pattern:**
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Error in riskyOperation:', error);
  throw new Error(`Failed to do X: ${error.message}`);
}
```

**Best practices:**
- ✅ Always catch async errors
- ✅ Log with `console.error()`
- ✅ Rethrow with explicit message
- ✅ Never have empty catch

---

## Adding a Feature

### Recommended Process

#### 1. Understand the Need

**Questions to ask:**
- What problem does this feature solve?
- Is it a real use case?
- Impact on existing?
- Breaking change?

#### 2. Design Solution

**Considerations:**
- Where to place code? (`index.js` vs `optimizationService.js`)
- New method or modify existing?
- Impact on transformations?
- Need for new dependencies?

#### 3. Implement

**Steps:**
1. Create branch `feature/feature-name`
2. Implement code
3. Add necessary logs
4. Test manually

#### 4. Test

**Tests to add:**
- Unit test for new feature
- Non-regression tests (existing still works)
- Test with example data

#### 5. Document

**Documentation to update:**
- README if major feature
- `docs/API-en.md` if endpoint modified
- `docs/ARCHITECTURE-en.md` if architecture impacted
- `docs/CHANGELOG-en.md` mandatory

---

## Debugging

### Debug Strategies

#### 1. Console Logs

**Temporary log addition:**
```javascript
console.log('Debug variable:', JSON.stringify(variable, null, 2));
```

**⚠️ Important:** Remove before committing!

#### 2. Node.js Debugger

**Launch with inspector:**
```bash
node --inspect src/index.js
```

**Connect Chrome DevTools:**
- Open `chrome://inspect`
- Click on Node.js process
- Use breakpoints, watch, etc.

#### 3. Isolated Tests

**Test specific function:**
```bash
yarn test -t "test name"
```

#### 4. Debug Endpoint

**Use `/optimWhithVersoReturn`:**
See DFC → Verso transformation without calling Verso.

---

### Common Problems

#### Server won't start

**Checks:**
- Port 3001 available? (`lsof -i :3001`)
- Valid configuration? (well-formed JSON)
- Node.js version >= 20?

#### Tests fail

**Common causes:**
- Dependencies not up-to-date (`yarn install`)
- Incorrect mocks
- Tests depend on execution order (bad practice)

#### Transformation fails

**Debug:**
1. Check input DFC graph structure
2. Use `/optimWhithVersoReturn` to see generated Verso
3. Compare with `dataset/orders-DFC.json`
4. Check logs for warnings

---

## Dependencies

### Adding a Dependency

**Production:**
```bash
yarn add package-name
```

**Development:**
```bash
yarn add -D package-name
```

**Verify:**
- Package size (avoid heavy packages)
- Last update (avoid abandoned packages)
- Number of transitive dependencies
- Compatible license

---

### Updating Dependencies

**Check available updates:**
```bash
yarn outdated
```

**Update:**
```bash
yarn upgrade package-name
```

**⚠️ Warning:**
- Always test after update
- Read package CHANGELOGs
- Watch for breaking changes

---

## Git and Versioning

### Branches

**Convention:**
- `main` - Stable production
- `develop` - Development (if used)
- `feature/feature-name` - New feature
- `fix/bug-name` - Bug fix
- `docs/subject` - Documentation only

---

### Commits

**Convention (Conventional Commits):**

```
type: short description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Refactoring without functional change
- `test` - Add/modify tests
- `chore` - Maintenance, config, etc.

**Examples:**
```
feat: add vehicle capacity support
fix: handle missing coordinates gracefully
docs: update API examples
refactor: simplify coordinate extraction
```

---

### Pull Requests

**Before creating PR:**
- [ ] Tests pass
- [ ] Code follows conventions
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Clean and atomic commits

**PR Template:**
See [docs/CONTRIBUTING-en.md](CONTRIBUTING-en.md) for complete template

---

## Best Practices

### Code Quality

**Principles:**
- **DRY** (Don't Repeat Yourself) - Factor duplicated code
- **KISS** (Keep It Simple) - Simplicity > cleverness
- **Single Responsibility** - One function = one responsibility
- **Explicit > Implicit** - Clear code > short code

---

### Performance

**Considerations:**
- Don't optimize prematurely
- Profile before optimizing
- Avoid blocking synchronous operations
- Use `async/await` for I/O

**Attention points in project:**
- JSON-LD operations (framing, flattening) can be slow on large graphs
- Verso API call is main bottleneck
- DFC context cache could improve performance

---

### Security

**To do:**
- ✅ Validate user inputs
- ✅ Handle errors without exposing internal details
- ✅ Never log sensitive data
- ✅ Use HTTPS in production

**Not to do:**
- ❌ Commit secrets (API keys, passwords)
- ❌ eval() or Function() with user input
- ❌ Disable validations "for testing"

---

## Developer Resources

### Internal Documentation

- **Architecture:** [docs/ARCHITECTURE-en.md](ARCHITECTURE-en.md)
- **Transformations:** [docs/TRANSFORMATIONS-en.md](TRANSFORMATIONS-en.md)
- **API:** [docs/API-en.md](API-en.md)
- **Contribution:** [docs/CONTRIBUTING-en.md](CONTRIBUTING-en.md)

### External Documentation

**Technologies:**
- Node.js: https://nodejs.org/docs/
- Express.js: https://expressjs.com/
- JSON-LD: https://json-ld.org/
- Jest: https://jestjs.io/

**Standards:**
- DFC Ontology: https://github.com/datafoodconsortium/ontology
- Conventional Commits: https://www.conventionalcommits.org/

---

## Support and Community

**Questions:**
- GitHub Discussions: [Discussions](../../discussions)
- Issues: [GitHub Issues](../../issues)

**Contribution:**
- Read [docs/CONTRIBUTING-en.md](CONTRIBUTING-en.md)
- Propose features via Issues
- Submit Pull Requests

---

**Happy coding! 🚀**

