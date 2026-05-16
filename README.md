# Mates

Monorepo pnpm pour une app mobile iOS/Android React Native Expo et une API Hono/PostgreSQL en architecture propre.

## Structure

```txt
apps/
  api/      Hono + TypeScript + Drizzle + PostgreSQL + JWT + notifications
  mobile/   Expo + Expo Router + Zustand + TanStack Query
packages/
  shared/   DTO, schémas Zod et types partagés
```

## Installation

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
pnpm --filter @mates/shared build
```

## Variables d’environnement

API, fichier `apps/api/.env` :

```bash
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mates
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN_DAYS=30
NOTIFICATION_PROVIDER=console
FIREBASE_SERVICE_ACCOUNT_JSON=
MAPBOX_ACCESS_TOKEN=
```

Mobile, fichier `apps/mobile/.env` :

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_PLACES_PROVIDER=mock
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
```

`NOTIFICATION_PROVIDER=console` utilise un adapter mock. `NOTIFICATION_PROVIDER=firebase` active Firebase Admin via `FIREBASE_SERVICE_ACCOUNT_JSON` ou les credentials par défaut du runtime.

## Base de données

Créer une base PostgreSQL puis lancer :

```bash
pnpm db:migrate
```

Le schéma Drizzle est dans `apps/api/src/infrastructure/db/schema.ts` et la migration initiale dans `apps/api/migrations/0000_initial.sql`.

## Lancement

API :

```bash
pnpm dev:api
```

Mobile :

```bash
pnpm dev:mobile
```

Sur simulateur Android, remplacer `EXPO_PUBLIC_API_URL=http://localhost:3000` par `http://10.0.2.2:3000` si l’API tourne sur la machine hôte.

## Tests

```bash
pnpm --filter @mates/api test
```

Les tests unitaires couvrent la génération du `publicTag`, la contrainte d’invitation dans la journée courante, les réponses oui/non avec retard, et l’impossibilité de répondre à une invitation non reçue.

## Architecture

Le backend sépare strictement :

- `domain/` : règles métier pures, erreurs métier, génération du `publicTag`, règles d’invitation.
- `application/use-cases/` : orchestration métier. Les use cases ne dépendent que de ports.
- `application/ports/` : interfaces repositories, JWT, hashing, notifications, lieux.
- `infrastructure/` : Drizzle/PostgreSQL, bcrypt, jose JWT, Firebase Cloud Messaging, Mapbox/mock.
- `http/` : Hono, middleware JWT, validation Zod, sérialisation HTTP.

Les routes Hono valident les entrées puis appellent un use case. Elles ne contiennent pas de logique métier.

Le mobile suit la même séparation :

- `domain/` : types et règles locales sans Expo.
- `application/` : ports côté client, notamment la recherche de lieux.
- `infrastructure/` : client API typé, storage Zustand, Expo Notifications, adapters Mapbox/mock.
- `presentation/` : composants, hooks Query/Zustand, écrans.
- `app/` : routes Expo Router fines.

Les appels HTTP sont typés via les schémas Zod de `packages/shared`. Les lieux utilisent `MockPlaceSearchProvider` par défaut et `MapboxPlaceSearchProvider` avec `EXPO_PUBLIC_PLACES_PROVIDER=mapbox`.
