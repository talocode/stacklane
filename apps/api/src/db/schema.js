"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingAccounts = exports.usageEvents = exports.apiKeys = exports.environments = exports.projects = exports.organizationMembers = exports.organizations = exports.users = exports.billingStatusEnum = exports.apiKeyStatusEnum = exports.environmentStatusEnum = exports.environmentKindEnum = exports.projectStatusEnum = exports.membershipStatusEnum = exports.membershipRoleEnum = exports.organizationStatusEnum = exports.userStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.userStatusEnum = (0, pg_core_1.pgEnum)("user_status", ["active", "invited", "suspended"]);
exports.organizationStatusEnum = (0, pg_core_1.pgEnum)("organization_status", [
    "active",
    "suspended"
]);
exports.membershipRoleEnum = (0, pg_core_1.pgEnum)("membership_role", ["owner", "admin", "member"]);
exports.membershipStatusEnum = (0, pg_core_1.pgEnum)("membership_status", [
    "active",
    "invited",
    "removed"
]);
exports.projectStatusEnum = (0, pg_core_1.pgEnum)("project_status", [
    "provisioning",
    "ready",
    "failed",
    "archived"
]);
exports.environmentKindEnum = (0, pg_core_1.pgEnum)("environment_kind", [
    "production",
    "development",
    "preview"
]);
exports.environmentStatusEnum = (0, pg_core_1.pgEnum)("environment_status", ["active", "disabled"]);
exports.apiKeyStatusEnum = (0, pg_core_1.pgEnum)("api_key_status", ["active", "revoked"]);
exports.billingStatusEnum = (0, pg_core_1.pgEnum)("billing_status", [
    "trial",
    "active",
    "past_due",
    "canceled"
]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    email: (0, pg_core_1.text)("email").notNull(),
    name: (0, pg_core_1.text)("name"),
    status: (0, exports.userStatusEnum)("status").default("active").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
});
exports.organizations = (0, pg_core_1.pgTable)("organizations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").notNull(),
    status: (0, exports.organizationStatusEnum)("status").default("active").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    organizationSlugUnique: (0, pg_core_1.unique)("organizations_slug_unique").on(table.slug)
}));
exports.organizationMembers = (0, pg_core_1.pgTable)("organization_members", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    role: (0, exports.membershipRoleEnum)("role").default("member").notNull(),
    status: (0, exports.membershipStatusEnum)("status").default("active").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    orgUserUnique: (0, pg_core_1.unique)("organization_members_org_user_unique").on(table.organizationId, table.userId),
    organizationIdx: (0, pg_core_1.index)("organization_members_organization_id_idx").on(table.organizationId),
    userIdx: (0, pg_core_1.index)("organization_members_user_id_idx").on(table.userId)
}));
exports.projects = (0, pg_core_1.pgTable)("projects", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").notNull(),
    status: (0, exports.projectStatusEnum)("status").default("provisioning").notNull(),
    createdByUserId: (0, pg_core_1.uuid)("created_by_user_id").references(() => exports.users.id, {
        onDelete: "set null"
    }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    orgSlugUnique: (0, pg_core_1.unique)("projects_org_slug_unique").on(table.organizationId, table.slug),
    organizationStatusIdx: (0, pg_core_1.index)("projects_organization_status_idx").on(table.organizationId, table.status)
}));
exports.environments = (0, pg_core_1.pgTable)("environments", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    projectId: (0, pg_core_1.uuid)("project_id")
        .notNull()
        .references(() => exports.projects.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    kind: (0, exports.environmentKindEnum)("kind").notNull(),
    status: (0, exports.environmentStatusEnum)("status").default("active").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    projectNameUnique: (0, pg_core_1.unique)("environments_project_name_unique").on(table.projectId, table.name),
    projectIdx: (0, pg_core_1.index)("environments_project_id_idx").on(table.projectId)
}));
exports.apiKeys = (0, pg_core_1.pgTable)("api_keys", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id").references(() => exports.organizations.id, {
        onDelete: "cascade"
    }),
    projectId: (0, pg_core_1.uuid)("project_id").references(() => exports.projects.id, {
        onDelete: "cascade"
    }),
    name: (0, pg_core_1.text)("name").notNull(),
    keyPrefix: (0, pg_core_1.text)("key_prefix").notNull(),
    hashedKey: (0, pg_core_1.text)("hashed_key").notNull(),
    scopes: (0, pg_core_1.jsonb)("scopes").$type().default((0, drizzle_orm_1.sql) `'[]'::jsonb`).notNull(),
    status: (0, exports.apiKeyStatusEnum)("status").default("active").notNull(),
    lastUsedAt: (0, pg_core_1.timestamp)("last_used_at", { withTimezone: true }),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true }),
    createdByUserId: (0, pg_core_1.uuid)("created_by_user_id").references(() => exports.users.id, {
        onDelete: "set null"
    }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    hashedKeyUnique: (0, pg_core_1.unique)("api_keys_hashed_key_unique").on(table.hashedKey),
    projectIdx: (0, pg_core_1.index)("api_keys_project_id_idx").on(table.projectId),
    organizationIdx: (0, pg_core_1.index)("api_keys_organization_id_idx").on(table.organizationId),
    keyTargetCheck: (0, pg_core_1.check)("api_keys_target_check", (0, drizzle_orm_1.sql) `${table.organizationId} IS NOT NULL OR ${table.projectId} IS NOT NULL`)
}));
exports.usageEvents = (0, pg_core_1.pgTable)("usage_events", {
    id: (0, pg_core_1.bigint)("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    projectId: (0, pg_core_1.uuid)("project_id")
        .notNull()
        .references(() => exports.projects.id, { onDelete: "cascade" }),
    environmentId: (0, pg_core_1.uuid)("environment_id").references(() => exports.environments.id, {
        onDelete: "set null"
    }),
    eventType: (0, pg_core_1.text)("event_type").notNull(),
    quantity: (0, pg_core_1.numeric)("quantity", { precision: 20, scale: 6 }).default("1").notNull(),
    unit: (0, pg_core_1.text)("unit").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").$type().default((0, drizzle_orm_1.sql) `'{}'::jsonb`).notNull(),
    occurredAt: (0, pg_core_1.timestamp)("occurred_at", { withTimezone: true }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    projectOccurredIdx: (0, pg_core_1.index)("usage_events_project_occurred_idx").on(table.projectId, table.occurredAt),
    organizationOccurredIdx: (0, pg_core_1.index)("usage_events_organization_occurred_idx").on(table.organizationId, table.occurredAt),
    eventTypeIdx: (0, pg_core_1.index)("usage_events_event_type_idx").on(table.eventType)
}));
exports.billingAccounts = (0, pg_core_1.pgTable)("billing_accounts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    provider: (0, pg_core_1.text)("provider").default("manual").notNull(),
    status: (0, exports.billingStatusEnum)("status").default("trial").notNull(),
    currency: (0, pg_core_1.text)("currency").default("NGN").notNull(),
    billingEmail: (0, pg_core_1.text)("billing_email"),
    externalCustomerRef: (0, pg_core_1.text)("external_customer_ref"),
    currentPlan: (0, pg_core_1.text)("current_plan").default("free").notNull(),
    trialEndsAt: (0, pg_core_1.timestamp)("trial_ends_at", { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    organizationUnique: (0, pg_core_1.unique)("billing_accounts_organization_unique").on(table.organizationId),
    externalCustomerRefUnique: (0, pg_core_1.unique)("billing_accounts_external_customer_ref_unique").on(table.externalCustomerRef)
}));
//# sourceMappingURL=schema.js.map