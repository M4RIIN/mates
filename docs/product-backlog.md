# Mates suivi des fonctionnalités et améliorations produit

Fiche de suivi du produit Mates — 9 octobre 2026.

Objectif : faciliter la première sortie entre amis, augmenter les sorties organisées et rejointes, et permettre à une bande de découvrir Mates à partir d’un seul organisateur.

La promesse à préserver est « Un lieu, une heure, tes amis. Tu sais qui vient. ». Conserver l’identité crème, bleu, jaune, les contours marqués et le caractère ludique. Élargir les occasions à un café, un déjeuner, une promenade, du sport, des jeux ou une sortie en famille.

Décision confirmée : conserver le glissement pour retirer la protection du bouton, puis l’appui long pour envoyer. Remplacer l’apparence de slider par un bouton rouge protégé par un capot transparent articulé, inspiré des deux photos fournies. Le glissement sert à ouvrir le capot ; il ne déclenche jamais l’envoi. La proposition précédente de remplacer ce geste par un bouton classique est retirée.

Les constats viennent du code et des captures du projet. Les effets attendus sur la conversion et la rétention sont des hypothèses à mesurer. Cette fiche décrit le travail à faire ; aucun ticket n’est implémenté par sa création.

## Organisation du suivi

Priorités : P1 = prochaine phase ; P2 = amélioration après validation du cœur ; P3 = exploration ultérieure. Les priorités ordonnent le travail, sans promettre une date.

Statuts : À faire → En cours → À vérifier → Terminé. Utiliser Bloqué seulement avec une cause et une prochaine action explicites. Tous les tickets commencent à À faire ; les sujets P3 sont À explorer. Responsable et échéance restent à attribuer.

Pour chaque ticket commencé, renseigner le responsable, la date cible, la décision de conception, le lien vers la réalisation et la preuve de validation. Un ticket est terminé lorsque ses critères sont vérifiés sur les supports concernés.

Pour chaque ticket UX, solliciter un agent UI/UX pour un récapitulatif des choix et une revue du résultat ; consigner son retour et les éventuels points restant à vérifier.

Ordre conseillé :

1. Mesurer le parcours actuel et observer quelques utilisateurs.

2. Simplifier la navigation et les écrans, puis prototyper le bouton à capot.

3. Développer le lien d’invitation et la réponse web.

4. Ajouter les dates futures, la modification et la réutilisation.

5. Améliorer les habitudes, tester l’acquisition par bandes et explorer les revenus.

Les tickets commerciaux peuvent avancer pendant le développement. Ne pas lancer un test d’acquisition à grande échelle avant de pouvoir suivre la première réponse et le retour des organisateurs.

## Tickets de navigation et de design

| ID | Ticket | Priorité | Statut |
| --- | --- | --- | --- |
| UX01 | Rendre la navigation principale visible | P1 | À vérifier |
| UX02 | Donner la priorité aux sorties sur l’accueil | P1 | À vérifier |
| UX03 | Alléger le formulaire de création | P1 | À vérifier |
| UX04 | Créer le bouton à capot et appui long | P1 | À faire |
| UX05 | Choisir explicitement les destinataires | P1 | À vérifier |
| UX06 | Remonter les réponses sur le détail organisateur | P1 | À faire |
| UX07 | Remonter les actions sur le détail invité | P1 | À faire |
| UX08 | Simplifier les mots et la hiérarchie visuelle | P1 | À faire |
| UX09 | Rendre les groupes existants plus accessibles | P2 | À faire |

### UX01 Navigation visible

Implémenté le 9 octobre 2026 ; vérification native restante. Pour chaque ticket UX, demander un récapitulatif à l’agent UI/UX et consigner sa revue avec les validations.

Remplacer l’accès principal via la roue dentée par Sorties, Proposer et Amis. Profil accessible séparément ; groupes accessibles depuis Amis. Réunir les sorties reçues et créées avec des filtres compréhensibles.

- [x] Les trois destinations principales sont accessibles directement et portent un libellé.

- [x] L’utilisateur distingue les invitations à répondre et ses sorties organisées.

- [ ] La navigation reste cohérente depuis les détails et les notifications. Vérifiée sur les détails web ; ouverture depuis les notifications à vérifier sur build natif.

- [x] Un badge signale les réponses attendues sans compter comme nouvelles toutes les invitations déjà traitées.

