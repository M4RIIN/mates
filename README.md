# Mates

Monorepo pnpm pour une app mobile iOS/Android React Native Expo SDK 57 et une API Hono/PostgreSQL en architecture propre.

## Suivi produit

La [fiche de suivi des fonctionnalités et améliorations produit](docs/product-backlog.md) regroupe les tickets UX, produit, rétention, acquisition et mesure, avec leurs priorités et critères de validation.

## Fenêtre de coordination

Une sortie est « À venir » avant l’heure prévue, « En cours » pendant les deux heures suivantes, puis « Terminée ». Pendant cette fenêtre, les réponses, retards et itinéraires restent accessibles ; une annulation ferme immédiatement la coordination. La règle partagée s’applique au mobile, au web et à l’API, sans migration de données. Une sortie à 23 h 30 reste active jusqu’à 1 h 30 et ne bloque plus la création après cette fermeture. Les arrivées estimées correspondent à l’heure du rendez-vous plus le retard déclaré ; les invités web conservent leurs réponses oui/non sans compte.

## Structure

```txt
apps/
  api/      Hono + TypeScript + Drizzle + PostgreSQL + JWT + notifications
  mobile/   Expo + Expo Router + Zustand + TanStack Query
  landing/  Site de présentation statique
packages/
  shared/   DTO, schémas Zod et types partagés
```

## Installation

Pré-requis : Node.js 22 et PostgreSQL en cours d'exécution (port 5432 par défaut).

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
pnpm --filter @mates/shared build
```

## Variables d’environnement

Copier les exemples avant le premier lancement :

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Dans `apps/api/.env`, remplacer `JWT_SECRET` par un secret aléatoire (générable avec `openssl rand -hex 48`). Pour démarrer sans configuration OAuth Google, définir `AUTH_GOOGLE_ENABLED=false` et conserver `AUTH_PASSWORD_ENABLED=true`. Le mobile utilise alors la connexion et l'inscription par mot de passe avec `EXPO_PUBLIC_AUTH_PASSWORD_ENABLED=true`. Pour activer Google, renseigner les identifiants OAuth dans les deux fichiers et remettre `AUTH_GOOGLE_ENABLED=true`.

API, fichier `apps/api/.env` :

```bash
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mates
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN_DAYS=30
AUTH_PASSWORD_ENABLED=true
AUTH_GOOGLE_ENABLED=false
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
EXPO_PUBLIC_AUTH_PASSWORD_ENABLED=true
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_PLACES_PROVIDER=api
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
```

`NOTIFICATION_PROVIDER=console` utilise un adapter mock. `NOTIFICATION_PROVIDER=expo` envoie les notifications via Expo Push Service, adapté aux builds iOS/TestFlight Expo. `NOTIFICATION_PROVIDER=firebase` active Firebase Admin via `FIREBASE_SERVICE_ACCOUNT_JSON` ou les credentials par défaut du runtime.

## Base de données

Créer une base PostgreSQL si elle n'existe pas (`createdb mates` avec une installation locale), puis adapter `DATABASE_URL` à ses identifiants. Au démarrage de l’API, en développement comme en production, les migrations s’exécutent automatiquement avant l’ouverture du serveur HTTP. Drizzle conserve leur historique dans `drizzle.__drizzle_migrations` et ignore celles déjà appliquées. Un verrou PostgreSQL sérialise les migrations si plusieurs instances démarrent en même temps. En cas d’échec, l’API ne démarre pas et termine avec un code de sortie 1.

Le dossier `apps/api/migrations` (SQL et `meta/_journal.json`) doit être livré avec `apps/api/dist` en production. Le compte PostgreSQL utilisé doit pouvoir appliquer les changements de schéma. La commande manuelle reste disponible :

```bash
pnpm db:migrate
```

Le schéma Drizzle est dans `apps/api/src/infrastructure/db/schema.ts` et la migration initiale dans `apps/api/migrations/0000_initial.sql`.

## Lancement

API :

```bash
pnpm dev:api
```

Mobile, dans un second terminal :

```bash
pnpm dev:mobile
```

Vérifier l'API sur `http://localhost:3000/health` (réponse attendue : `{"ok":true}`). `pnpm dev:mobile` cible Expo Go : utiliser une version compatible SDK 57 et scanner le QR code. Dans le terminal Expo, appuyer sur `w` pour le navigateur, `i` pour le simulateur iOS ou `a` pour Android.

