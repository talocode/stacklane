import {
  bigint,
  check,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userStatusEnum = pgEnum("user_status", ["active", "invited", "suspended"]);
export const organizationStatusEnum = pgEnum("organization_status", [
  "active",
  "suspended"
]);
export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "member"]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "removed"
]);
export const projectStatusEnum = pgEnum("project_status", [
  "provisioning",
  "ready",
  "failed",
  "archived"
]);
export const environmentKindEnum = pgEnum("environment_kind", [
  "production",
  "development",
  "preview"
]);
export const environmentStatusEnum = pgEnum("environment_status", ["active", "disabled"]);
export const apiKeyStatusEnum = pgEnum("api_key_status", ["active", "revoked"]);
export const billingStatusEnum = pgEnum("billing_status", [
  "trial",
  "active",
  "past_due",
  "canceled"
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  status: userStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: organizationStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationSlugUnique: unique("organizations_slug_unique").on(table.slug)
  })
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").default("member").notNull(),
    status: membershipStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    orgUserUnique: unique("organization_members_org_user_unique").on(
      table.organizationId,
      table.userId
    ),
    organizationIdx: index("organization_members_organization_id_idx").on(table.organizationId),
    userIdx: index("organization_members_user_id_idx").on(table.userId)
  })
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: projectStatusEnum("status").default("provisioning").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    orgSlugUnique: unique("projects_org_slug_unique").on(table.organizationId, table.slug),
    organizationStatusIdx: index("projects_organization_status_idx").on(
      table.organizationId,
      table.status
    )
  })
);

export const environments = pgTable(
  "environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: environmentKindEnum("kind").notNull(),
    status: environmentStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    projectNameUnique: unique("environments_project_name_unique").on(table.projectId, table.name),
    projectIdx: index("environments_project_id_idx").on(table.projectId)
  })
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade"
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade"
    }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    hashedKey: text("hashed_key").notNull(),
    scopes: jsonb("scopes").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    status: apiKeyStatusEnum("status").default("active").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    hashedKeyUnique: unique("api_keys_hashed_key_unique").on(table.hashedKey),
    projectIdx: index("api_keys_project_id_idx").on(table.projectId),
    organizationIdx: index("api_keys_organization_id_idx").on(table.organizationId),
    keyTargetCheck: check(
      "api_keys_target_check",
      sql`${table.organizationId} IS NOT NULL OR ${table.projectId} IS NOT NULL`
    )
  })
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    environmentId: uuid("environment_id").references(() => environments.id, {
      onDelete: "set null"
    }),
    eventType: text("event_type").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).default("1").notNull(),
    unit: text("unit").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    projectOccurredIdx: index("usage_events_project_occurred_idx").on(
      table.projectId,
      table.occurredAt
    ),
    organizationOccurredIdx: index("usage_events_organization_occurred_idx").on(
      table.organizationId,
      table.occurredAt
    ),
    eventTypeIdx: index("usage_events_event_type_idx").on(table.eventType)
  })
);

export const billingAccounts = pgTable(
  "billing_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").default("manual").notNull(),
    status: billingStatusEnum("status").default("trial").notNull(),
    currency: text("currency").default("NGN").notNull(),
    billingEmail: text("billing_email"),
    externalCustomerRef: text("external_customer_ref"),
    currentPlan: text("current_plan").default("free").notNull(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationUnique: unique("billing_accounts_organization_unique").on(table.organizationId),
    externalCustomerRefUnique: unique("billing_accounts_external_customer_ref_unique").on(
      table.externalCustomerRef
    )
  })
);