Réalisation : barre persistante Sorties / Proposer / Amis ; Profil dans l’en-tête ; Mes groupes dans Amis. Sorties regroupe les invitations reçues et créées avec les filtres Toutes / À répondre / Organisées / Reçues. Les anciens liens vers les listes redirigent vers les filtres correspondants ; les liens de détail sont conservés. La roue dentée est retirée et le guide adapté. Le geste de création reste inchangé.

Le badge Sorties compte uniquement les invitations reçues à venir, non annulées et sans réponse. Il se met à jour après réponse et lorsque leur échéance passe. Les invitations expirées sans réponse portent le libellé Sans réponse ; les invitations annulées portent Annulée.

Validation : typecheck mobile et export web réussis ; 40 tests réussis, 3 tests d’intégration BDD ignorés sans `TEST_DATABASE_URL`. Parcours web avec données fictives à 390 × 844 : listes et filtres, accès aux détails, réponse puis disparition du badge, Profil et Mes groupes. Contrôle de disposition à 320 px : les filtres peuvent revenir à la ligne. [Aperçu web avec données fictives](assets/ux01-sorties.jpg).

Récapitulatif de l’agent UI/UX (`ux01_review`) : la navigation visible, le profil séparé, l’accès aux groupes et les filtres réunissant les sorties sont cohérents avec la conception retenue. Les états À répondre / Sans réponse / Annulée correspondent au badge. La revue du code est cohérente ; les essais web ont été effectués par l’agent principal.

Restant avant clôture : vérifier les marges de sécurité, le clavier et l’ouverture depuis une notification sur iOS et Android. Le statut À vérifier reflète ces contrôles natifs restants.

### UX02 Accueil orienté vers l’action utile

Implémenté le 9 octobre 2026 ; vérifications natives restantes.

Afficher À répondre, Prochaines sorties et Proposer une sortie. Adapter l’accueil à une personne sans amis ou sans invitation.

- [x] Une invitation à répondre est visible dès l’ouverture.

- [x] Sans amis, une action invite à partager son identifiant public ; Ajouter un ami et Proposer une sortie restent accessibles.

- [x] Un état vide, un chargement et une erreur réseau ont des contenus distincts et une action utile.

- [x] Les sorties organisées et rejointes sont identifiables.

Réalisation : Sorties devient la destination à l’ouverture et après connexion/inscription. La vue Toutes présente À répondre, Proposer une sortie, puis Prochaines sorties (organisées ou acceptées), sans doublons. Les invitations refusées et l’historique restent accessibles. Sans amis, un bloc propose de partager son identifiant public ou d’ajouter un ami ; il ne masque pas les sorties existantes. Le partage contient le tag et les instructions pour retrouver la personne, sans annoncer un lien de profil inexistant. Le guide d’accueil est déplacé de Proposer vers Sorties. Le formulaire et son geste de création sont conservés.

Validation : typecheck mobile et export web réussis. Essais web avec données fictives à 390 × 844 : ouverture de la racine sur Sorties, invitation à répondre prioritaire, sorties organisées/acceptées distinctes, refusées séparées ; cas sans amis ni sortie ; chargement ; erreur réseau sans faux état vide ; Réessayer rétablit les listes. [Aperçu de l’accueil](assets/ux02-accueil.jpg).

Récapitulatif de l’agent UI/UX (`ux01_review`) : la hiérarchie À répondre → Proposer une sortie → Prochaines sorties suit les actions utiles. Le bloc sans amis vient ensuite ; le guide est bien déplacé et les états réseau restent distincts. Aucun défaut bloquant supplémentaire relevé dans la revue du code corrigé. Les essais web ont été réalisés par l’agent principal.

Restant avant clôture : partage natif de l’identifiant, marges de sécurité et ouverture depuis les notifications sur iOS et Android. Le statut À vérifier reflète ces contrôles restants.

Dépendance : UX01. Les actions de partage deviennent complètes avec PR01 et PR02.

### UX03 Création compacte

Implémenté le 9 octobre 2026 ; validations natives restantes.

Réduire les répétitions du lieu et de l’adresse. Remplacer les champs heure et minute par un sélecteur d’heure. Présenter une carte compacte ou dépliable.

- [x] Le lieu, la date, l’heure et les invités se comprennent sans informations répétées.

- [x] L’adresse peut être corrigée ; elle n’impose pas un second remplissage après sélection d’un lieu.

- [ ] L’action d’envoi reste atteignable sur petit écran et avec le clavier ouvert. Disposition web vérifiée ; clavier natif à vérifier.

- [x] Les erreurs de saisie sont affichées avant la tentative d’envoi.

