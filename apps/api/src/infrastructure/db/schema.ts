import {
  check,
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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pseudo: text("pseudo").notNull(),
    publicTag: text("public_tag").notNull(),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    publicTagUniqueIdx: uniqueIndex("users_public_tag_unique_idx").on(table.publicTag),
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

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    respondedAt: timestamp("responded_at", { withTimezone: true })
  },
  (table) => ({
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
