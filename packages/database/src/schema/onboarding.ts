import { sql } from "drizzle-orm";
import {
  uuid,
  text,
  timestamp,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { clinzo } from "./common";
import { identity } from "./identity";
import { organization } from "./organizations";

// Single-use operator invitation. Plaintext tokens are never stored.
export const driverInvitation = clinzo
  .table(
    "driver_invitation",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      organization_id: uuid("organization_id")
        .notNull()
        .references(() => organization.id),
      token_hash: text("token_hash").notNull(),
      phone: text("phone").notNull(),
      created_by: uuid("created_by")
        .notNull()
        .references(() => identity.id),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
      expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    },
    (t) => [
      uniqueIndex("driver_invitation_token_uq").on(t.token_hash),
      index("driver_invitation_org_idx").on(t.organization_id),
      check("driver_invitation_expiry_ck", sql`expires_at > created_at`),
    ]
  )
  .enableRLS();

export const driverInvitationAcceptance = clinzo
  .table("driver_invitation_acceptance", {
    invitation_id: uuid("invitation_id")
      .primaryKey()
      .references(() => driverInvitation.id),
    identity_id: uuid("identity_id")
      .notNull()
      .references(() => identity.id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  })
  .enableRLS();