Réalisation : fiche unique après sélection du lieu, actions secondaires compactes et carte repliée. Adresse préremplie et corrigible ; une correction est réellement envoyée et retire les coordonnées d’origine. Un lieu libre et son adresse restent visibles ; Modifier le lieu conserve la saisie. Recherche en liste compacte dans le formulaire, avec possibilité de saisie libre si elle échoue.

Horaire : un contrôle Aujourd’hui · HH:mm ouvre un sélecteur 24 h avec minutes précises, brouillon, Annuler et Valider. À la réouverture, les listes se positionnent sur le choix actuel. Une heure passée ou invalide bloque l’armement ; contrôle actualisé toutes les 30 secondes et au retour dans l’application, puis revérifié avant l’envoi. En fin de journée, le défaut reste à 23:59 aujourd’hui ; à 23:59, un message explique l’absence de créneau. Les dates futures restent dans PR03.

Les noms d’invités UX05 restent visibles en pastilles. Ouvrir les sélecteurs ferme le clavier et la protection ; commencer le glissement ferme également le clavier. Le glissement et le maintien existants sont conservés en attendant UX04.

Ajustement demandé après revue : pastilles d’invités réduites à 30 px de hauteur visuelle, bord fin, texte moins gras et casse originale des noms. La cible tactile de retrait reste de 44 px, avec libellé accessible et adaptation aux noms longs. L’agent UI/UX confirme cette conception. L’aperçu initial ci-dessous précède cet ajustement.

Validation : typecheck mobile et export web réussis ; suite de 46 tests réussis, 3 tests BDD ignorés. Quatre tests de composition couvrent adresse corrigée/coordonnées, lieu libre, heures invalides/passées et fin de journée ; ils ont été relancés après les corrections finales. Essais web avec données fictives : lieu sélectionné sans répétition, adresse préremplie puis corrigée, ancienne carte désactivée, lieu et adresse conservés lors d’une modification ; heure passée bloquée, annulation conservant le choix, validation et réouverture à 23:59. Bouton Valider visible à 320 × 640 ; formulaire compact vérifié à 390 × 844. [Aperçu du formulaire](assets/ux03-creation.jpg).

Récapitulatif final de l’agent UI/UX `ux01_review` : création simplifiée et cohérente ; la capture finale confirme une meilleure visibilité du glissement et du bouton rouge à 390 × 844, avec lieu, adresse, heure et invités lisibles. Correction d’adresse prise en compte, coordonnées cohérentes, sélecteur unique et erreurs avant armement. Retours intégrés : afficher l’adresse d’un lieu libre après édition, préserver les saisies et compacter les actions secondaires. Aucun défaut bloquant supplémentaire relevé. Les essais web sont réalisés par l’agent principal.

Restant avant clôture : clavier et défilement sur petit écran natif, lecteurs d’écran, cartes natives et gestes réels iOS/Android. UX04 modifiera ensuite la protection du bouton.

Dépendances : UX04, UX05 ; PR03 pour les dates futures.

### UX04 Bouton protégé par un capot transparent

Conserver la signature du produit : un bouton rouge, un socle jaune cohérent avec Mates et un capot transparent avec charnière. Les photos fournies décrivent la mécanique et l’apparence souhaitées ; elles servent de références de conception.

États attendus : capot fermé → ouverture par glissement → capot ouvert → maintien en cours → envoi → confirmation ou erreur.

- [ ] Le capot couvre réellement le bouton à l’état fermé ; le bouton ne peut pas envoyer.

- [ ] Un glissement ouvre ou retire visuellement le capot avec une animation articulée, plutôt qu’une poignée qui se déplace sur un rail.

- [ ] Le sens du geste est montré clairement ; son orientation exacte est choisie lors du prototype.

- [ ] Un geste incomplet revient à l’état fermé.

- [ ] Après ouverture, un appui long reste indispensable ; conserver initialement les 1 150 ms actuelles.

- [ ] Une progression visuelle et un retour haptique signalent le maintien.

- [ ] Relâcher trop tôt annule la progression sans envoyer.

- [ ] Le récapitulatif indique clairement le lieu, la date, l’heure et les destinataires avant le maintien.

- [ ] Changer les informations de la sortie referme la protection.

- [ ] Pendant l’envoi, les gestes sont neutralisés ; des appuis répétés ne créent pas plusieurs invitations.

- [ ] Une erreur laisse un message explicite et une nouvelle tentative avec protection refermée.

- [ ] Les états sont annoncés aux lecteurs d’écran ; un contrôle accessible permet d’ouvrir le capot sans devoir réaliser le glissement, tout en conservant une confirmation volontaire.

