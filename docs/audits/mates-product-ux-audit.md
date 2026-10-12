# Audit produit, UX/UI et fonctionnel de Mates

Date : 11 octobre 2026. Périmètre : état du répertoire de travail, y compris modifications locales et fichiers non suivis. Analyse du mobile Expo/React Native, des contrats partagés et de l’API. Aucun fichier applicatif modifié ; aucun build, lint, test automatisé ou installation exécuté.

## 1. Résumé exécutif

**Mates doit rendre immédiatement consultable une fiche fiable : où, quand, qui vient, et quelle arrivée est estimée. WhatsApp peut rester le canal de diffusion.** Le bénéfice n’est pas une nouvelle discussion, mais l’absence de recompte des réponses et de recherche du dernier correctif dans les messages.

Le socle existe : lieu recherché ou libre, heure, destinataires explicites, oui/non, retard déclaré, compteurs organisateur, annulation, notifications, liens révocables et réponse web sans compte. Le parcours invité sans installation est déjà codé : il faut le rendre évident, pas le proposer comme une fonctionnalité absente.

Trois freins dominent :

1. **Le premier bénéfice coûte trop d’effort.** Le guide enseigne identifiants, amis, groupes et capot, alors que créer une sortie partageable ne nécessite aucun ami Mates. L’envoi ajoute un glissement et un maintien de 1,15 seconde ; le partage requiert encore la création du lien après la sortie.
2. **La coordination renvoie encore vers les messages.** Dès l’heure prévue, le mobile bloque réponses et retards, masque les actions de transport du destinataire et range la sortie parmi les passées ; le web ferme également les réponses. L’invité ne voit pas les participants et l’organisateur ne peut pas corriger lieu/heure.
3. **La référence commune manque de garanties de fiabilité.** Les réponses peuvent devenir périmées après une déconnexion et certains échecs techniques arrivent après l’écriture effective. Les courses concurrentes sont des risques supplémentaires à vérifier.

Ce sont des observations structurelles du code. Les effets sur conversion, confiance et retour vers WhatsApp sont des **hypothèses**, sans mesure utilisateur dans cet audit. Aucune panne P0 en production n’est démontrée. Les risques de concurrence décrits plus bas sont inférés de l’ordonnancement du code, sans reproduction.

### Méthode et limites

- Cinq angles : Social UX, parcours, produit/fonctionnalités, UI mobile, cas limites/QA ; revue critique après leur consolidation.
- **O — Observation** : comportement, contrat, protection ou absence dans les sources inspectées. **H — Hypothèse** : conséquence probable à valider. **R — Recommandation** : changement proposé, jamais présenté comme déjà réalisé.
- Captures existantes inspectées : `docs/assets/ux03-creation.jpg`, `ux07-repondre.jpg`, `ux06-organisateur.jpg`, `ux02-accueil.jpg`, `ux08-lisibilite.jpg`, `pr02-web-response-320.png`. Ce sont des captures historiques, pas une session de la version actuelle. La création photographiée présente notamment un ancien verrou « LOCK » ; le code actuel utilise un capot. La capture web montre une barre de navigation, mais `_layout.tsx:66` la réserve aux sessions authentifiées : ne pas conclure qu’elle apparaît chez tous les invités anonymes.
- Aucun rendu actuel sur appareil ni essai avec comptes réels. Clavier, zones sûres, grandes polices, lecteurs d’écran, carte native, notifications et Live Activities restent à vérifier manuellement.
- `docs/product-backlog.md` décrit des travaux et vérifications antérieurs ; il ne prouve ni fonctionnement actuel ni validation dans cet audit. Les états d’erreur/réponse/annulation et plusieurs améliorations visuelles sont déjà présents ; ils ne sont pas réclamés une seconde fois.

Priorités : **P0** blocage critique démontré ; **P1** cœur de coordination ou confiance ; **P2** friction et lisibilité ; **P3** besoin secondaire à valider. Efforts relatifs : **S** changement local, **M** plusieurs couches, **L** règles métier et propagation. Ce ne sont pas des engagements calendaires.

## 2. Cartographie des fonctionnalités existantes

Les chemins ci-dessous sont relatifs à la racine du dépôt. Ils désignent les fichiers actuels, avec lignes repères.

