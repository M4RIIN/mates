import { z } from "zod";

export const publicTagSchema = z
  .string()
  .min(7)
  .max(37)
  .regex(/^[A-Za-z0-9_.-]{2,32}#[0-9]{4}$/, "Expected format pseudo#1234");

export const pseudoSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_.-]+$/, "Pseudo can contain letters, numbers, dots, underscores and hyphens");

export const passwordSchema = z.string().min(8).max(128);

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const responseStatusSchema = z.enum(["pending", "yes", "no"]);
export type ResponseStatus = z.infer<typeof responseStatusSchema>;
export const friendshipStatusSchema = z.enum(["pending", "active", "blocked"]);
export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>;

export const platformSchema = z.enum(["ios", "android", "web", "unknown"]);
export type PushPlatform = z.infer<typeof platformSchema>;

export const registerRequestSchema = z.object({
  pseudo: pseudoSchema,
  password: passwordSchema
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(2).max(64),
  password: passwordSchema
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const currentUserSchema = z.object({
  id: z.string().uuid(),
  pseudo: pseudoSchema,
  publicTag: publicTagSchema,
  createdAt: isoDateTimeSchema
});
export type CurrentUserDto = z.infer<typeof currentUserSchema>;

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  pseudo: pseudoSchema,
  publicTag: publicTagSchema
});
export type PublicUserDto = z.infer<typeof publicUserSchema>;

export const authResponseSchema = z.object({
  token: z.string().min(1),
  user: currentUserSchema
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const googleIdTokenSchema = z.string().trim().min(1).max(8192);

export const googleAuthRequestSchema = z.object({
  idToken: googleIdTokenSchema
});
export type GoogleAuthRequest = z.infer<typeof googleAuthRequestSchema>;

export const completeGoogleProfileRequestSchema = z.object({
  idToken: googleIdTokenSchema,
  pseudo: pseudoSchema
});
export type CompleteGoogleProfileRequest = z.infer<typeof completeGoogleProfileRequestSchema>;

export const googleAuthResponseSchema = z.discriminatedUnion("status", [
  authResponseSchema.extend({
    status: z.literal("authenticated")
  }),
  z.object({
    status: z.literal("profile_required")
  })
]);
export type GoogleAuthResponse = z.infer<typeof googleAuthResponseSchema>;

export const registerPushTokenRequestSchema = z.object({
  token: z.string().min(8).max(4096),
  platform: platformSchema
});
export type RegisterPushTokenRequest = z.infer<typeof registerPushTokenRequestSchema>;

export const addFriendRequestSchema = z.object({
  publicTag: publicTagSchema
});
export type AddFriendRequest = z.infer<typeof addFriendRequestSchema>;

export const friendRequestSchema = z.object({
  id: z.string().uuid(),
  requester: publicUserSchema,
  addressee: publicUserSchema,
  status: friendshipStatusSchema,
  createdAt: isoDateTimeSchema
});
export type FriendRequestDto = z.infer<typeof friendRequestSchema>;

export const friendSchema = publicUserSchema.extend({
  friendshipCreatedAt: isoDateTimeSchema
});
export type FriendDto = z.infer<typeof friendSchema>;

export const friendGroupMemberSchema = publicUserSchema;
export type FriendGroupMemberDto = z.infer<typeof friendGroupMemberSchema>;

export const createFriendGroupRequestSchema = z.object({
  name: z.string().trim().min(1).max(48),
  memberUserIds: z.array(z.string().uuid()).min(1).max(100)
});
export type CreateFriendGroupRequest = z.infer<typeof createFriendGroupRequestSchema>;

export const updateFriendGroupMembersRequestSchema = z.object({
  memberUserIds: z.array(z.string().uuid()).min(1).max(100)
});
export type UpdateFriendGroupMembersRequest = z.infer<typeof updateFriendGroupMembersRequestSchema>;

export const friendGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(48),
  createdAt: isoDateTimeSchema,
  members: z.array(friendGroupMemberSchema)
});
export type FriendGroupDto = z.infer<typeof friendGroupSchema>;

export const invitationFriendGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(48)
});
export type InvitationFriendGroupDto = z.infer<typeof invitationFriendGroupSchema>;

export const placeInputSchema = z.object({
  placeName: z.string().trim().min(1).max(160),
  placeAddress: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});
export type PlaceInput = z.infer<typeof placeInputSchema>;

export const placeCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().max(240).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable()
});
export type PlaceCandidateDto = z.infer<typeof placeCandidateSchema>;

export const placeSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  countryCode: z
    .string()
    .trim()
    .regex(/^[a-z]{2}$/i)
    .transform((value) => value.toUpperCase())
    .optional(),
  limit: z.coerce.number().int().min(1).max(10).default(8)
});
export type PlaceSearchQuery = z.infer<typeof placeSearchQuerySchema>;

export const placeSearchResponseSchema = z.object({
  places: z.array(placeCandidateSchema)
});
export type PlaceSearchResponse = z.infer<typeof placeSearchResponseSchema>;

export const createInvitationRequestSchema = placeInputSchema.extend({
  scheduledAt: isoDateTimeSchema,
  friendGroupId: z.string().uuid().optional()
});
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;

export const respondToInvitationRequestSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("yes"),
    delayMinutes: z.number().int().min(0).max(24 * 60).optional()
  }),
  z.object({
    status: z.literal("no"),
    delayMinutes: z.undefined().optional()
  })
]);
export type RespondToInvitationRequest = z.infer<typeof respondToInvitationRequestSchema>;

export const invitationRecipientSchema = z.object({
  id: z.string().uuid(),
  user: publicUserSchema,
  responseStatus: responseStatusSchema,
  delayMinutes: z.number().int().min(0).nullable(),
  respondedAt: isoDateTimeSchema.nullable()
});
export type InvitationRecipientDto = z.infer<typeof invitationRecipientSchema>;

export const invitationDetailsSchema = z.object({
  id: z.string().uuid(),
  creator: publicUserSchema,
  friendGroup: invitationFriendGroupSchema.nullable(),
  placeName: z.string(),
  placeAddress: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  scheduledAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  canceledAt: isoDateTimeSchema.nullable(),
  recipients: z.array(invitationRecipientSchema)
});
export type InvitationDetailsDto = z.infer<typeof invitationDetailsSchema>;

export const receivedInvitationSchema = invitationDetailsSchema.extend({
  myResponse: invitationRecipientSchema
});
export type ReceivedInvitationDto = z.infer<typeof receivedInvitationSchema>;

export const invitationListSchema = z.array(invitationDetailsSchema);
export const receivedInvitationListSchema = z.array(receivedInvitationSchema);

export const userSearchQuerySchema = z.object({
  tag: publicTagSchema
});
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});
export type ApiErrorDto = z.infer<typeof apiErrorSchema>;

export const realtimeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("friend.request.created"),
    friendshipId: z.string().uuid()
  }),
  z.object({
    type: z.literal("friend.request.accepted"),
    friendshipId: z.string().uuid()
  }),
  z.object({
    type: z.literal("invitation.created"),
    invitationId: z.string().uuid()
  }),
  z.object({
    type: z.literal("invitation.cancelled"),
    invitationId: z.string().uuid()
  }),
  z.object({
    type: z.literal("invitation.response.updated"),
    invitationId: z.string().uuid(),
    userId: z.string().uuid(),
    responseStatus: responseStatusSchema
  })
]);
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