- [ ] Le prototype est vérifié sur petit écran, avec réduction des animations et sur iOS et Android.

Dépendances : UX03 et UX05 pour le récapitulatif. Le bouton reste un élément ludique ; ses textes doivent parler d’inviter ses amis et d’envoyer une sortie.

### UX05 Destinataires explicites

Implémenté le 9 octobre 2026 ; validations natives restantes.

Remplacer la diffusion automatique à tous les amis par une sélection claire. Autoriser plusieurs amis choisis librement, un groupe ou tous les amis.

- [x] Les noms et le nombre de personnes invitées sont visibles avant l’envoi.

- [x] Plusieurs amis peuvent être cochés sans créer un groupe.

- [x] Tous mes amis est un choix explicite.

- [x] Une sélection devenue vide empêche l’envoi et explique comment ajouter des invités.

Réalisation : aucun destinataire sélectionné initialement. Fenêtre de sélection avec cases à cocher, brouillon et Valider ; fermer sans valider conserve le choix précédent. Tous mes amis et les groupes présélectionnent des personnes ajustables. Les groupes servent de raccourcis : l’attribution du groupe n’est pas enregistrée dans l’invitation, car l’envoi utilise toujours la liste explicite `friendUserIds` (1 à 100 personnes). Les noms et le nombre sont affichés sur le formulaire ; chaque personne peut être retirée.

Sécurité du geste : ouvrir le sélecteur, confirmer une modification ou modifier la liste disponible annule le maintien et referme la protection. Une liste vide, une vérification en cours ou une erreur des amis bloque l’envoi avec une explication. Les amis devenus indisponibles sont exclus et signalés. Une erreur des groupes n’empêche pas le choix individuel. Le glissement suivi du maintien de 1 150 ms est conservé.

Validation : typecheck mobile, export web et `git diff --check` réussis ; 42 tests réussis, 3 tests BDD ignorés. Tests serveur étendus à plusieurs destinataires explicites et à la suppression des doublons. Essais web avec données fictives : zéro invité initial et validation désactivée ; sélection de deux amis et récapitulatif des noms ; Tous mes amis puis annulation conserve le choix validé ; groupe remplace la présélection ; Valider reste visible à 390 × 844 et 320 × 640 pendant le défilement. [Aperçu du sélecteur](assets/ux05-invites.jpg).

Récapitulatif final de l’agent UI/UX `ux01_review` : sélection claire et volontaire ; aucun invité par défaut, choix multiamis, validation et récapitulatif cohérents. Corrections intégrées sur les explications de blocage réseau, la modalité pour les lecteurs d’écran et l’état désactivé du bouton. Aucun défaut bloquant supplémentaire relevé dans la revue du code corrigé. Les essais web sont réalisés par l’agent principal ; l’erreur des amis affiche bien une explication et Réessayer, avec envoi bloqué.

Restant avant clôture : vérifier les gestes réels (dont ouverture du sélecteur pendant maintien), les lecteurs d’écran, les marges natives et la disparition d’un ami pendant composition sur iOS et Android.

### UX06 Détail organisateur

Afficher le résumé de participation et les personnes avant la grande carte. Placer l’annulation dans les actions secondaires.

- [ ] Le nombre de personnes qui viennent et qui n’ont pas répondu est visible dans la première partie de l’écran.

- [ ] Les retards sont associés aux personnes concernées.

- [ ] Annuler la sortie est accessible mais ne domine plus la page.

- [ ] La confirmation d’annulation explique que les invités seront informés.

### UX07 Détail invité

Placer Je viens et Je ne peux pas juste après le résumé de la sortie ; proposer le retard et l’itinéraire ensuite.

- [ ] La réponse est accessible avant une grande carte.

- [ ] Une confirmation visible suit la réponse ; celle-ci peut être modifiée.

- [ ] Une sortie annulée affiche son état et ne propose pas de répondre.

- [ ] Le lieu et l’heure restent visibles après la réponse.

### UX08 Mots et lisibilité

Remplacer Rencard par Proposer une sortie, Diffusion et Limiter à par Qui invites-tu ?, Amis actifs par Amis, Fermer l’invitation par Annuler la sortie. Harmoniser accents, états et libellés.

- [ ] Les coordonnées GPS disparaissent du contenu utilisateur courant.

- [ ] Les noms longs et adresses longues restent lisibles.

- [ ] L’adresse et la carte ne répètent pas plusieurs fois le même lieu.

