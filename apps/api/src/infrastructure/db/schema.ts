import {
  check,
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const friendshipStatusEnum = pgEnum("friendship_status", ["pending", "active", "blocked"]);
export const responseStatusEnum = pgEnum("response_status", ["pending", "yes", "no"]);
export const pushPlatformEnum = pgEnum("push_platform", ["ios", "android", "web", "unknown"]);
export const invitationAuditEventTypeEnum = pgEnum("invitation_audit_event_type", [
  "created",
  "accepted",
  "uber_requested",
  "reservation_requested"
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pseudo: text("pseudo").notNull(),
    publicTag: text("public_tag").notNull(),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    appleSub: text("apple_sub"),
    appleRefreshToken: text("apple_refresh_token"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    publicTagUniqueIdx: uniqueIndex("users_public_tag_unique_idx").on(table.publicTag),
    appleSubUniqueIdx: uniqueIndex("users_apple_sub_unique_idx").on(table.appleSub),
    googleSubUniqueIdx: uniqueIndex("users_google_sub_unique_idx").on(table.googleSub)
  })
);

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: pushPlatformEnum("platform").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userTokenUniqueIdx: uniqueIndex("push_tokens_user_token_unique_idx").on(table.userId, table.token),
    userIdx: index("push_tokens_user_idx").on(table.userId)
  })
);

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    noSelfCheck: check("friendships_no_self", sql`${table.requesterId} <> ${table.addresseeId}`),
    requesterAddresseeUniqueIdx: uniqueIndex("friendships_requester_addressee_unique_idx").on(
      table.requesterId,
      table.addresseeId
    ),
    requesterIdx: index("friendships_requester_idx").on(table.requesterId),
    addresseeIdx: index("friendships_addressee_idx").on(table.addresseeId)
  })
);

export const friendGroups = pgTable(
  "friend_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ownerIdx: index("friend_groups_owner_idx").on(table.ownerId)
  })
);

export const friendGroupMembers = pgTable(
  "friend_group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => friendGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
  },
  (table) => ({
    groupUserUniqueIdx: uniqueIndex("friend_group_members_group_user_unique_idx").on(table.groupId, table.userId),
    groupIdx: index("friend_group_members_group_idx").on(table.groupId),
    userIdx: index("friend_group_members_user_idx").on(table.userId)
  })
);

