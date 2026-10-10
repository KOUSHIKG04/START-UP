import { sql } from "drizzle-orm";
import { uuid, text, boolean, doublePrecision, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { clinzo } from "./common";
import { driver } from "./ambulance-workforce";

// Personal Home-header addresses; never dispatch or live-trip coordinates.
export const driverSavedLocation = clinzo.table("driver_saved_location", {
 id: uuid("id").primaryKey().defaultRandom(),
 driver_id: uuid("driver_id").notNull().references(() => driver.id, { onDelete: "cascade" }),
 label: text("label").notNull(),
 kind: text("kind", { enum: ["house", "office", "other", "current"] }).notNull(),
 building: text("building"),
 street: text("street"),
 locality: text("locality"),
 city: text("city"),
 state: text("state"),
 pincode: text("pincode"),
 instructions: text("instructions"),
 receiver_name: text("receiver_name"),
 receiver_phone: text("receiver_phone"),

 latitude: doublePrecision("latitude"), longitude: doublePrecision("longitude"),
 use_account_details: boolean("use_account_details").notNull().default(true),
 selected: boolean("selected").notNull().default(false),
 created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
 updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
 index("driver_saved_location_driver_idx").on(table.driver_id, table.updated_at.desc()),
 uniqueIndex("driver_saved_location_selected_uq").on(table.driver_id).where(sql`${table.selected}`),
 uniqueIndex("driver_saved_location_current_uq").on(table.driver_id).where(sql`${table.kind} = 'current'`),
 check("driver_saved_location_label_check", sql`length(trim(${table.label})) BETWEEN 1 AND 80`),
 check("driver_saved_location_kind_check", sql`${table.kind} IN ('house','office','other','current')`),
 check("driver_saved_location_coordinates_ck", sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL AND ${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180)`),
 check("driver_saved_location_pincode_ck", sql`${table.pincode} IS NULL OR ${table.pincode} ~ '^[0-9]{6}$'`),
 check("driver_saved_location_instructions_ck", sql`${table.instructions} IS NULL OR length(${table.instructions}) <= 500`),
 check("driver_saved_location_receiver_ck", sql`${table.use_account_details} OR (length(trim(coalesce(${table.receiver_name},''))) BETWEEN 2 AND 120 AND ${table.receiver_phone} ~ '^\\+[1-9][0-9]{7,14}$')`),
]).enableRLS();