- [ ] Les couleurs sont accompagnées de textes pour distinguer oui, non et attente.

- [ ] La palette et les contours caractéristiques de Mates sont conservés.

### UX09 Groupes

Afficher les groupes existants avant le formulaire ; ouvrir la création via Créer un groupe.

- [ ] Un groupe peut être consulté, modifié et choisi facilement pour une sortie.

- [ ] Les états sans groupe ou sans ami proposent une prochaine action claire.

- [ ] Les groupes restent décrits comme des listes d’invités personnelles tant qu’ils ne sont pas des espaces partagés.

## Tickets de fonctionnalités

| ID | Ticket | Priorité | Statut |
| --- | --- | --- | --- |
| PR01 | Partager son profil par lien et QR code | P1 | À faire |
| PR02 | Inviter par lien avec réponse web | P1 | À faire |
| PR03 | Autoriser demain et les dates futures | P1 | À faire |
| PR04 | Modifier le lieu et l’heure après envoi | P1 | À faire |
| PR05 | Relancer une sortie passée | P1 | À faire |
| PR06 | Réexaminer la limite à une sortie active | P1 | À faire |
| PR07 | Empêcher les invitations sans destinataire | P1 | À faire |
| PR08 | Ajouter lieux récents et favoris | P2 | À faire |
| PR09 | Signaler un retard en un geste | P2 | À faire |
| PR10 | Ajouter au calendrier | P2 | À faire |
| PR11 | Clarifier le parcours de réservation | P1 | À faire |
| PR12 | Explorer un petit sondage de créneaux | P3 | À explorer |

### PR01 Partage du profil

Ajouter Partager mon profil et un QR code ; conserver la recherche par tag.

- [ ] Le lien ouvre le bon profil et permet d’envoyer une demande d’amitié.

- [ ] Un utilisateur non connecté retrouve la destination après connexion.

- [ ] La demande ne s’accepte pas automatiquement.

- [ ] Le tag reste consultable et copiable.

### PR02 Invitation par lien et réponse web

Un organisateur peut partager une sortie dans ses canaux habituels. Un invité peut consulter le plan et répondre depuis son navigateur sans installation.

- [ ] Le lien présente le lieu, la date, l’heure et l’organisateur.

- [ ] L’invité peut répondre sans installer l’application et retrouver ou modifier sa réponse.

- [ ] Une méthode d’identification des invités est définie pour éviter les réponses en double et l’usurpation.

- [ ] Les réponses web apparaissent dans le suivi de l’organisateur.

- [ ] L’organisateur peut révoquer le lien et définir les conditions d’accès ; les adresses privées sont traitées explicitement.

- [ ] Après une réponse réussie, une proposition facultative présente Mates pour organiser la prochaine sortie.

- [ ] Une arrivée depuis un lien conserve sa destination après installation ou connexion, selon les supports retenus.

Dépendances : PR07, UX06, UX07 et ME01. Concevoir ensemble le partage, les réponses et la conversion.

### PR03 Dates futures

Ajouter Aujourd’hui, Demain et Choisir une date. Faire évoluer la règle serveur qui impose aujourd’hui.

- [ ] Mobile et API acceptent la même plage de dates.

- [ ] La date est visible dans la création, les détails, les listes et les notifications.

- [ ] Les heures passées sont traitées explicitement.

- [ ] Les cas proches de minuit et les fuseaux horaires sont vérifiés.

- [ ] Les sorties futures ne sont pas bloquées par une règle d’invitation active incompatible.

Dépendance : PR06.

### PR04 Modification après envoi

Permettre à l’organisateur de modifier le lieu et l’heure, avec un changement visible pour les invités.

- [ ] Le nouveau plan remplace l’ancien dans tous les affichages.

- [ ] Les participants sont informés du changement.

- [ ] Le traitement des anciennes confirmations est défini et compréhensible.

- [ ] Les activités en direct et rappels reflètent la nouvelle information.

Dépendance : PR03 pour un déplacement de date.

### PR05 Refaire ce plan

Réutiliser les destinataires et le lieu d’une sortie passée, sans envoi automatique.

- [ ] Refaire ce plan ouvre une nouvelle création préremplie.

- [ ] La date et l’heure doivent être vérifiées.

- [ ] Les invités devenus indisponibles pour la sélection sont signalés.

- [ ] Le bouton à capot et appui long reste le geste d’envoi.

Dépendances : UX04, UX05 et PR03.

### PR06 Plusieurs sorties actives

