import type { AddFriendUseCase } from "../application/use-cases/add-friend.use-case.js";
import { AddFriendUseCase as AddFriend } from "../application/use-cases/add-friend.use-case.js";
import type { AcceptFriendRequestUseCase } from "../application/use-cases/accept-friend-request.use-case.js";
import { AcceptFriendRequestUseCase as AcceptFriendRequest } from "../application/use-cases/accept-friend-request.use-case.js";
import type { CreateFriendGroupUseCase } from "../application/use-cases/create-friend-group.use-case.js";
import { CreateFriendGroupUseCase as CreateFriendGroup } from "../application/use-cases/create-friend-group.use-case.js";
import type { AuthenticateGoogleUseCase } from "../application/use-cases/authenticate-google.use-case.js";
import { AuthenticateGoogleUseCase as AuthenticateGoogle } from "../application/use-cases/authenticate-google.use-case.js";
import type { CompleteGoogleProfileUseCase } from "../application/use-cases/complete-google-profile.use-case.js";
import { CompleteGoogleProfileUseCase as CompleteGoogleProfile } from "../application/use-cases/complete-google-profile.use-case.js";
import type { CreateInvitationUseCase } from "../application/use-cases/create-invitation.use-case.js";
import { CreateInvitationUseCase as CreateInvitation } from "../application/use-cases/create-invitation.use-case.js";
import type { CancelInvitationUseCase } from "../application/use-cases/cancel-invitation.use-case.js";
import { CancelInvitationUseCase as CancelInvitation } from "../application/use-cases/cancel-invitation.use-case.js";
import type { GetActiveCreatedInvitationUseCase } from "../application/use-cases/get-active-created-invitation.use-case.js";
import { GetActiveCreatedInvitationUseCase as GetActiveCreatedInvitation } from "../application/use-cases/get-active-created-invitation.use-case.js";
import type { GetCurrentUserUseCase } from "../application/use-cases/get-current-user.use-case.js";
import { GetCurrentUserUseCase as GetCurrentUser } from "../application/use-cases/get-current-user.use-case.js";
import type { GetInvitationDetailsUseCase } from "../application/use-cases/get-invitation-details.use-case.js";
import { GetInvitationDetailsUseCase as GetInvitationDetails } from "../application/use-cases/get-invitation-details.use-case.js";
import type { ListCreatedInvitationsUseCase } from "../application/use-cases/list-created-invitations.use-case.js";
import { ListCreatedInvitationsUseCase as ListCreatedInvitations } from "../application/use-cases/list-created-invitations.use-case.js";
import type { ListFriendsUseCase } from "../application/use-cases/list-friends.use-case.js";
import { ListFriendsUseCase as ListFriends } from "../application/use-cases/list-friends.use-case.js";
import type { ListFriendGroupsUseCase } from "../application/use-cases/list-friend-groups.use-case.js";
import { ListFriendGroupsUseCase as ListFriendGroups } from "../application/use-cases/list-friend-groups.use-case.js";
import type { UpdateFriendGroupMembersUseCase } from "../application/use-cases/update-friend-group-members.use-case.js";
import { UpdateFriendGroupMembersUseCase as UpdateFriendGroupMembers } from "../application/use-cases/update-friend-group-members.use-case.js";
import type { ListReceivedFriendRequestsUseCase } from "../application/use-cases/list-received-friend-requests.use-case.js";
import { ListReceivedFriendRequestsUseCase as ListReceivedFriendRequests } from "../application/use-cases/list-received-friend-requests.use-case.js";
import type { ListSentFriendRequestsUseCase } from "../application/use-cases/list-sent-friend-requests.use-case.js";
import { ListSentFriendRequestsUseCase as ListSentFriendRequests } from "../application/use-cases/list-sent-friend-requests.use-case.js";
import type { ListReceivedInvitationsUseCase } from "../application/use-cases/list-received-invitations.use-case.js";
import { ListReceivedInvitationsUseCase as ListReceivedInvitations } from "../application/use-cases/list-received-invitations.use-case.js";
import type { LoginUserUseCase } from "../application/use-cases/login-user.use-case.js";
import { LoginUserUseCase as LoginUser } from "../application/use-cases/login-user.use-case.js";
import type { RegisterPushTokenUseCase } from "../application/use-cases/register-push-token.use-case.js";
import { RegisterPushTokenUseCase as RegisterPushToken } from "../application/use-cases/register-push-token.use-case.js";
import type { RegisterUserUseCase } from "../application/use-cases/register-user.use-case.js";
import { RegisterUserUseCase as RegisterUser } from "../application/use-cases/register-user.use-case.js";
import type { RespondToInvitationUseCase } from "../application/use-cases/respond-to-invitation.use-case.js";
import { RespondToInvitationUseCase as RespondToInvitation } from "../application/use-cases/respond-to-invitation.use-case.js";
import type { SearchUserByPublicTagUseCase } from "../application/use-cases/search-user-by-public-tag.use-case.js";
import { SearchUserByPublicTagUseCase as SearchUserByPublicTag } from "../application/use-cases/search-user-by-public-tag.use-case.js";
import type { SearchPlacesUseCase } from "../application/use-cases/search-places.use-case.js";
import { SearchPlacesUseCase as SearchPlaces } from "../application/use-cases/search-places.use-case.js";
import type { SendInvitationToFriendsUseCase } from "../application/use-cases/send-invitation-to-friends.use-case.js";
import { SendInvitationToFriendsUseCase as SendInvitationToFriends } from "../application/use-cases/send-invitation-to-friends.use-case.js";
import type { TrackInvitationAuditEventUseCase } from "../application/use-cases/track-invitation-audit-event.use-case.js";
import { TrackInvitationAuditEventUseCase as TrackInvitationAuditEvent } from "../application/use-cases/track-invitation-audit-event.use-case.js";
import type { PlaceSearchPort } from "../application/ports/place-search-port.js";
import type { TokenService } from "../application/ports/token-service.js";
import type { GoogleIdentityVerifier } from "../application/ports/google-identity-verifier.js";
import { AppErrors } from "../domain/shared/app-error.js";
import { createDb } from "./db/client.js";
import { ConsoleNotificationGateway } from "./notifications/console-notification.gateway.js";
import { ExpoPushNotificationGateway } from "./notifications/expo-push-notification.gateway.js";
import { FirebaseCloudMessagingGateway } from "./notifications/firebase-cloud-messaging.gateway.js";
import { MapboxPlaceSearchAdapter } from "./places/mapbox-place-search.adapter.js";
import { MockPlaceSearchAdapter } from "./places/mock-place-search.adapter.js";
import { PhotonPlaceSearchAdapter } from "./places/photon-place-search.adapter.js";
import { InMemoryRealtimeGateway } from "./realtime/in-memory-realtime.gateway.js";
import { PostgresFriendGroupRepository } from "./repositories/postgres-friend-group.repository.js";
import { PostgresFriendshipRepository } from "./repositories/postgres-friendship.repository.js";
import { PostgresInvitationRepository } from "./repositories/postgres-invitation.repository.js";
import { PostgresPushTokenRepository } from "./repositories/postgres-push-token.repository.js";
import { PostgresUserRepository } from "./repositories/postgres-user.repository.js";
import { BcryptPasswordHasher } from "./security/bcrypt-password-hasher.js";
import { GoogleIdentityTokenVerifier } from "./security/google-identity-token-verifier.js";
import { JoseTokenService } from "./security/jose-token-service.js";

