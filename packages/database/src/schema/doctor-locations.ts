import { sql } from "drizzle-orm";
import { uuid, text, boolean, doublePrecision, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { clinzo } from "./common";
import { doctor } from "./directory";

// Personal Home-header addresses; never a consultation/practice location.
export const doctorSavedLocation = clinzo.table("doctor_saved_location", {
 id: uuid("id").primaryKey().defaultRandom(),
 doctor_id: uuid("doctor_id").notNull().references(() => doctor.id, { onDelete: "cascade" }),
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
 is_profile_address: boolean("is_profile_address").notNull().default(false),
 created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
 updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
 uniqueIndex("doctor_saved_location_profile_uq").on(table.doctor_id).where(sql`${table.is_profile_address}`),
 check("doctor_saved_location_profile_ck", sql`NOT ${table.is_profile_address} OR (${table.kind}='house' AND length(trim(coalesce(${table.building},'')))>=2 AND length(trim(coalesce(${table.locality},'')))>=2 AND length(trim(coalesce(${table.city},'')))>=2 AND length(trim(coalesce(${table.state},'')))>=2 AND ${table.pincode} IS NOT NULL)`),
 index("doctor_saved_location_doctor_idx").on(table.doctor_id, table.updated_at.desc()),
 uniqueIndex("doctor_saved_location_selected_uq").on(table.doctor_id).where(sql`${table.selected}`),
 uniqueIndex("doctor_saved_location_current_uq").on(table.doctor_id).where(sql`${table.kind} = 'current'`),
 check("doctor_saved_location_label_check", sql`length(trim(${table.label})) BETWEEN 1 AND 80`),
 check("doctor_saved_location_kind_check", sql`${table.kind} IN ('house','office','other','current')`),
 check("doctor_saved_location_coordinates_ck", sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL AND ${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180)`),
 check("doctor_saved_location_pincode_ck", sql`${table.pincode} IS NULL OR ${table.pincode} ~ '^[0-9]{6}$'`),
 check("doctor_saved_location_instructions_ck", sql`${table.instructions} IS NULL OR length(${table.instructions}) <= 500`),
 check("doctor_saved_location_receiver_ck", sql`${table.use_account_details} OR (length(trim(coalesce(${table.receiver_name},''))) BETWEEN 2 AND 120 AND ${table.receiver_phone} ~ '^\\+[1-9][0-9]{7,14}$')`),
]).enableRLS();
