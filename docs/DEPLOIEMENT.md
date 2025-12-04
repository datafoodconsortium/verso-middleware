# Guide de Déploiement

Guide pour déployer le Verso Middleware en production.

---

## Méthode de Déploiement

### Docker Compose (Requis)

**⚠️ Tous les environnements utilisent Docker Compose**

**📋 Prérequis :**
- Docker 20+
- Docker Compose 1.29+
- Clé API Verso valide
- Réseau Docker `dfc_shared_network`

**🎯 Avantages :**
- Configuration standardisée
- Environnement isolé
- Gestion automatique des dépendances
- Réseau partagé avec autres services DFC
- Redémarrage automatique

---

## Préparer le Déploiement

### 1. Obtenir une Clé API Verso

**Où l'obtenir :**
Contact avec Verso (https://verso-optim.com/)

**Ce dont vous avez besoin :**
- URL de l'API Verso (fournie par Verso)
- Clé d'authentification

**Important :** Cette clé est **confidentielle**, ne jamais la committer dans git.

---

### 2. Préparer la Configuration

Le middleware nécessite 4 paramètres essentiels :

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `VERSO_OPTIM_API_URL` | URL de l'API Verso | `https://api.verso-optim.com/vrp/v1/solve` |
| `VERSO_API_KEY` | Votre clé API Verso | `vh61l1mw1b8...` |
| `CONTEXT_JSON_URL` | URL du contexte DFC | `https://cdn.jsdelivr.net/.../context.json` |
| `JSONLD_BASE` | Base URI pour les IDs | `http://verso-middleware.votre-domaine.com` |

**Deux méthodes de configuration :**
- Fichier JSON (recommandé) : `config.json`
- Variables d'environnement : fichier `.env`

**Référence :** Voir `config.example.json` pour la structure

---

### 3. Préparer l'Infrastructure

**Réseau :**
- Port 3001 disponible (ou personnalisé)
- Accès sortant vers l'API Verso
- Accès sortant vers CDN jsdelivr (pour le contexte DFC)

**Sécurité :**
- Pare-feu configuré
- Certificat SSL/TLS si exposition publique
- Reverse proxy (Nginx recommandé)

---

## Déploiement avec Docker Compose

### Fichiers Docker Compose

| Fichier | Usage | Commande |
|---------|-------|----------|
| `docker-compose.yml` | **Développement** (auto-reload) | `yarn dev` |
| `docker-compose-test.yml` | **Tests** | `yarn test` |
| `docker-compose-prod.yml` | **Production** | `yarn start` |

**Configuration commune :**
- Image : `node:20-slim`
- Port : `3001`
- Configuration : Montée depuis `../secrets/production/config-verso.json`
- Réseau : `dfc_shared_network` (externe, partagé)

---

### Étapes de Déploiement en Production

#### 1. Préparer la Configuration

**Créer le dossier de secrets :**
```
mkdir -p ../secrets/production
```

**Créer le fichier de configuration :**
Copier `config.example.json` vers `../secrets/production/config-verso.json` et renseigner votre clé API Verso.

**Référence :** Voir le fichier `config.example.json` pour la structure complète

#### 2. Créer le Réseau Docker

Si vous avez d'autres services DFC (prototype, etc.), créer un réseau partagé permet la communication inter-services.

Commande disponible dans le README principal.

#### 3. Démarrer le Service

Utiliser Docker Compose avec le fichier de production (`docker-compose-prod.yml`).

**Le service va :**
- Télécharger l'image Node.js
- Installer les dépendances
- Démarrer le serveur sur le port 3001
- Se connecter au réseau Docker

#### 4. Vérifier le Démarrage

**Méthodes de vérification :**
- Consulter les logs Docker
- Tester le endpoint `/health`
- Vérifier les processus Docker

---

### Gestion du Service

**Opérations courantes :**

| Action | Commande |
|--------|----------|
| **Production** | `docker-compose -f docker-compose-prod.yml up -d` |
| **Développement** | `docker-compose up` |
| **Tests** | `docker-compose -f docker-compose-test.yml up` |
| Arrêter | `docker-compose -f docker-compose-prod.yml down` |
| Redémarrer | `docker-compose -f docker-compose-prod.yml restart` |
| Voir les logs | `docker-compose -f docker-compose-prod.yml logs -f` |
| Voir le statut | `docker-compose -f docker-compose-prod.yml ps` |

**Référence :** Documentation officielle Docker Compose

---

## Configuration Avancée

### Reverse Proxy avec Nginx

**Pourquoi un reverse proxy :**
- Terminer le SSL/TLS
- Gérer les timeouts longs
- Load balancing (si plusieurs instances)
- Protection DDoS

**Architecture :**
```
Client → HTTPS (443) → Nginx → HTTP (3001) → Middleware
```

**Configuration Nginx requise :**
- Proxy vers localhost:3001
- Headers X-Forwarded correctement configurés
- Timeout augmenté (120s recommandé)

**Référence :** Templates Nginx disponibles en ligne

---

### SSL/TLS avec Let's Encrypt

**Pour exposer l'API en HTTPS :**

**Outil recommandé :** Certbot

**Étapes :**
1. Installer Certbot
2. Obtenir un certificat pour votre domaine
3. Configurer Nginx pour utiliser le certificat
4. Activer le renouvellement automatique

**Important :** Le domaine doit pointer vers votre serveur (DNS configuré)

**Référence :** Documentation Let's Encrypt

---

### Sécurité

#### Pare-feu

**Ports à ouvrir :**
- 22 (SSH, administration)
- 80 (HTTP, redirection vers HTTPS)
- 443 (HTTPS)

**Ports à NE PAS exposer :**
- 3001 (port du middleware, accessible uniquement via Nginx)

**Référence :** Documentation UFW (Ubuntu) ou firewalld (CentOS)

#### Protection de la Clé API

**Bonnes pratiques :**
- ✅ Stocker dans un fichier externe (`../secrets/`)
- ✅ Permissions restrictives (lecture seule, propriétaire uniquement)
- ✅ Ne jamais committer dans git
- ✅ Utiliser des variables d'environnement si possible

#### Rate Limiting

**État actuel :** Non implémenté par défaut

**Recommandation production :**
Configurer un rate limiting au niveau Nginx ou dans le middleware (express-rate-limit).

**Objectif :**
- Éviter les abus
- Contrôler les coûts API Verso
- Protéger contre les DDoS

**Référence :** Documentation express-rate-limit

---

## Monitoring et Maintenance

### Surveillance du Service

#### Health Check

**Endpoint :** `GET /health`

**À surveiller :**
- Disponibilité (uptime)
- Temps de réponse
- Codes d'erreur

**Outils recommandés :**
- UptimeRobot (gratuit)
- Pingdom
- Monitoring intégré à votre hébergeur

#### Logs

**Logs applicatifs :**
- **Docker :** Logs accessibles via Docker Compose
- **PM2 :** Logs accessibles via commandes PM2

**Que surveiller :**
- Erreurs 500
- Warnings sur coordonnées invalides
- Erreurs API Verso
- Timeouts

**Rotation des logs :** Configurer une rotation pour éviter de saturer le disque

---

### Mise à Jour

**Processus recommandé :**

1. **Sauvegarder la configuration actuelle**
2. **Récupérer la nouvelle version** (git pull ou nouvelle archive)
3. **Installer les dépendances** (au cas où il y en a de nouvelles)
4. **Redémarrer le service**
5. **Vérifier** que tout fonctionne

**Docker :** Rebuild l'image et redémarrer le conteneur

**PM2 :** Redémarrer le processus

**Important :** Consulter le [CHANGELOG](CHANGELOG.md) avant toute mise à jour (breaking changes ?)

---

### Backup

**Éléments à sauvegarder :**
- Fichier de configuration (`config.json` ou `.env`)
- Logs (si analyse nécessaire)

**Éléments non critiques :**
- Le code (récupérable depuis git)
- Les dépendances Node.js (réinstallables)

**Attention :** Ne pas sauvegarder la clé API Verso en clair sur un système non sécurisé.

---

## Troubleshooting

### Le Service Ne Démarre Pas

**Vérifications :**
1. Configuration valide (JSON bien formé)
2. Clé API Verso présente
3. Port 3001 disponible
4. Node.js version correcte (20+)

**Consulter :** Les logs d'erreur pour le détail

---

### Erreurs d'Optimisation

**Si toutes les requêtes échouent :**

**Causes possibles :**
- Clé API Verso invalide ou expirée
- Service Verso indisponible
- Problème réseau (firewall bloque l'accès à Verso)

**Actions :**
1. Tester la clé API manuellement (curl vers Verso)
2. Vérifier les logs du middleware
3. Contacter Verso si problème persistant

---

### Performances Dégradées

**Symptômes :** Temps de réponse très longs

**Causes possibles :**
- Service Verso surchargé
- Trop de commandes dans une seule requête
- Serveur sous-dimensionné

**Solutions :**
- Réduire le nombre de commandes par requête
- Augmenter les ressources serveur
- Implémenter un système de queue

---

## Checklist de Déploiement

Avant de mettre en production, vérifier :

- [ ] Node.js 20+ installé (ou Docker)
- [ ] Clé API Verso obtenue et configurée
- [ ] Configuration créée et validée
- [ ] Service démarre correctement
- [ ] Health check répond
- [ ] Test avec données d'exemple réussi
- [ ] Reverse proxy configuré (si nécessaire)
- [ ] SSL/HTTPS activé (si exposition publique)
- [ ] Pare-feu configuré
- [ ] Monitoring configuré
- [ ] Logs accessibles et rotation configurée
- [ ] Procédure de backup définie
- [ ] Documentation d'exploitation écrite

---

## Support et Ressources

### Documentation

- **Configuration :** `config.example.json`
- **Architecture :** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **API :** [docs/API.md](API.md)

### Communauté

- **Issues :** [GitHub Issues](../../issues)
- **Discussions :** [GitHub Discussions](../../discussions)

### Fournisseurs

- **Verso :** https://verso-optim.com/
- **DFC :** https://datafoodconsortium.org/