export type AppUseCases = {
  registerUser: RegisterUserUseCase;
  loginUser: LoginUserUseCase;
  authenticateGoogle: AuthenticateGoogleUseCase;
  completeGoogleProfile: CompleteGoogleProfileUseCase;
  getCurrentUser: GetCurrentUserUseCase;
  addFriend: AddFriendUseCase;
  acceptFriendRequest: AcceptFriendRequestUseCase;
  listFriends: ListFriendsUseCase;
  createFriendGroup: CreateFriendGroupUseCase;
  listFriendGroups: ListFriendGroupsUseCase;
  updateFriendGroupMembers: UpdateFriendGroupMembersUseCase;
  listReceivedFriendRequests: ListReceivedFriendRequestsUseCase;
  listSentFriendRequests: ListSentFriendRequestsUseCase;
  searchUserByPublicTag: SearchUserByPublicTagUseCase;
  createInvitation: CreateInvitationUseCase;
  sendInvitationToFriends: SendInvitationToFriendsUseCase;
  cancelInvitation: CancelInvitationUseCase;
  respondToInvitation: RespondToInvitationUseCase;
  trackInvitationAuditEvent: TrackInvitationAuditEventUseCase;
  getInvitationDetails: GetInvitationDetailsUseCase;
  getActiveCreatedInvitation: GetActiveCreatedInvitationUseCase;
  listReceivedInvitations: ListReceivedInvitationsUseCase;
  listCreatedInvitations: ListCreatedInvitationsUseCase;
  registerPushToken: RegisterPushTokenUseCase;
  searchPlaces: SearchPlacesUseCase;
};