// Automatically captured venues are private to the statistical reference by default.
export const establishments = pgTable("establishments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  countryCode: text("country_code"),
  listingStatus: text("listing_status").notNull().default("unlisted"),
  active: boolean("active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  featuredRadiusKm: doublePrecision("featured_radius_km").notNull().default(10),
  identityKey: text("identity_key").generatedAlwaysAs(sql`public.mates_establishment_key(name, address, latitude, longitude)`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  identityUnique: uniqueIndex("establishments_identity_unique_idx").on(table.identityKey),
  publicationIdx: index("establishments_publication_idx").on(table.active, table.listingStatus),
  validName: check("establishments_name", sql`char_length(btrim(${table.name})) BETWEEN 1 AND 160`),
  validAddress: check("establishments_address", sql`${table.address} IS NULL OR char_length(${table.address}) <= 240`),
  validListing: check("establishments_listing", sql`${table.listingStatus} IN ('unlisted', 'listed', 'featured')`),
  validCountry: check("establishments_country", sql`${table.countryCode} IS NULL OR ${table.countryCode} ~ '^[A-Z]{2}$'`),
  validCoordinates: check("establishments_coordinates", sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL AND ${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180)`),
  validRadius: check("establishments_radius", sql`${table.featuredRadiusKm} > 0 AND ${table.featuredRadiusKm} < 'Infinity'::float8`),
  featuredCoordinates: check("establishments_featured_coordinates", sql`${table.listingStatus} <> 'featured' OR (${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL)`)
}));

export const establishmentExternalRefs = pgTable("establishment_external_refs", {
  id: uuid("id").primaryKey().defaultRandom(),
  establishmentId: uuid("establishment_id").notNull().references(() => establishments.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull()
}, (table) => ({
  referenceUnique: uniqueIndex("establishment_external_refs_unique_idx").on(table.provider, table.externalId),
  establishmentIdx: index("establishment_external_refs_establishment_idx").on(table.establishmentId),
  providerCheck: check("establishment_external_refs_provider", sql`${table.provider} IN ('photon', 'mapbox', 'mock')`)
}));

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    establishmentId: uuid("establishment_id").references(() => establishments.id, { onDelete: "set null" }),
    friendGroupId: uuid("friend_group_id").references(() => friendGroups.id, { onDelete: "set null" }),
    placeName: text("place_name").notNull(),
    placeAddress: text("place_address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    creatorIdx: index("invitations_creator_idx").on(table.creatorId),
    establishmentCreatedIdx: index("invitations_establishment_created_idx").on(table.establishmentId, table.createdAt),
    establishmentScheduledIdx: index("invitations_establishment_scheduled_idx").on(table.establishmentId, table.scheduledAt),
    friendGroupIdx: index("invitations_friend_group_idx").on(table.friendGroupId),
    scheduledAtIdx: index("invitations_scheduled_at_idx").on(table.scheduledAt)
  })
);

export const invitationRecipients = pgTable(
  "invitation_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    responseStatus: responseStatusEnum("response_status").notNull().default("pending"),
    delayMinutes: integer("delay_minutes"),
    advanceRequest: text("advance_request"),
    respondedAt: timestamp("responded_at", { withTimezone: true })
  },
  (table) => ({
    advanceRequestForDelayCheck: check(
      "invitation_recipients_advance_request_for_delay",
      sql`${table.advanceRequest} IS NULL OR (${table.responseStatus} = 'yes' AND coalesce(${table.delayMinutes}, 0) > 0 AND char_length(btrim(${table.advanceRequest})) BETWEEN 1 AND 300)`
    ),
    delayForYesOnlyCheck: check(
      "invitation_recipients_delay_for_yes_only",
      sql`(${table.responseStatus} = 'yes' AND (${table.delayMinutes} IS NULL OR ${table.delayMinutes} >= 0)) OR (${table.responseStatus} IN ('pending', 'no') AND ${table.delayMinutes} IS NULL)`
    ),
    invitationUserUniqueIdx: uniqueIndex("invitation_recipients_invitation_user_unique_idx").on(
      table.invitationId,
      table.userId
    ),
    userIdx: index("invitation_recipients_user_idx").on(table.userId),
    invitationIdx: index("invitation_recipients_invitation_idx").on(table.invitationId)
  })
);

export const invitationAuditEvents = pgTable(
  "invitation_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    parentAuditEventId: uuid("parent_audit_event_id"),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: invitationAuditEventTypeEnum("event_type").notNull(),
    placeName: text("place_name").notNull(),
    placeAddress: text("place_address"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    invitedCount: integer("invited_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    invitationIdx: index("invitation_audit_events_invitation_idx").on(table.invitationId),
    parentAuditEventIdx: index("invitation_audit_events_parent_audit_event_idx").on(table.parentAuditEventId),
    actorUserIdx: index("invitation_audit_events_actor_user_idx").on(table.actorUserId),
    invitationCreatedUniqueIdx: uniqueIndex("invitation_audit_events_created_unique_idx")
      .on(table.invitationId, table.eventType)
      .where(sql`${table.eventType} = 'created'`),
    invitedCountCheck: check("invitation_audit_events_invited_count_positive", sql`${table.invitedCount} >= 0`)
  })
);

export const invitationShareLinks = pgTable("invitation_share_links", {
  invitationId: uuid("invitation_id").primaryKey().references(() => invitations.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  showAddress: boolean("show_address").notNull().default(false),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const invitationGuestResponses = pgTable("invitation_guest_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  invitationId: uuid("invitation_id").notNull().references(() => invitations.id, { onDelete: "cascade" }),
  guestKeyHash: text("guest_key_hash").notNull(),
  analyticsBrowserIdHash: text("analytics_browser_id_hash"),
  name: text("name").notNull(),
  responseStatus: responseStatusEnum("response_status").notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  browserHashCheck: check("invitation_guest_responses_browser_hash", sql`${table.analyticsBrowserIdHash} IS NULL OR ${table.analyticsBrowserIdHash} ~ '^[a-f0-9]{64}$'`),
  guestUnique: uniqueIndex("invitation_guest_responses_identity_idx").on(table.invitationId, table.guestKeyHash),
  validStatus: check("invitation_guest_responses_status", sql`${table.responseStatus} IN ('yes', 'no')`)
}));