Les Live Activities (`expo-widgets`) et les notifications push sont désactivées par l'app dans Expo Go. Elles restent disponibles dans les builds natifs. Pour utiliser un build de développement installé sur l'appareil, lancer `pnpm --filter @mates/mobile start:dev-client`. Après la migration vers SDK 57, reconstruire les anciens builds de développement.

Pour lancer directement la version web :

```bash
pnpm --filter @mates/shared build
pnpm --filter @mates/mobile start --web
```

Sur un téléphone physique, remplacer `localhost` dans `apps/mobile/.env` par l'adresse IP locale de l'ordinateur et connecter les deux appareils au même réseau Wi-Fi.

Sur simulateur Android, remplacer `EXPO_PUBLIC_API_URL=http://localhost:3000` par `http://10.0.2.2:3000` si l’API tourne sur la machine hôte.

Le site de présentation se lance séparément avec `pnpm dev:landing`, sur `http://localhost:4321`.

## Liens de profil et parcours web

Profil → Partager mon profil affiche un QR code et permet de partager ou copier le lien. L’identifiant reste consultable et copiable. Sur Expo et natif, `EXPO_PUBLIC_PROFILE_SHARE_BASE_URL` définit le domaine des liens ; sans valeur, il reprend `EXPO_PUBLIC_API_URL`. Sur le web servi par l’API sous `/app`, les liens utilisent automatiquement le domaine courant. Les liens prennent la forme `/u/pseudo%231234` : le `#` doit être encodé dans l’URL.

L’API sert directement une page HTML publique sur `/u/:tag`, avec uniquement le pseudo et l’identifiant vérifiés en base. Aucun compte ni aucune demande d’amitié ne sont créés à l’ouverture. La page propose `mates://u/:tag` pour un build natif installé ou `/app/u/:tag` pour continuer dans le navigateur. Sur web, connexion et inscription conservent cette destination ; l’envoi d’une demande exige un clic explicite et l’amitié exige l’acceptation du destinataire.

`pnpm build:api` compile l’API et exporte l’application web sous `/app` dans `apps/api/public/app`. Le build nécessite les dépendances du workspace mobile et du package partagé, donc installer le workspace complet avant de construire l’API. Livrer **`apps/api/public/app`**, **`apps/api/dist`** et **`apps/api/migrations`** ensemble, puis utiliser `pnpm start:api`. Les routes et fichiers web sont servis par Hono ; aucun hébergement de landing ni proxy supplémentaire n’est nécessaire.

Le bundle web exporté par le build API utilise le domaine courant à l’exécution pour ses appels API et ses liens de profil : ouvrir `http://192.168.1.45:3000/app/u/test%235157` appelle `http://192.168.1.45:3000/users/search`, tandis que le même bundle servi par Railway appelle Railway. Il ne force aucune URL de production. `EXPO_PUBLIC_API_HOSTED_WEB=true` est un marqueur interne ajouté par le script d’export API ; ne pas l’activer dans le développement Expo séparé. Pour Expo et les builds natifs, `EXPO_PUBLIC_API_URL` conserve son rôle habituel et doit pointer vers l’API locale accessible en développement. Les autres variables Expo restent intégrées au bundle et nécessitent un nouveau build après modification.

Redéployer Railway après ces changements et reconstruire les apps natives pour `expo-clipboard`. Vérifier le scan du QR code et l’ouverture de `mates://` sur iOS/Android. Les liens HTTPS ouvrent la page publique ; l’ouverture native se fait par le bouton dédié, sans association Universal Links/App Links.

## Déploiement iOS TestFlight

L'app mobile utilise EAS depuis `apps/mobile`. Les commandes EAS doivent être lancées depuis ce dossier :

Pour un build déclenché depuis l’intégration GitHub dans Expo, configurer **Base directory = `apps/mobile`**. La racine du workspace ne constitue pas une seconde application Expo : sa configuration refuse désormais explicitement un lancement depuis le mauvais dossier. Le point d’entrée mobile est `expo-router/entry` dans `apps/mobile/package.json`. Les fichiers `app.json` et `eas.json` de l’application sont ceux d’`apps/mobile`.

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

## Guide de première connexion

Après connexion, un guide flottant présente le fonctionnement de Mates, le tag public, les amis, les groupes et les invitations. Le compte conserve `onboarding_completed_at` en base quand le guide est terminé ou passé ; une fermeture de l'app avant validation laisse le guide disponible à la prochaine ouverture. La migration `0007_user_onboarding.sql` ajoute ce champ et s’applique automatiquement au prochain démarrage de l’API.