Définir puis implémenter une règle permettant de préparer plusieurs rendez-vous distincts. La règle actuelle autorise une seule invitation créée active à la fois.

- [ ] La règle retenue est documentée.

- [ ] Un déjeuner et une sortie du soir peuvent coexister si la règle retenue l’autorise.

- [ ] L’accueil et les activités en direct présentent correctement les sorties concernées.

- [ ] Les protections contre un double envoi restent effectives.

### PR07 Aucun envoi vide

L’envoi actuel peut produire une invitation sans destinataire.

- [ ] Sans invité sélectionné, l’envoi est bloqué et propose d’ajouter un ami ou de partager une sortie.

- [ ] Avec PR02, une sortie par lien peut être créée sans ami existant, avec un état Partager pour inviter explicite.

- [ ] La création d’un lien n’annonce jamais qu’une invitation a été envoyée à des personnes.

### PR08 Lieux récents et favoris

- [ ] L’utilisateur peut retrouver un lieu utilisé et enregistrer ou retirer un favori.

- [ ] Le lieu réutilisé conserve son adresse et ses coordonnées utiles.

- [ ] La recherche reste disponible pour une nouvelle proposition.

### PR09 Retard rapide

- [ ] Des choix +5, +10 et +15 minutes accompagnent la saisie libre.

- [ ] Le retard peut être modifié après avoir accepté.

- [ ] L’organisateur voit la dernière valeur.

### PR10 Calendrier

- [ ] Une sortie peut être ajoutée au calendrier avec lieu, date et heure.

- [ ] Le parcours n’annonce pas une synchronisation automatique si elle n’existe pas.

- [ ] Le comportement lors d’une modification ou annulation est expliqué.

### PR11 Réservation honnête et pertinente

Le bouton actuel ouvre une recherche Google associant le lieu et TheFork.

- [ ] Tant que ce parcours reste une recherche, le libellé l’annonce.

- [ ] Un lien précis est utilisé lorsqu’une fiche fiable est disponible.

- [ ] Une réservation n’est pas proposée indifféremment pour un domicile ou un lieu sans réservation pertinente.

- [ ] Un clic externe n’est pas compté comme une réservation confirmée.

### PR12 Sondage de créneaux

Valider le besoin avant développement.

- [ ] Des utilisateurs expliquent dans quelles sorties le choix de date bloque.

- [ ] Un prototype limite le nombre d’options et permet de fixer une date finale.

- [ ] L’intérêt est comparé à la création directe ; la complexité ajoutée est évaluée.

## Tickets de première utilisation et de rétention

| ID | Ticket | Priorité | Statut |
| --- | --- | --- | --- |
| RE01 | Accompagner la première action réelle | P1 | À faire |
| RE02 | Demander les notifications au bon moment | P1 | À faire |
| RE03 | Ajouter des rappels utiles et réglables | P2 | À faire |
| RE04 | Faciliter la prochaine sortie | P2 | À faire |

### RE01 Première action

Réduire la présentation avant connexion et le guide de six étapes après connexion. Accompagner la première invitation ou réponse dans son contexte.

- [ ] Un invité arrivé par lien accède d’abord à sa sortie.

- [ ] Un organisateur peut commencer sa première proposition sans parcourir six explications.

- [ ] Les aides sont courtes, contextuelles et peuvent être ignorées.

- [ ] L’état sans amis conduit à une action réalisable.

Dépendances : UX02, PR01 et PR02.

### RE02 Notifications

Le code actuel peut demander la permission après authentification. Expliquer l’utilité au moment d’une invitation ou d’une sortie acceptée.

- [ ] Un écran contextualise la demande avant le dialogue système.

- [ ] Refuser n’empêche pas de consulter et répondre.

- [ ] La demande n’est pas répétée à chaque ouverture.

- [ ] Les réglages de notifications sont accessibles.

### RE03 Rappels

- [ ] Un rappel avant une sortie acceptée ouvre la bonne invitation et son itinéraire.

- [ ] L’organisateur peut relancer les personnes sans réponse avec une fréquence limitée.

- [ ] Une personne ayant répondu ne reçoit plus la relance de réponse.

- [ ] Modifier ou annuler une sortie actualise les rappels.

- [ ] Les préférences permettent de réduire les sollicitations.

Dépendances : RE02, PR03 et PR04.

### RE04 Prochaine sortie

Après une sortie, proposer discrètement Refaire ce plan ou Organiser la prochaine.

- [ ] La proposition réutilise les groupes et lieux habituels sans envoi automatique.

- [ ] Elle peut être ignorée.

