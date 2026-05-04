# 🏭 LogisTMA Factory

> Plateforme SaaS permettant à des entreprises de livraison de créer et déployer leur propre Mini App Telegram en moins de 5 minutes.

---

## Architecture

```
logistma-factory/
├── factory-backend/     # API Express + Bot Telegraf + SQLite
│   ├── src/
│   │   ├── api/         # Routes REST (deploy, status, tenants, billing)
│   │   ├── bot/         # Bot Telegram factory (onboarding conversationnel)
│   │   ├── db/          # SQLite schema + queries
│   │   ├── services/    # Provisioner, Deployer, BillingService, ThemeBuilder, DomainManager
│   │   └── server.js    # Entry point Express
│   └── package.json
│
└── factory-frontend/    # React 18 + Vite + Framer Motion
    ├── src/
    │   ├── steps/       # 6 étapes du wizard
    │   ├── components/  # UI (composants réutilisables) + Dashboard
    │   ├── hooks/       # useDeployment, useTelegramUser
    │   └── lib/         # api.js (client API), tokens.js (design system)
    └── package.json
```

---

## Démarrage rapide

### 1. Backend

```bash
cd factory-backend
cp .env.example .env
# Remplir les variables dans .env
npm install
npm run dev
# → http://localhost:3001
```

### 2. Frontend

```bash
cd factory-frontend
cp .env.example .env.local
# VITE_API_URL=http://localhost:3001
npm install
npm run dev
# → http://localhost:5173
```

---

## Hébergement (Production)

| Composant          | Service         | Coût estimé       |
|--------------------|-----------------|-------------------|
| Factory Backend    | **Railway**     | ~5$/mois          |
| Factory Frontend   | **Vercel**      | Gratuit            |
| DB SQLite          | Volume Railway  | Inclus            |
| DNS tenants        | **Cloudflare**  | ~10$/an           |
| Paiements          | **Stripe**      | 0% + 1.4% / tx   |

### Déployer le backend sur Railway

```bash
# Installer Railway CLI
npm install -g @railway/cli
railway login

cd factory-backend
railway init
railway up

# Configurer les variables d'env dans le dashboard Railway
# (toutes les variables du .env.example)
```

### Déployer le frontend sur Vercel

```bash
npm install -g vercel
cd factory-frontend
vercel --prod

# Variables d'env à configurer dans Vercel:
# VITE_API_URL=https://votre-backend.up.railway.app
```

---

## Plans et pricing

| Plan        | Prix     | Livreurs | Stops/mois |
|-------------|----------|----------|------------|
| Starter     | 29€/mois | 1        | 50         |
| Pro         | 79€/mois | 5        | 500        |
| Enterprise  | 199€/mois| Illimité | Illimité   |

Tous les plans incluent un **essai gratuit de 14 jours**.

---

## Variables d'environnement critiques

| Variable           | Description                          |
|--------------------|--------------------------------------|
| `ENCRYPTION_KEY`   | Clé AES-256 (32 bytes hex) pour les bot tokens |
| `FACTORY_BOT_TOKEN`| Token du bot factory (@BotFather)    |
| `STRIPE_SECRET_KEY`| Clé secrète Stripe live              |
| `RAILWAY_API_TOKEN`| Token API Railway pour les déploiements |
| `CLOUDFLARE_ZONE_ID`| Zone ID du domaine logistma.app     |

---

## Flux de déploiement d'un tenant

```
User → Factory Frontend → POST /deploy → Backend
                                            ↓
                                    generateId
                                    validateBot (API Telegram)
                                    createTenant (SQLite)
                                    cloneTemplate (GitHub)
                                    injectConfig (env vars)
                                    buildFrontend (npm build)
                                    deployRailway (GraphQL API)
                                    configureDNS (Cloudflare CNAME)
                                    setWebhook (Telegram API)
                                    runTests (health checks)
                                    notify (message Telegram)
                                            ↓
                                  Frontend polls /status/:id
                                  every 2s until success/error
```

---

## Sécurité

- **Bot tokens**: Chiffrés AES-256-GCM avec IV aléatoire avant stockage
- **Auth Telegram**: HMAC-SHA256 sur l'init data WebApp
- **Rate limiting**: 3 déploiements/heure/IP
- **Isolation**: Chaque tenant = projet Railway séparé + SQLite séparé
- **Webhook Stripe**: Signature vérifiée avant traitement

---

## Support

- Email: support@logistma.app
- Telegram: @LogisTMASupport