export type AuthConfig = {
  passwordAuthEnabled: boolean;
  googleAuthEnabled: boolean;
};

export type AppContainer = {
  auth: AuthConfig;
  tokenService: TokenService;
  realtime: InMemoryRealtimeGateway;
  useCases: AppUseCases;
};

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable ${key}`);
  }

  return value;
}

function optionalEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]?.trim();
  return value !== undefined && value.length > 0 ? value : undefined;
}

function booleanEnv(env: NodeJS.ProcessEnv, key: string, defaultValue: boolean): boolean {
  const value = optionalEnv(env, key);
  if (value === undefined) {
    return defaultValue;
  }

  const normalizedValue = value.toLowerCase();
  if (normalizedValue === "true" || normalizedValue === "1" || normalizedValue === "yes" || normalizedValue === "on") {
    return true;
  }

  if (normalizedValue === "false" || normalizedValue === "0" || normalizedValue === "no" || normalizedValue === "off") {
    return false;
  }

  throw new Error(`Invalid boolean environment variable ${key}: ${value}`);
}

function requireGoogleClientIds(env: NodeJS.ProcessEnv): string[] {
  const clientIds = [
    optionalEnv(env, "GOOGLE_WEB_CLIENT_ID") ?? optionalEnv(env, "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
    optionalEnv(env, "GOOGLE_IOS_CLIENT_ID") ?? optionalEnv(env, "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"),
    optionalEnv(env, "GOOGLE_ANDROID_CLIENT_ID") ?? optionalEnv(env, "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID"),
    ...(optionalEnv(env, "GOOGLE_CLIENT_IDS")?.split(",") ?? [])
  ]
    .map((clientId) => clientId?.trim())
    .filter((clientId): clientId is string => clientId !== undefined && clientId.length > 0);

  const uniqueClientIds = [...new Set(clientIds)];
  if (uniqueClientIds.length === 0) {
    throw new Error(
      "Missing required environment variable GOOGLE_CLIENT_IDS or GOOGLE_WEB_CLIENT_ID/GOOGLE_IOS_CLIENT_ID/GOOGLE_ANDROID_CLIENT_ID"
    );
  }

  return uniqueClientIds;
}

function createPlaceSearchAdapter(env: NodeJS.ProcessEnv): PlaceSearchPort {
  const provider = optionalEnv(env, "PLACES_PROVIDER") ?? "photon";
  if (provider === "mock") {
    return new MockPlaceSearchAdapter();
  }

  const mapboxAccessToken = optionalEnv(env, "MAPBOX_ACCESS_TOKEN");
  if (provider === "mapbox" && mapboxAccessToken !== undefined) {
    return new MapboxPlaceSearchAdapter(mapboxAccessToken);
  }

  return new PhotonPlaceSearchAdapter(optionalEnv(env, "PHOTON_BASE_URL"), optionalEnv(env, "PHOTON_LANGUAGE") ?? "fr");
}

export function createContainerFromEnv(env: NodeJS.ProcessEnv): AppContainer {
  const db = createDb(requireEnv(env, "DATABASE_URL"));
  const auth = {
    passwordAuthEnabled: booleanEnv(env, "AUTH_PASSWORD_ENABLED", true),
    googleAuthEnabled: booleanEnv(env, "AUTH_GOOGLE_ENABLED", true)
  } satisfies AuthConfig;

  const users = new PostgresUserRepository(db);
  const friendships = new PostgresFriendshipRepository(db);
  const friendGroups = new PostgresFriendGroupRepository(db);
  const invitations = new PostgresInvitationRepository(db);
  const pushTokens = new PostgresPushTokenRepository(db);
  const placeSearch = createPlaceSearchAdapter(env);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JoseTokenService(
    requireEnv(env, "JWT_SECRET"),
    Number.parseInt(env.JWT_EXPIRES_IN_DAYS ?? "30", 10)
  );
  const googleIdentity: GoogleIdentityVerifier = auth.googleAuthEnabled
    ? new GoogleIdentityTokenVerifier(requireGoogleClientIds(env))
    : {
        verifyIdToken: async () => {
          throw AppErrors.forbidden("Google authentication is disabled");
        }
      };
  const notifications =
    env.NOTIFICATION_PROVIDER === "expo"
      ? new ExpoPushNotificationGateway()
      : env.NOTIFICATION_PROVIDER === "firebase"
        ? new FirebaseCloudMessagingGateway(env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : new ConsoleNotificationGateway();
  const realtime = new InMemoryRealtimeGateway();

  return {
    auth,
    tokenService,
    realtime,
    useCases: {
      registerUser: new RegisterUser(users, passwordHasher, tokenService),
      loginUser: new LoginUser(users, passwordHasher, tokenService),
      authenticateGoogle: new AuthenticateGoogle(users, googleIdentity, tokenService),
      completeGoogleProfile: new CompleteGoogleProfile(users, googleIdentity, tokenService),
      getCurrentUser: new GetCurrentUser(users),
      addFriend: new AddFriend(users, friendships, pushTokens, notifications, realtime),
      acceptFriendRequest: new AcceptFriendRequest(friendships, users, realtime),
      listFriends: new ListFriends(friendships),
      createFriendGroup: new CreateFriendGroup(friendGroups, friendships),
      listFriendGroups: new ListFriendGroups(friendGroups),
      updateFriendGroupMembers: new UpdateFriendGroupMembers(friendGroups, friendships),
      listReceivedFriendRequests: new ListReceivedFriendRequests(friendships),
      listSentFriendRequests: new ListSentFriendRequests(friendships),
      searchUserByPublicTag: new SearchUserByPublicTag(users),
      createInvitation: new CreateInvitation(invitations),
      sendInvitationToFriends: new SendInvitationToFriends(
        invitations,
        friendGroups,
        friendships,
        users,
        pushTokens,
        notifications,
        realtime
      ),
      cancelInvitation: new CancelInvitation(invitations, pushTokens, notifications, realtime),
      respondToInvitation: new RespondToInvitation(invitations, realtime),
      trackInvitationAuditEvent: new TrackInvitationAuditEvent(invitations),
      getInvitationDetails: new GetInvitationDetails(invitations),
      getActiveCreatedInvitation: new GetActiveCreatedInvitation(invitations),
      listReceivedInvitations: new ListReceivedInvitations(invitations),
      listCreatedInvitations: new ListCreatedInvitations(invitations),
      registerPushToken: new RegisterPushToken(pushTokens),
      searchPlaces: new SearchPlaces(placeSearch)
    }
  };
}