- [ ] Son succès se mesure à une nouvelle sortie créée et répondue, pas à une simple ouverture.

Dépendances : PR05 et PR08.

## Tickets de positionnement et de commercial

| ID | Ticket | Priorité | Statut |
| --- | --- | --- | --- |
| AC01 | Montrer plusieurs occasions de se retrouver | P1 | À faire |
| AC02 | Donner une destination concrète au CTA de la landing | P1 | À faire |
| AC03 | Tester Mates auprès de bandes existantes | P1 | À faire |
| AC04 | Tester des démonstrations courtes | P2 | À faire |
| AC05 | Explorer les revenus après validation de l’usage | P3 | À explorer |

### AC01 Positionnement

Élargir les textes et exemples au-delà des bars et soirées, sans changer le thème des retrouvailles entre proches.

- [ ] La promesse principale exprime le lieu, l’heure et les réponses réunis.

- [ ] Les exemples incluent café, collègues, sport et sorties à domicile.

- [ ] Les mots restent compréhensibles pour des publics qui n’utilisent pas crew.

- [ ] Les promesses de la landing correspondent aux fonctionnalités disponibles.

### AC02 Conversion de la landing

Le CTA actuel demande d’envoyer un email. Proposer une inscription à la bêta ou un téléchargement selon la disponibilité réelle.

- [ ] Le CTA indique ce qu’il se passe après le clic.

- [ ] Une inscription reçoit une confirmation et peut être comptabilisée.

- [ ] Une capture lisible illustre une sortie et ses réponses.

- [ ] Le statut de disponibilité iOS et Android est exact.

### AC03 Premières bandes

Cibler les personnes qui organisent déjà les sorties de leurs amis, collègues, équipes sportives ou associations.

- [ ] Le recrutement porte sur plusieurs groupes complets, avec un organisateur identifié.

- [ ] Chaque groupe essaie une sortie concrète puis peut renouveler l’usage.

- [ ] Les difficultés de l’organisateur et des invités sont recueillies séparément.

- [ ] On suit la première réponse et la deuxième sortie par groupe.

- [ ] Les contacts externes et campagnes sont lancés uniquement dans un cadre explicitement autorisé.

Dépendances : ME01 ; PR02 pour tester le parcours sans installation.

### AC04 Démonstrations

- [ ] Une démonstration courte montre Je propose, tu réponds, on se retrouve.

- [ ] Plusieurs occasions sont testées avec des liens mesurables.

- [ ] Le résultat compare inscriptions, premières réponses et retour des groupes.

- [ ] Les dépenses restent une décision à prendre après les premiers résultats.

### AC05 Revenus

Garder comme orientation le parcours essentiel gratuit pendant la validation. Étudier ensuite partenariats de réservation et fonctions pour organisateurs réguliers ou associations.

- [ ] La valeur payante et son public sont définis à partir d’usages récurrents.

- [ ] Les coûts et conditions des partenaires sont vérifiés avant de prévoir des revenus.

- [ ] Un clic vers TheFork ou Uber n’est pas assimilé à une commission.

- [ ] Un abonnement n’est proposé qu’après validation du besoin et du consentement à payer.

## Tickets de mesure et de validation

| ID | Ticket | Priorité | Statut |
| --- | --- | --- | --- |
| ME01 | Mesurer le parcours et les cohortes | P1 | À faire |
| ME02 | Tester les parcours et le bouton à capot | P1 | À faire |

### ME01 Mesure

Définir les événements de début de création, sélection des invités, ouverture du capot, début et abandon du maintien, envoi réussi, ouverture du lien, réponse, inscription et nouvelle sortie. Compléter les traces existantes plutôt que supposer qu’elles couvrent tout le parcours.

- [ ] Les événements ont une définition et ne sont pas comptés plusieurs fois pour une même action.

- [ ] Les organisateurs, invités web et utilisateurs inscrits sont distingués.

- [ ] Les métriques sont segmentées par parcours et cohorte.

- [ ] Une période de référence est mesurée avant de fixer des objectifs chiffrés.

- [ ] La collecte évite les données personnelles inutiles.

| Objectif | Indicateur et définition |
| --- | --- |
| Premier succès | Part des nouveaux organisateurs obtenant une première réponse sous sept jours |
| Simplicité | Durée et abandon entre début de création et envoi réussi |
| Acquisition | Conversion ouverture du lien → réponse web → inscription → première sortie créée |
| Rétention organisateur | Part créant une deuxième sortie sous trente jours |
| Rétention invité | Part répondant à une nouvelle invitation pendant une fenêtre définie |
| Valeur de groupe | Sorties avec au moins une acceptation et renouvellement par la bande |
| Rencontres réalisées | Retour facultatif après la sortie, distinct des acceptations |

