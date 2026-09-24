import { customType, pgSchema } from "drizzle-orm/pg-core";
export const clinzo = pgSchema("clinzo");
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
// PostGIS values are EWKB/EWKT strings; use SQL ST_MakePoint for coordinate input.
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType: () => "extensions.geography(Point,4326)",
});
export const geographyArea = customType<{ data: string; driverData: string }>({
  dataType: () => "extensions.geography(MultiPolygon,4326)",
});
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});