| Fonction | État observé et preuve | Valeur face à une organisation dans WhatsApp | Verdict produit |
|---|---|---|---|
| Authentification | Google et pseudo/mot de passe selon configuration, complément de pseudo, session persistée ; `apps/mobile/src/presentation/screens/LoginScreen.tsx:124,177,299`, `apps/mobile/app/index.tsx:10` | Support d’identité pour organisateurs réguliers ; aucun gain direct pour RSVP | Conserver ; ne pas l’imposer au répondant par lien |
| Accueil Sorties | À répondre, prochaines sorties, filtres, historique ; `apps/mobile/src/presentation/screens/OutingsScreen.tsx:23,47,97` | Invitations structurées retrouvables sans relire un fil | Conserver et améliorer l’état en cours |
| Guide | Six étapes, fermeture sauvegardée côté serveur ; `apps/mobile/src/presentation/components/OnboardingGuide.tsx:10,56,108` | Explique le produit mais ajoute un effort avant sa valeur | Simplifier |
| Amis et profil partagé | Tag, partage/QR de profil, demande et acceptation ; `apps/mobile/src/presentation/screens/AddFriendScreen.tsx:19`, `FriendsScreen.tsx:47`, `ProfileScreen.tsx:1`, `PublicProfileScreen.tsx:1` | Destinataires réutilisables après adoption ; reconstruction préalable coûteuse | Conserver comme chemin facultatif |
| Groupes | Listes personnelles de destinataires, création et modification des membres ; `apps/mobile/src/presentation/components/AudiencePicker.tsx:39`, `apps/api/src/http/routes/friend-routes.ts:29` | Présélection des habitués, pas un espace de discussion partagé | Conserver, présenter comme listes d’invités |
| Création | Lieu + heure aujourd’hui + 1–100 amis sélectionnés, ou lien seul ; `apps/mobile/src/presentation/screens/HomeScreen.tsx:161,178,315,321` | Plan structuré et réponse consolidée | Améliorer le partage, simplifier l’envoi |
| Recherche de lieu | Debounce 350 ms dès trois caractères, huit résultats demandés, six affichés, pays obtenu via locale/localisation ; saisie libre de secours ; `usePlaceSearch.ts:9,15,39` sous `apps/mobile/src/presentation/hooks/`, `HomeScreen.tsx:284,294` | Destination associée au plan, adresse conservée | Conserver ; réduire les permissions et expliciter zéro résultat |
| Limites temporelles | Aujourd’hui uniquement ; un rendez-vous non annulé de la journée bloque le suivant ; `apps/api/src/domain/invitation/invitation-rules.ts:6`, `apps/api/src/application/use-cases/send-invitation-to-friends.use-case.ts:43`, `apps/api/src/infrastructure/repositories/postgres-invitation.repository.ts:247` | Positionnement spontané simple, mais pas de gain intrinsèque à la restriction | Clarifier ; réexaminer sur preuve d’usage |
| RSVP connecté | Oui/non modifiable avant l’heure ; sauvegarde visible, verrou local, erreurs ; `apps/mobile/src/presentation/screens/RespondInvitationScreen.tsx:66,99,104` | Statut par personne sans recompte des messages | Conserver et prolonger la coordination |
| Retard déclaré | Après oui, entier 0–1440 minutes ; 0 retire le retard ; `RespondInvitationScreen.tsx:89,112` | Dernière estimation rattachée à la personne | Améliorer ; aucune arrivée effective ni ETA de trajet automatique |
| Participants organisateur | Compteurs et liste interne + réponses web ; `apps/mobile/src/presentation/screens/CreatedInvitationDetailScreen.tsx:27,97,118,123` | Répond à « qui vient ? » pour l’organisateur | Conserver ; étendre de façon autorisée aux invités |
| Invitation publique | Lien secret, activation, adresse masquée par défaut, révocation ; prénom et oui/non sans compte ; `InvitationSharePanel.tsx:25,36,46` sous `apps/mobile/src/presentation/components/`, `SharedInvitationScreen.tsx:48,94` sous `screens/` | Utiliser son groupe existant pour diffuser, centraliser les réponses ailleurs | Améliorer ; déjà implémenté |
| Annulation | Confirmation, contrôle organisateur, conservation des réponses, push aux comptes destinataires ; `CreatedInvitationDetailScreen.tsx:53,134`, `apps/api/src/application/use-cases/cancel-invitation.use-case.ts:29,44` | État unique annulé, pas de recherche du message d’annulation | Conserver ; fiabiliser la propagation |
| Temps réel et push | WebSocket avec reconnexion, invalidation à réception ; push création/annulation/demande d’ami ; `apps/mobile/src/presentation/hooks/useRealtimeUpdates.ts:37,71`, `usePushNotifications.ts:73`, `apps/api/src/application/ports/notification-gateway.ts:1` | Actualiser les informations sans relance manuelle | Améliorer la reprise et les changements actionnables |
| Itinéraire/carte | Carte Leaflet en WebView native si coordonnées ; carte de secours web ; choix Plans/Google Maps/Waze ; `PlaceVenuePanel.tsx:41,79,121`, `apps/mobile/src/presentation/utils/place-links.ts:33` | Destination liée à la sortie, moins de recherche | Conserver l’itinéraire ; compacter la carte de secours |
| Uber / réservation | Raccourcis externes ; TheFork = recherche Google, pas réservation suivie ; `place-links.ts:10,58`, `PlaceVenuePanel.tsx:113,137` | Commodité Uber ; bénéfice faible de la recherche générique | Simplifier Uber ; abandonner le bouton réservation générique à ce stade |
| Live Activities iOS | Compte à rebours/statut, fin à l’heure prévue ; `apps/mobile/src/infrastructure/live-activities/invitation-live-activity.native-implementation.tsx:119,151,229` | Consulter sans rouvrir l’app | Conserver si utile sur appareil ; aligner sur l’état en cours |

Absences constatées : édition lieu/heure après envoi, retard du répondant web, affichage des participants côté destinataire, arrivée effective, calendrier intégré, discussion interne. Certaines absences sont pertinentes ; les autres ne justifient pas automatiquement un ajout.

## 3. Parcours utilisateurs identifiés