Une acceptation ne prouve pas que la rencontre a eu lieu. L’ouverture du capot ou le temps passé dans l’app ne constituent pas seuls une réussite.

### ME02 Tests des parcours

- [ ] Un nouvel utilisateur sait retrouver ses invitations sans explication.

- [ ] Un organisateur comprend qui sera invité.

- [ ] Le geste d’ouverture du capot puis de maintien est compris et réalisé sans aide.

- [ ] Le test distingue le plaisir du geste, son taux de réussite et les abandons.

- [ ] Les cas sans amis, erreurs réseau, noms longs, clavier, petite taille d’écran et accessibilité sont vérifiés.

- [ ] Les notifications et Live Activities sont vérifiées sur build natif, les fonctionnalités concernées étant désactivées dans Expo Go.

Dépendances : UX01 à UX08 et ME01. Le premier test peut utiliser un prototype avant développement complet.

## Tickets techniques

| ID | Ticket | Priorité | Statut |
| --- | --- | --- | --- |
| TECH01 | Appliquer les migrations au démarrage de l’API | P1 | Terminé |

### TECH01 Migrations automatiques au démarrage

Terminé le 9 octobre 2026. L’API attend les migrations avant d’ouvrir son serveur HTTP, en développement comme en production. Le migrateur Drizzle utilise le même historique que la commande manuelle et ignore les migrations déjà enregistrées. Un verrou PostgreSQL sérialise les démarrages simultanés. Une erreur empêche le démarrage et produit un code de sortie 1.

- [x] Appliquer les migrations sur une base neuve.
- [x] Compléter les migrations d’une base déjà migrée vers une version précédente.
- [x] Redémarrer sans rejouer les migrations ni modifier les données existantes.
- [x] Sérialiser deux instances démarrant simultanément.
- [x] Libérer la connexion et le verrou après une erreur pour permettre une nouvelle tentative.
- [x] Ne pas ouvrir le serveur HTTP si une migration échoue.
- [x] Résoudre le dossier de migrations en mode source et compilé, indépendamment du dossier de lancement.
- [x] Documenter le démarrage et la livraison du dossier de migrations en production.

Réalisation : `apps/api/src/main.ts`, `apps/api/src/infrastructure/db/migrate.ts`, `apps/api/tests/startup-migrations.test.ts` et `README.md`.

Validation : build TypeScript réussi ; 40 tests API réussis, dont 3 tests d’intégration sur PostgreSQL 16 jetable. Vérification de l’API compilée lancée depuis la racine du dépôt : migrations terminées avant HTTP, `/health` fonctionnel ; erreur de migration avec sortie 1 et aucun serveur démarré.

Pour rejouer les tests d’intégration, définir `TEST_DATABASE_URL` vers un serveur PostgreSQL de test avec droit de création de bases, puis lancer `pnpm --filter @mates/api test`. Les tests créent et suppriment leurs propres bases temporaires ; sans cette variable, ces trois tests sont ignorés. En production, livrer `apps/api/migrations` avec `apps/api/dist`.

## Pistes reportées

Conserver pour plus tard : fil public, rencontres avec des inconnus, messagerie complète, points et séries quotidiennes. Leur ajout ne répond pas aux premiers freins identifiés et élargirait fortement le périmètre.

## Références de conception

Les deux photos jointes au chat montrent un bouton rouge sur socle jaune, protégé par un capot transparent articulé. Elles servent à spécifier UX04. Le nouveau composant doit s’intégrer à l’identité de Mates.

Pour affiner les tickets visuels, vérifier les captures récentes de l’accueil sans amis, de l’accueil avec invitation reçue, de la sélection des invités, de la réponse et de la liste des groupes.

Le parcours d’invitation web est également présent chez [Apple Invites](https://www.apple.com/newsroom/2025/02/introducing-apple-invites-a-new-app-that-brings-people-together/) et [Partiful](https://partiful.com/dinner-invitations). Ces références soutiennent l’intérêt du parcours, sans démontrer son effet sur la croissance de Mates.

## Modèle de mise à jour d’un ticket

- Identifiant et titre :

- Priorité :

- Statut :

- Responsable :

- Date cible :

- Décisions retenues :

- Dépendances :

- Critères vérifiés :

- Lien vers la réalisation :

- Résultat observé :

- Prochaine action :
