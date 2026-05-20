import {
  authResponseSchema,
  currentUserSchema,
  friendSchema,
  invitationDetailsSchema,
  invitationListSchema,
  placeSearchResponseSchema,
  publicUserSchema,
  receivedInvitationListSchema,
  type AddFriendRequest,
  type AuthResponse,
  type CreateInvitationRequest,
  type CurrentUserDto,
  type FriendDto,
  type InvitationDetailsDto,
  type PlaceCandidateDto,
  type PublicUserDto,
  type ReceivedInvitationDto,
  type RegisterPushTokenRequest,
  type RespondToInvitationRequest
} from "@mates/shared";
import { z } from "zod";

const searchUserResponseSchema = z.object({
  user: publicUserSchema.nullable()
});

const okResponseSchema = z.object({
  ok: z.boolean()
});

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string | null
  ) {}

  register(input: { pseudo: string; password: string }): Promise<AuthResponse> {
    return this.request("POST", "/auth/register", authResponseSchema, input);
  }

  login(input: { identifier: string; password: string }): Promise<AuthResponse> {
    return this.request("POST", "/auth/login", authResponseSchema, input);
  }

  me(): Promise<CurrentUserDto> {
    return this.request("GET", "/me", currentUserSchema);
  }

  registerPushToken(input: RegisterPushTokenRequest): Promise<{ ok: boolean }> {
    return this.request("POST", "/me/push-token", okResponseSchema, input);
  }

  searchUser(publicTag: string): Promise<PublicUserDto | null> {
    return this.request("GET", `/users/search?tag=${encodeURIComponent(publicTag)}`, searchUserResponseSchema).then(
      (response) => response.user
    );
  }

  searchPlaces(query: string): Promise<PlaceCandidateDto[]> {
    return this.request("GET", `/places/search?q=${encodeURIComponent(query)}`, placeSearchResponseSchema).then(
      (response) => response.places
    );
  }

  addFriend(input: AddFriendRequest): Promise<FriendDto> {
    return this.request("POST", "/friends", friendSchema, input);
  }

  listFriends(): Promise<FriendDto[]> {
    return this.request("GET", "/friends", z.array(friendSchema));
  }

  createInvitation(input: CreateInvitationRequest): Promise<InvitationDetailsDto> {
    return this.request("POST", "/invitations", invitationDetailsSchema, input);
  }

  listReceivedInvitations(): Promise<ReceivedInvitationDto[]> {
    return this.request("GET", "/invitations/received", receivedInvitationListSchema);
  }

  listCreatedInvitations(): Promise<InvitationDetailsDto[]> {
    return this.request("GET", "/invitations/created", invitationListSchema);
  }

  getInvitation(id: string): Promise<InvitationDetailsDto> {
    return this.request("GET", `/invitations/${id}`, invitationDetailsSchema);
  }

  respondToInvitation(id: string, input: RespondToInvitationRequest): Promise<void> {
    return this.request("POST", `/invitations/${id}/respond`, z.unknown(), input).then(() => undefined);
  }

  private async request<TOutput>(
    method: "GET" | "POST",
    path: string,
    schema: z.ZodType<TOutput>,
    body?: unknown
  ): Promise<TOutput> {
    const headers: Record<string, string> = {
      Accept: "application/json"
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token !== null) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const requestInit: RequestInit = {
      method,
      headers
    };

    if (body !== undefined) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, requestInit);
    const payload = await readJson(response);

    if (!response.ok) {
      throw toApiClientError(response.status, payload);
    }

    return schema.parse(payload);
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

function toApiClientError(status: number, payload: unknown): ApiClientError {
  const parsed = z
    .object({
      error: z.object({
        code: z.string(),
        message: z.string()
      })
    })
    .safeParse(payload);

  if (parsed.success) {
    return new ApiClientError(parsed.data.error.message, status, parsed.data.error.code);
  }

  return new ApiClientError("Erreur réseau", status, "NETWORK_ERROR");
}