| Parcours | Séquence réelle | Frictions, blocages et états sans issue |
|---|---|---|
| Première ouverture | Hydratation → connexion ou Sorties ; lien `/s/[token]` accessible sans session | Racine ne montre pas une sortie de démonstration ; ce n’est pas un blocage des liens publics. `app/index.tsx:10`, `_layout.tsx:47` |
| Inscription/auth | Google → pseudo si nécessaire ; alternative pseudo/mot de passe ; `returnTo` prévu | Deux présentations successives possibles : carrousel puis guide. Aucun parcours de récupération de mot de passe identifié dans écran/routes inspectés ; ne pas promettre une solution sans identité récupérable. `LoginScreen.tsx:241,299`, `apps/api/src/http/routes/auth-routes.ts:1` |
| Ajout/gestion d’amis | Tag exact → demande → attente → acceptation | Recherche sans erreur/reprise affichée ; listes Amis sans erreur/reprise ; pas de refus/retrait visible. `AddFriendScreen.tsx:19,32`, `FriendsScreen.tsx:44,55` |
| Création directe | Lieu → heure → ouvrir sélecteur → amis/liste → valider → glisser capot → maintenir → détail | Destinataires explicites et protection anti-double envoi utiles ; geste spécifique ajoute apprentissage et temps. `HomeScreen.tsx:315,324,344` |
| Création par lien | Activer lien seul → créer → détail → créer lien → copier/partager | Possible sans amis, mais message du sélecteur contredit cette possibilité et lien est une action supplémentaire. `AudiencePicker.tsx:34`, `InvitationSharePanel.tsx:46` |
| Choix lieu | Trois caractères → recherche → résultat ou nom libre → adresse optionnelle | Permission pour pays ; absence de message spécifique zéro résultat ; coordonnées anciennes retirées si adresse modifiée, protection à conserver. `usePlaceSearch.ts:39`, `HomeScreen.tsx:284,285,305` |
| Invitation/reception | Push ou badge Sorties → À répondre → détail | Push dépend de configuration et permission ; pas d’état explicite quand notifications refusées. `AppNavigation.tsx:24`, `usePushNotifications.ts:18` |
| Réponse/ETA | Oui/non → confirmation enregistrée → modifier ; après oui → ouvrir retard → saisir → enregistrer | Fonctionne avant début ; impossible après. Web uniquement oui/non. `RespondInvitationScreen.tsx:43,99,112`, `SharedInvitationScreen.tsx:94` |
| Participants | Organisateur → compteurs/listes ; invité → propre réponse/lieu | Données internes reçues mais non affichées au destinataire ; données des invités web volontairement réservées au créateur. `apps/api/src/application/use-cases/get-invitation-details.use-case.ts:20,27` |
| Modification/annulation | Modifier sa réponse ou annuler la sortie via confirmation | Pas d’édition du plan ; aucun parcours « ajouter des destinataires après envoi » trouvé. Annuler/recréer peut perdre la coordination. `apps/api/src/http/routes/invitation-routes.ts:18,93` |
| Retour notification | Création/annulation → détail reçu ; demande ami → Amis ; après session hydratée | Déduplication d’identifiant de notification et erreur/retry détail présents. Ancien lien invalide n’offre pas forcément une sortie contextuelle ; retour natif à valider. `usePushNotifications.ts:61,73`, `RespondInvitationScreen.tsx:97` |
| Reprise après perte réseau | WebSocket reconnecte après 1,5 s ; queries réessayent une fois ; web invité rafraîchit toutes les 30 s | Reconnexion sans resynchronisation explicite des snapshots ; aucune intégration native `AppState`/focus des queries trouvée. `useRealtimeUpdates.ts:7,71`, `query-client.ts:6`, `SharedInvitationScreen.tsx:29` |

Le décompte ci-dessus porte sur les actions imposées par le code, pas sur une durée chronométrée. La comparaison WhatsApp concerne les échanges évitables ; cet audit ne prétend pas que WhatsApp ne possède aucune fonctionnalité d’événement ou de sondage.

## 4. Problèmes UX et fonctionnels classés P0 à P3

Toutes les recommandations ont un identifiant unique, repris dans les décisions produit. Aucun P0 avéré. Le tableau sépare explicitement constat, impact hypothétique et solution.