## Tests

```bash
pnpm --filter @mates/api test
```

Les tests unitaires couvrent la génération du `publicTag`, le flux Google avec profil à compléter, la contrainte d’invitation dans la journée courante, les réponses oui/non avec retard, et l’impossibilité de répondre à une invitation non reçue.

Les tests d’intégration des migrations nécessitent `TEST_DATABASE_URL` vers un serveur PostgreSQL de test autorisant la création de bases. Ils créent et suppriment des bases temporaires pour vérifier la mise à niveau, le redémarrage, les démarrages simultanés et la récupération après erreur. Sans cette variable, ces tests sont ignorés.

### Connexion Apple sur iOS

La connexion native Apple est proposée à côté de Google sur iPhone et iPad, lorsque le service est disponible sur l'appareil. La première connexion demande uniquement un pseudo Mates : aucun scope de nom ou d'e-mail n'est demandé à Apple et aucune adresse réelle ou masquée n'est enregistrée. Les comptes Google et Apple restent distincts ; aucune association automatique par e-mail n'est effectuée.

Configuration avant de livrer le nouveau build :

1. Dans Apple Developer → Certificates, Identifiers & Profiles → Identifiers, sélectionner `com.lagrange.mates`, activer **Sign in with Apple** et le configurer comme **Primary App ID**.
2. Dans **Keys**, créer une clé **Sign in with Apple** associée à cet App ID, télécharger le fichier `.p8` et relever son **Key ID**, ainsi que le **Team ID** du compte développeur. Le parcours iOS natif n'a pas besoin de Service ID ou d'URL de redirection web.
3. Configurer les variables suivantes sur le serveur API, puis le redéployer avec le dossier `migrations`. La migration `0009_apple_auth.sql` est appliquée automatiquement au démarrage. Ne placer aucun de ces secrets dans une variable `EXPO_PUBLIC_*` ou dans le dépôt.

```dotenv
AUTH_APPLE_ENABLED=true
APPLE_CLIENT_ID=com.lagrange.mates
APPLE_TEAM_ID=<Team ID Apple>
APPLE_KEY_ID=<Key ID de la clé Sign in with Apple>
APPLE_PRIVATE_KEY=<contenu du fichier .p8, avec des sauts de ligne ou des séparateurs littéraux \n>
APPLE_TOKEN_ENCRYPTION_SECRET=<secret aléatoire stable d'au moins 32 octets>
```

Conserver `APPLE_TOKEN_ENCRYPTION_SECRET` dans le gestionnaire de secrets et les sauvegardes : changer cette valeur empêche de déchiffrer les jetons Apple déjà enregistrés pour la révocation. La clé `.p8` sert à générer les secrets clients Apple côté serveur. `AUTH_APPLE_ENABLED` est désactivé par défaut pour permettre le démarrage local sans ces identifiants ; il doit être activé en production avant de soumettre le build proposant Apple.

4. Côté mobile, `EXPO_PUBLIC_AUTH_APPLE_ENABLED=true` est le comportement par défaut. `app.json` contient le plugin `expo-apple-authentication` et `ios.usesAppleSignIn=true`. Reconstruire le client natif et le build TestFlight avec EAS ; une mise à jour JavaScript seule ne suffit pas. Utiliser la configuration de `apps/mobile`, dont le bundle ID est `com.lagrange.mates`.
5. Tester sur un iPhone et un iPad réels : première connexion, choix du pseudo, reconnexion après déconnexion, annulation de la fenêtre Apple, lien partagé conservé après connexion et **Profil → Supprimer mon compte**. Le bouton Apple est réservé à iOS ; Google et la connexion par mot de passe restent disponibles sur les autres plateformes.

Le serveur émet un challenge valable 5 minutes, vérifie la signature RS256 Apple, l'émetteur, l'audience, l'expiration et le nonce, puis échange le code d'autorisation à usage unique. Le jeton de finalisation du profil expire après 15 minutes et utilise une clé et une audience distinctes des sessions Mates. Les refresh tokens Apple sont chiffrés avec AES-GCM avant stockage. La suppression de compte révoque le jeton auprès d'Apple avant d'effacer le compte et ses données liées ; si Apple est indisponible, l'utilisateur peut réessayer. Les sessions d'un compte supprimé sont refusées côté API.

Références : [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/), [création de clé Apple](https://developer.apple.com/help/account/capabilities/create-a-sign-in-with-apple-private-key), [suppression et révocation](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).

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
