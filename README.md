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
# Renseigner GOOGLE_CLIENT_IDS ou les variables par plateforme.
GOOGLE_CLIENT_IDS=
GOOGLE_WEB_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
# console | expo | firebase
NOTIFICATION_PROVIDER=console
FIREBASE_SERVICE_ACCOUNT_JSON=
# photon | mapbox | mock
PLACES_PROVIDER=photon
PHOTON_BASE_URL=https://photon.komoot.io
PHOTON_LANGUAGE=fr
# Requis uniquement avec PLACES_PROVIDER=mapbox
MAPBOX_ACCESS_TOKEN=
```

Mobile, fichier `apps/mobile/.env` :

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_PLACES_PROVIDER=api
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
```

`NOTIFICATION_PROVIDER=console` utilise un adapter mock. `NOTIFICATION_PROVIDER=expo` envoie les notifications via Expo Push Service, adapté aux builds iOS/TestFlight Expo. `NOTIFICATION_PROVIDER=firebase` active Firebase Admin via `FIREBASE_SERVICE_ACCOUNT_JSON` ou les credentials par défaut du runtime.

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

## Déploiement iOS TestFlight

L'app mobile utilise EAS depuis `apps/mobile`. Les commandes EAS doivent être lancées depuis ce dossier :

```bash
cd apps/mobile
```

Pré-requis :

- Un compte Apple Developer actif.
- Une app créée dans App Store Connect avec le bundle identifier `com.lagrange.mates`.
- Un compte Expo connecté via EAS CLI.
- Une API accessible publiquement en HTTPS pour `EXPO_PUBLIC_API_URL`.

Configurer EAS et les variables de production :

```bash
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value https://api.example.com --environment production --visibility plaintext
pnpm dlx eas-cli@latest env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value <ios-client-id> --environment production --visibility plaintext
pnpm dlx eas-cli@latest env:create --name EXPO_PUBLIC_PLACES_PROVIDER --value api --environment production --visibility plaintext
```

Si Mapbox est appelé directement depuis le mobile en production, ajouter aussi :

```bash
pnpm dlx eas-cli@latest env:create --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value <mapbox-token> --environment production --visibility sensitive
```

Construire l'archive iOS puis l'envoyer sur App Store Connect/TestFlight :

```bash
pnpm dlx eas-cli@latest build --platform ios --profile production
pnpm dlx eas-cli@latest submit --platform ios --profile production --latest
```

Lors du premier build, laisser EAS gérer les certificats et profils Apple si tu n'as pas déjà tes propres credentials iOS. Après traitement par Apple, ouvrir App Store Connect > Mates > TestFlight, ajouter le build à un groupe de testeurs internes, puis inviter les testeurs.

## Tests

```bash
pnpm --filter @mates/api test
```

Les tests unitaires couvrent la génération du `publicTag`, le flux Google avec profil à compléter, la contrainte d’invitation dans la journée courante, les réponses oui/non avec retard, et l’impossibilité de répondre à une invitation non reçue.

## Architecture

Le backend sépare strictement :

- `domain/` : règles métier pures, erreurs métier, génération du `publicTag`, règles d’invitation.
- `application/use-cases/` : orchestration métier. Les use cases ne dépendent que de ports.
- `application/ports/` : interfaces repositories, JWT, hashing, notifications, lieux.
- `infrastructure/` : Drizzle/PostgreSQL, bcrypt, jose JWT, Firebase Cloud Messaging, Photon/Mapbox/mock.
- `http/` : Hono, middleware JWT, validation Zod, sérialisation HTTP.

Les routes Hono valident les entrées puis appellent un use case. Elles ne contiennent pas de logique métier.

Le mobile suit la même séparation :

- `domain/` : types et règles locales sans Expo.
- `application/` : ports côté client, notamment la recherche de lieux.
- `infrastructure/` : client API typé, storage Zustand, Expo Notifications, adapters API/Mapbox/mock.
- `presentation/` : composants, hooks Query/Zustand, écrans.
- `app/` : routes Expo Router fines.

Les appels HTTP sont typés via les schémas Zod de `packages/shared`. Les lieux utilisent l’API par défaut via `EXPO_PUBLIC_PLACES_PROVIDER=api`. Côté API, `PLACES_PROVIDER=photon` utilise l’API publique Photon/Komoot sans clé. Ce service est gratuit mais soumis au fair use, donc l’autocomplete mobile est débouncé. `PLACES_PROVIDER=mock` force les résultats locaux, et `PLACES_PROVIDER=mapbox` utilise Mapbox avec `MAPBOX_ACCESS_TOKEN`. Le mobile peut encore appeler Mapbox directement avec `EXPO_PUBLIC_PLACES_PROVIDER=mapbox` et `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.