| ID / priorité / effort | O — Problème et preuve | H — Impact utilisateur | R — Solution proposée |
|---|---|---|---|
| R01 · P1 · M | Fermeture à `scheduledAt` : `RespondInvitationScreen.tsx:44,67,102`, `useInvitations.ts:116`, partage `invitation-sharing.use-case.ts:57`, Live Activities `:121`. API réponse connectée sans expiration : `respond-to-invitation.use-case.ts:19`. Recherche active couvre tout le jour : `postgres-invitation.repository.ts:247` | Au moment d’annoncer un retard, la fiche n’est plus utilisable ; règles différentes selon canal ; ancien plan du jour peut encore bloquer création | Séparer début/fin de coordination, afficher en cours, garder retard et itinéraire, règle commune API/web/mobile ; aligner recherche active sur fin réelle. Durée de fenêtre à valider, pas choisie arbitrairement |
| R02 · P1 · L | `send-invitation-to-friends.use-case.ts:43,67,69,70` vérifie puis écrit invitation/destinataires/audit sans transaction commune ; schéma invitations `schema.ts:134` sans unicité de sortie active | Échec partiel ou créations concurrentes pourraient produire plan sans invités, erreur après création ou doublons | Création atomique et clé de requête idempotente ; sérialiser la règle de création tant que restriction conservée ; relire état réel lors d’une reprise |
| R03 · P1 · L | Push attendu après persistance avant retour et realtime : use-case envoi `:97,103`, annulation `cancel-invitation.use-case.ts:38,44,52`. Expo lève sur HTTP non réussi : `expo-push-notification.gateway.ts:120` | « Envoi impossible » alors que plan créé/annulé ; participants non actualisés | Succès de l’action séparé de livraison, notification réessayable durable, statut réel retourné ; pas de renvoi du plan à chaque incident push. Effort L pour file durable et reprise |
| R04 · P1 · M | Réponse authentifiée lit annulation puis écrit statut sans verrou commun : `respond-to-invitation.use-case.ts:20,25,36`, repository `:162,180`. Réponse puis audit puis realtime peuvent aussi échouer séparément | Réponse concurrente à annulation ou erreur après statut enregistré ; confiance dans compteurs fragilisée | Contrôle/écriture atomiques avec annulation ; notification/audit cohérents et relance idempotente. Aligner sur protections transactionnelles guest déjà présentes |
| R05 · P1 · S | Reconnexion WebSocket sans `onopen` de resynchronisation : `useRealtimeUpdates.ts:71,115` ; pas d’intégration native focus/online trouvée | Événement raté durant absence → compteurs périmés sans avertissement | Réactualiser snapshots à reconnexion et reprise active ; afficher fraîcheur/échec si nécessaire ; ajouter actualisation manuelle simple |
| R06 · P1 · S | Accueil sans ami dirige vers identifiant/ajout (`OutingsScreen.tsx:103`), guide ignore lien ; sélecteur dit ami obligatoire (`AudiencePicker.tsx:34`) | Reconstitution du réseau avant première valeur, alors que lien existe | Mettre « Proposer et partager » dans premier usage ; corriger textes ; garder invitation directe facultative |
| R07 · P1 · M | Sortie créée avant création du lien ; partage sous participants ; `HomeScreen.tsx:181`, `CreatedInvitationDetailScreen.tsx:124`, `InvitationSharePanel.tsx:46,52` | Plusieurs actions avant qu’un proche reçoive l’invitation | Pour mode lien, préparer lien et afficher partage immédiatement après succès ; message lieu/heure, adresse uniquement selon choix explicite ; conserver révocation |
| R08 · P1 · M | Destinataire sans liste participants : `RespondInvitationScreen.tsx:97`; données internes disponibles, guest filtré (`get-invitation-details.use-case.ts:27`) | « Qui vient finalement ? » retourne dans le groupe | Résumé personnes/statuts/estimations aux destinataires autorisés ; diffusion changements à ces utilisateurs. Politique explicite avant toute extension aux invités publics |
| R09 · P1 · L | Pas de route/UI édition lieu/heure : `invitation-routes.ts:18`, `CreatedInvitationDetailScreen.tsx:124,134` | Correction légère nécessite nouveau plan ou messages contradictoires | Édition bornée organisateur ; marquer date du changement et réponses antérieures ; informer invités. Reconfirmation seulement si changement significatif, sans imposer toutes les réponses à nouveau ni système complet de versions. Livrer après fiabilité |
| R10 · P2 · M | Capot puis maintien 1,15 s : `ProtectedInvitationButton.tsx:76`, aide nécessaire `OnboardingGuide.tsx:38` | Effort répétitif supérieur à un envoi standard, intérêt ludique non mesuré | Bouton explicite avec destinataires/récapitulatif, confirmation seulement adaptée au risque ; conserver verrou en cours et validation de sélection |
| R11 · P2 · S | Guide six étapes, « Passer » déclenche API (`OnboardingGuide.tsx:56,69`, `useOnboarding.ts:11`) | Hors réseau, modal persiste et bloque premier usage | Fermeture locale immédiate, synchronisation ensuite ; présentation courte + aides contextuelles facultatives |
| R12 · P2 · S | `FriendsScreen.tsx:44,55` sans erreurs/reprise listes/acceptation ; `AddFriendScreen.tsx:32` sans état recherche | Échec ressemble à vide, recherche ou acceptation incompréhensible | États distincts chargement/vide/erreur et reprise contextualisée ; conserver sélection et action explicite |
| R13 · P2 · M | Guest ne stocke aucun retard : `packages/shared/src/index.ts:188`, `SharedInvitationScreen.tsx:99` ; répondant connecté utilise clavier et retard relatif (`RespondInvitationScreen.tsx:112`) | Groupe mixte doit signaler les retards ailleurs ; calcul mental de l’heure d’arrivée | Option retard après oui aussi sur web ; raccourcis fréquents + saisie facultative ; afficher heure estimée calculée depuis RDV, sans GPS |
| R14 · P2 · S | Adresse publique masquée, invitation dit la demander à organisateur (`SharedInvitationScreen.tsx:88`), pas d’itinéraire public | « Quel lieu exactement ? » ajoute un échange | Aperçu avant partage, choix clair de visibilité ; itinéraire si destination partagée ; ne pas rendre adresse publique par défaut |
| R15 · P2 · S | Uber et itinéraire de même rang, carte de secours de 128–148 px, recherche TheFork générique (`PlaceVenuePanel.tsx:113,137,204,215`, `place-links.ts:58`) ; erreurs d’ouverture Uber/réservation absorbées (`PlaceVenuePanel.tsx:118,142`) | Actions secondaires prennent espace sur lieu/réponses ; échec d’ouverture peu compréhensible | Itinéraire prioritaire, Uber secondaire, secours carte compact ; erreur locale/reprise si action conservée ; retirer recherche réservation générique sauf besoin/type de lieu prouvé |
| R16 · P2 · M | Permissions localisation à la recherche pour pays (`usePlaceSearch.ts:39`), refus push non expliqué (`usePushNotifications.ts:23`) | Interruption avant bénéfice et invitation manquée sans explication | Pays par défaut sans permission ; localisation volontaire si besoin prouvé. Indiquer sobrement notifications désactivées et proposer accès réglages ; garder Sorties fonctionnel |
| R17 · P1 · S pour labels/contrastes ; P2 · S pour animations/adaptation | Champs sans nom accessible par défaut, contrastes rouges, animations sans réduction ; preuves UI en section 5 | Lecture/réponse plus difficile pour certains utilisateurs | Labels automatiques, couleurs de texte contrastées dès phase 1 ; respect réduction animations, présentation adaptative des compteurs ensuite |
| R18 · P2 · M | Jour calculé dans fuseau local appareil et serveur ; notification force Paris (`schedule.ts:29`, `apps/api/src/domain/shared/date.ts:1,19`) ; API contrôle jour mais pas futur (`invitation-rules.ts:6`) | Selon configuration, sortie valide rejetée ou heure/jour incohérent ; requête passée acceptée côté serveur | Définir fuseau métier cohérent, contrôler futur et limites côté API ; afficher date explicite près de minuit |
| R19 · P3 · M | Aujourd’hui uniquement et refus si sortie déjà active (`invitation-rules.ts:6`, `send-invitation-to-friends.use-case.ts:43`) | Préparer demain ou deux plans simultanés impossible ; demande réelle à confirmer | Dates futures/plusieurs plans seulement après recherche utilisateur, sans calendrier complexe. La recherche active après fin réelle est une correction P1 de R01, pas cette extension |
| R20 · P3 · S/M | Listes groupes sans renommage/suppression, amitiés sans refus/retrait (`friend-routes.ts:14,29`) | Listes/demandes obsolètes encombrent choix après usage répété | Nommer listes d’invités ; entretien minimal si besoin confirmé. Pas de rôles, feed ni messagerie de groupe |

## 5. Problèmes UI avec références précises

**Bases à conserver.** Tokens couleurs/espacements/rayons centralisés (`apps/mobile/src/shared/theme.ts:1`), boutons 56 px (`AppButton.tsx:84`), champs 56/46 px (`TextField.tsx:55,66`), navigation 58 px/profil 44 px (`AppNavigation.tsx:57,76`), retours Expo Stack, défilement et gestion clavier (`Screen.tsx:53,74`), modales bornées et défilantes. Les écrans de réponse et détail organisateur mettent déjà les décisions et participants avant la carte. Les captures anciennes confirment cette hiérarchie à leur date, pas le comportement actuel sur tous appareils.

| O — Constat UI | H — Risque à vérifier | R — Correction / rattachement |
|---|---|---|
| Blanc sur rouge `#EF2B2D` : rapport calculé ≈ 4,16 ; rouge sur crème `#F8F2E6` ≈ 3,73. Label danger 16 px (`AppButton.tsx:111,134`), badge 10 px (`AppNavigation.tsx:74`), erreurs 14 px (`RespondInvitationScreen.tsx:136`) | Texte petit insuffisamment contrasté ; ne pas déduire un défaut identique de toutes les couleurs | Utiliser rouge plus sombre pour texte/contrôles à petit texte ; conserver palette pour surfaces ; R17, P1/S |
| `TextField.tsx:16` rend le label séparément du `TextInput`, sans nom accessible par défaut ; appels login et ajout ami sans `accessibilityLabel` (`LoginScreen.tsx:228,313`, `AddFriendScreen.tsx:32`) | Lecteur d’écran dépend du placeholder ou du support | Fournir nom accessible depuis label, surcharge possible ; vérifier VoiceOver/TalkBack ; R17, P1/S |
| Entrée animée et boucle décorative `Screen.tsx:43,103`, animation bouton `AppButton.tsx:31`, Stack `_layout.tsx:42`; seul capot consulte explicitement réduction mouvement | Préférence système non respectée globalement | Réduire/supprimer animations selon préférence ; R17, P2/S |
| Trois compteurs dans une rangée, texte 12 px (`CreatedInvitationDetailScreen.tsx:272,302`) | Grandes polices et largeur 320 : retours à la ligne/hauteur déséquilibrés ; pas de coupure actuelle démontrée | Adapter rangée ou résumé texte selon place et taille de police ; vérifier avant redesign ; R17, P2/S |
| Carte de secours volumineuse sans carte utile sur web (`PlaceVenuePanel.tsx:204,215`) ; capture `ux07-repondre.jpg` l’illustre historiquement | Espace occupé sans aider à choisir ni rejoindre | Destination/adresse et itinéraire compacts ; R15, P2/S |
| Mode clair fixe, pas de sélection système dans tokens/layout inspectés | Confort sombre non mesuré, pas de bug avéré | Conserver pour l’instant ; thèmes supplémentaires P3 uniquement si besoin établi, pas de refonte préalable |

La signature graphique peut rester. Aucun changement esthétique subjectif de palette, bordures ou illustrations n’est priorisé sans bénéfice de compréhension ou d’accessibilité.

## 6. Cas limites insuffisamment traités

| Scénario | Protection réellement présente | Limite / risque inféré | Recommandation |
|---|---|---|---|
| Accepter puis refuser | Modification disponible, refus normalise retard à null (`invitation-rules.ts:33`) | Après début, UI ne permet plus aucune modification | R01 ; ne pas recréer cette fonction déjà existante |
| Modifier retard | Entier 0–1440, état enregistré, 0 retire retard | Fermeture trop tôt ; 1440 minutes peu cohérent avec sortie du jour ; politique de durée à décider | R01/R13 |
| Annuler pendant une réponse | Contrôles organisateur/destinataire ; guest transaction et verrou (`postgres-invitation-sharing.repository.ts:28`) | Auth : lecture annulation puis écriture séparées ; interleaving possible | R04 ; reproduction concurrente ultérieure |
| Créer deux fois rapidement | Verrou local phase sending (`safety-gate.ts:21`), bouton busy, unicité invitation/destinataire (`schema.ts:159`) | Deux sessions/requêtes peuvent passer le contrôle active avant insertion ; unicité destinataire ne protège pas deux invitations | R02 |
| Panne push ou audit après écriture | Erreur API/mobile affichée ; contrôle sortie active peut retrouver plan créé | Message d’échec ambigu ; retry annulation déjà annulée retourne sans relivrer push (`cancel-invitation.use-case.ts:33`) | R02/R03/R04 |
| Notification ancienne ou sortie inconnue | ID de notification dédupliqué, route ID validée ; détails affichent erreur/retry ou annulation | Nouvelle session peut réouvrir dernière notification ; un 404 ne se résout pas par retry ; navigation retour à vérifier | Prévoir état indisponible avec accès Sorties dans reprise R05, P2/S |
| Perte connexion/événement raté | Reconnexion WS 1,5 s, query retry 1 ; réponse non optimiste et erreur visible | Pas de snapshot explicitement rafraîchi à reconnexion ; pas de bandeau fraîcheur | R05 |
| Recherche vide ou permission refusée | Nom/adresse libres, pays locale de secours, message erreur fournisseur | Zéro résultat non distingué explicitement ; permission inattendue | R16 ; message « Aucun résultat, utiliser ce lieu saisi », P2/S dans le même lot |
| Notifications refusées | Aucune obligation de permission pour consulter Sorties ; push token absent toléré | Refus peu visible ; pas de push réponse/retard organisateur (`respond-to-invitation.use-case.ts:76`) | R16 ; notifications sélectives à considérer après fiabilité, voir section 7 |
| Guest change d’appareil ou efface stockage | Clé par invitation et upsert unique ; avertissement doublon (`SharedInvitationScreen.tsx:105`) | Même personne peut apparaître deux fois ; prénom non vérifié ; compte connecté via lien reste un répondant guest | Ne pas fusionner sur prénom ; afficher statut non vérifié et garder avertissement. Nettoyage organisateur uniquement si cas fréquent, P3/M |
| Guest storage indisponible/lien révoqué | Erreur et action retrouver réponse ; token vérifié ; absence/révocation 404, adresse masquée ; no-store/no-referrer/noindex (`shared-invitation-routes.ts:16`) | Navigation de sortie/publicité de prochaine sortie peut être secondaire face au besoin d’aide | Conserver protections ; clarification indisponible incluse R05 |
| Passage minuit/fuseau | Contrôle heure future client, message plus de créneau à 23:59 (`schedule.ts:45`) | API raisonne jour du serveur ; active ne suit pas fin réelle | R18/R19 |
| Créateur change lieu/heure | Aucun changement possible actuellement | Scénario non couvert fonctionnellement, pas un défaut de notification d’édition existante | R09 |

## 7. Fonctionnalités manquantes pertinentes et décisions face à WhatsApp

Pour chaque décision, la question est : **« Pourquoi ouvrir Mates plutôt que son groupe WhatsApp pour organiser cette sortie ? »** L’avantage est d’obtenir une référence structurée et actuelle. Aucun gain de conversion ci-dessous n’a été mesuré.

Légende des cinq critères : **V** valeur différentielle, **I** interactions réduites, **C** information centralisée, **M** coordination à plusieurs, **O** effort d’ouverture justifié. `+` avantage attendu ; `~` indirect/conditionnel ; `−` absent. Les corrections de fiabilité n’enlèvent pas nécessairement un tap, mais évitent les demandes de vérification. R02–R04 et R17 sont des conditions nécessaires à une fiche fiable et utilisable, pas des raisons autonomes d’ouvrir Mates.

| Proposition / priorité-effort | V/I/C/M/O | Avantage concret par rapport à WhatsApp | Valeur utilisateur attendue | Complexité supplémentaire | Verdict |
|---|---|---|---|---|---|
| R01 État en cours, fin distincte, ETA/itinéraire maintenus · P1/M | +/+/+/+/+ | Dernière estimation retrouvée après heure de RDV | Coordination pendant arrivée | Règle temporelle commune ; pas GPS | Améliorer |
| R02 Création atomique/idempotente · P1/L | +/~/+/+/+ | Une fiche sans doublons ni états partiels | Confiance dans invitation unique | Transactions, clé de requête, sérialisation | Améliorer |
| R03 Livraison indépendante du succès métier · P1/L | +/~/+/+/+ | Statut du plan connu malgré panne notification | Éviter recontact/recréation | File durable/reprise livraison | Améliorer |
| R04 Réponse/annulation atomiques · P1/M | +/~/+/+/+ | Dernier état cohérent pour tous | Réponse fiable, sans vérification par message | Synchronisation DB, audit cohérent | Améliorer |
| R05 Reprise snapshots/états indisponibles · P1/S | +/+/+/+/+ | Informations actuelles sans demander « toujours bon ? » | Vue fiable après retour | Refetch aux bons événements ; états classiques | Améliorer |
| R06 Premier plan sans reconstruire amis · P1/S | +/+/+/+/+ | Diffuser dans groupe existant, consolider dans fiche | Première valeur immédiate | Réorganisation UI, capacité déjà codée | Améliorer |
| R07 Création puis partage direct · P1/M | +/+/+/+/+ | Un message utile lieu/heure + accès réponse | Moins d’étapes avant diffusion | Orchestration lien/consentement ; pas nouveau réseau | Simplifier |
| R08 Participants/estimations aux invités autorisés · P1/M | +/+/+/+/+ | Évite « qui vient ? » et recompte | Décision mieux informée | UI + actualisation + règles visibilité | Améliorer |
| R09 Édition limitée du plan · P1/L | +/+/+/+/+ | Remplace corrections dispersées par référence à jour | Corriger sans tout refaire | Changement daté/signalé, anciennes réponses repérées ; reconfirmation proportionnée | Améliorer |
| R10 Envoi standard, retrait capot/maintien · P2/M | ~/+/~/~/+ | Réduit effort d’envoi de fiche structurée | Compréhension immédiate | Moins de complexité ; garder protections | Simplifier |
| R11 Guide court et fermeture locale · P2/S | ~/+/−/~/+ | Moins d’effort avant premier plan utile | Démarrage rapide hors réseau | Petit état local/synchronisation | Simplifier |
| R12 Erreurs/reprise amis · P2/S | ~/~/~/+/~ | Choix destinataires compréhensible en cas d’échec | Moins d’impasses | États requête existants | Améliorer |
| R13 Retard web + presets + heure estimée · P2/M | +/+/+/+/+ | Groupe mixte avec une seule liste d’estimations | ETA exploitable sans installation | DTO, stockage/UI guest ; calcul déclaratif | Améliorer |
| R14 Aperçu destination publique + itinéraire autorisé · P2/S | +/+/+/+/+ | Évite question adresse et recherche manuelle | Arriver au bon endroit | Petite UI, respecte visibilité | Améliorer |
| R15 Itinéraire principal, Uber secondaire, carte compacte · P2/S | ~/+/~/~/~ | Destination exploitable rapidement | Fiche focalisée | Réduction UI | Simplifier |
| R15 Recherche réservation Google générique · P2/S | −/−/−/−/− | Aucun avantage démontré de coordination | Faible valeur additionnelle | Distraction/action externe actuelle | Abandonner à ce stade |
| R16 Permissions volontaires/état push · P2/M | ~/+/~/+/~ | Moins d’interruptions, état notification clair | Utilisation compréhensible | Explication/réglages simples | Simplifier et améliorer |
| R17 Accessibilité/lisibilité · P1/S essentiels, P2/S reste | ~/~/~/+/+ | Tableau exploitable par davantage de participants | Comprendre et répondre sans obstacle | Faible, tokens/composants partagés | Améliorer |
| R18 Fuseau et validité heure communs · P2/M | +/~/+/+/+ | Heure de référence fiable, sans clarification | Rendez-vous compris pareil | Règle métier explicite | Améliorer |
| R19 Demain/plusieurs plans · P3/M | ~/~/+/+/~ | Plans futurs retrouvés, si besoin réel | Organisation différée potentielle | Cycle de vie/limites/notifications | Conserver scope actuel ; améliorer après validation |
| R20 Listes d’invités + entretien minimal · P3/S–M | ~/+/~/+/~ | Réutiliser destinataires habituels | Moins de sélection répétitive | Renommer/supprimer ; pas groupe partagé | Conserver, simplifier présentation |
| Push sélectif de retard/changement important · P2/M | +/+/+/+/~ | Informer sans surveiller le fil | Réactivité organisateur app fermée | Seuils, anti-bruit, réglage, livraison fiable | Améliorer après R03 ; besoin à mesurer |
| Arrivée effective « Je suis là » · P3/M | ~/~/+/+/~ | Statut clair possible sans message | Évite attente si réellement fréquente | Nouveau statut et responsabilité de mise à jour | Abandonner pour cette phase ; reconsidérer sur preuve de besoin |
| Refus/retrait demandes et nettoyage doublons guest · P3/M | ~/~/~/~/− | Avantage direct faible pour une sortie | Entretien si problème récurrent | Endpoints/actions et politique identité | Améliorer seulement sur besoin confirmé |
| Mode sombre · P3/M | ~/−/−/−/~ | Confort, sans différence de coordination | Conditionnel à usage | Deuxième thème à maintenir | Conserver thème actuel ; différer |
| Récupération compte mot de passe · P3/L | ~/~/~/~/~ | Aucun avantage direct sur organisation | Récupérer compte existant | Identité récupérable et canal à définir | Améliorer si ce mode est durable ; cadrage préalable |
| Chat interne/feed/réactions/groupes sociaux · hors roadmap | −/−/−/−/− | Aucun avantage identifié ; informations réparties entre deux discussions | Valeur différentielle non démontrée | Forte technique et sociale | Abandonner |
| GPS continu, votes multi-créneaux, calendrier bidirectionnel, réservation intégrée · hors roadmap | ~/−/~/~/− | Aucun besoin démontré dans audit | Potentielle pour autres produits, non établie ici | Forte, permissions/intégrations/états | Abandonner dans roadmap immédiate |

Les fonctions manquantes les plus pertinentes sont donc la coordination après début, la visibilité autorisée des réponses, la correction du plan et l’ETA web. Le partage sans compte et la modification d’une réponse ne sont pas manquants.

## 8. Fonctionnalités à simplifier ou supprimer

- **Capot/maintien** : retirer la mécanique systématique, conserver destinataires explicites, récapitulatif et anti-double requête (R10). L’hypothèse d’un effet ludique positif ne justifie pas le coût sans mesure.
- **Guide et graphe social préalable** : aide contextuelle et premier lien, amis/listes ensuite (R06/R11). Ne pas supprimer les listes utiles aux organisateurs réguliers.
- **Partage** : préparation directement après création, choix de visibilité clair ; conserver révocation, absence d’indexation/cache et identité guest non vérifiée (R07/R14).
- **Carte de secours et Uber** : destination/itinéraire au premier rang, transport secondaire (R15).
- **Recherche réservation générique** : abandonner tant que gain concret de coordination non démontré ; ce n’est pas une réservation intégrée existante (R15).
- **Aujourd’hui et une seule sortie** : contraintes à annoncer et aligner sur fin réelle ; pas de calendrier complet ajouté par défaut (R19).
- **Fonctions sociales nouvelles** : ne pas ajouter de messagerie, fil, réactions ou rôles de groupe. Mates doit être meilleur pour coordonner, pas pour discuter.

## 9. Top 10 des améliorations prioritaires

L’ordre distingue bénéfice immédiat et dépendances de fiabilité. Chaque ligne renvoie au constat, preuve, impact, solution, effort et décision détaillés plus haut.

| Rang | Lot | Priorité / effort | Résultat observable attendu |
|---|---|---|---|
| 1 | R01 Continuer la coordination après début | P1/M | RDV 19 h : à 19 h 05, une nouvelle estimation est encore enregistrable, visible et cohérente web/mobile/API |
| 2 | R02 Création atomique et reprise idempotente | P1/L | Deux requêtes d’une même action ne créent pas deux plans ; panne intermédiaire ne laisse pas une sortie incomplète |
| 3 | R03/R04 Réponse/annulation/livraison fiables | P1/L pour livraison, M pour atomicité réponse | Statut enregistré annoncé correctement ; panne push ne transforme pas succès métier en faux échec |
| 4 | R05 Réactualisation à la reprise | P1/S | Après déconnexion, retour montre dernière réponse/annulation sans action supplémentaire |
| 5 | R06 Première sortie partageable | P1/S | Utilisateur sans amis trouve le chemin lien dès l’accueil et ne croit pas devoir reconstruire son groupe |
| 6 | R07 Partager immédiatement après création | P1/M | L’organisateur obtient une invitation lisible à diffuser sans chercher un panneau ni générer lien séparément |
| 7 | R08 Fiche participants côté invité | P1/M | Destinataire autorisé sait qui vient et quelle estimation est déclarée |
| 8 | R09 Corriger lieu/heure | P1/L | Tous retrouvent le plan actuel ; changement et anciennes réponses identifiables |
| 9 | R10/R11 Envoi simple et guide facultatif | P2/M | Première invitation sans apprentissage gestuel ; guide fermable en cas d’échec réseau |
| 10 | R13 ETA simple pour groupe mixte | P2/M | Répondant web peut préciser retard sans créer compte ; heure estimée lisible |

Accessibilité R17, erreurs amis R12 et cohérence horaire R18 sont des lots courts/transversaux à intégrer aux écrans touchés, sans les repousser derrière une refonte. Pas de classement P0 inventé pour accélérer artificiellement un ticket.

## 10. Roadmap d’amélioration en trois phases

### Phase 1 — Une fiche de coordination fiable et un premier bénéfice visible

R01–R06, R10, R11, R12 et contrôles serveur/fuseau R18. Définir une vraie fin de coordination et aligner la recherche de sortie active ; atomicité/idempotence ; livraison réessayable ; snapshots après reconnexion ; état vide orienté lien ; envoi standard et fermeture locale guide. Labels/contrastes essentiels R17 dans les composants touchés. Ces corrections peuvent être livrées en petits lots ; l’infrastructure durable n’a pas à retarder les améliorations UI indépendantes.

**Critère de sortie proposé** : organiser sans ami Mates, répondre, annoncer retard après début, annuler, perdre/retrouver réseau : chacun retrouve un état explicite et cohérent. Contrôler les scénarios concurrence/panne notification dans une future validation autorisée. Aucun de ces essais n’a été exécuté ici.

### Phase 2 — Moins d’interactions, une référence partagée

R07/R08/R13/R14/R15/R16 et adaptations restantes R17, puis R09 avec changement explicite et réponses antérieures identifiables. Garder le canal de discussion existant ; enrichir la fiche de coordination. Notifications sélectives seulement après livraison fiable et validation du besoin.

**Critère de sortie proposé** : un groupe partiellement équipé peut comprendre le lieu, répondre et modifier une estimation sans installation ; les destinataires autorisés consultent les présences ; une correction de lieu/heure ne se perd pas. Vérifier confidentialité, 320 px, grandes polices, lecteurs d’écran et appareils natifs.

### Phase 3 — Étendre uniquement sur preuve de valeur

Valider plusieurs sorties/demain (R19), entretien listes/demandes (R20), arrivée déclarée, récupération compte et mode sombre. Aucun calendrier complexe, suivi GPS, chat ou système de réservation dans cette phase par défaut.

**Mesures proposées, non collectées** : interactions et temps jusqu’au premier partage, abandon avant création, taux réponse web sans compte, besoin de messages « où/quand/qui/retard » après partage, mises à jour après heure prévue, doublons et erreurs après persistance, réutilisation des listes. Comparer le même scénario Mates et organisation habituelle dans WhatsApp, sans supposer un avantage mesuré. L’ouverture supplémentaire se justifie si elle évite effectivement relances, recompte et recherche d’informations.

### Revue critique et garde-fous de priorité

La revue Product Critic a été effectuée après les cinq analyses. Elle a relevé l’effort sous-estimé des transactions/idempotence et de la livraison durable (R02/R03 passés à L), déplacé l’alignement de sortie active dans R01/P1, distingué accessibilité essentielle P1 des risques visuels P2, et replacé l’envoi simple dans la première phase. L’ordre technique de livraison n’est pas une mesure d’importance utilisateur.

Les recommandations sont regroupées par résultat, pas par nombre d’écrans : l’expiration UI, le classement passé et la fin Live Activity sont un même problème R01 ; accueil/guide/lien appartiennent au premier bénéfice ; les erreurs de création/livraison sont distinguées car leurs solutions et garanties diffèrent. Les préférences esthétiques et les nouvelles fonctions sociales sont exclues des priorités. Toute extension publique de visibilité participants nécessite une règle explicite ; ne pas exposer des noms de tiers parce qu’une liste existe dans le DTO organisateur.

Les retards, réponses modifiables, liens invités, retries de création/réponse/annulation et protections gestuelles/accessibles sont réellement présents. L’audit recommande de les améliorer ou simplifier, sans effacer leurs protections utiles ni présenter leur réimplémentation comme une nouveauté.
