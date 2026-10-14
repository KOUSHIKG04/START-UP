import { z } from "zod";
export const mapPlaceSchema = z.object({
  id: z.string(), name: z.string(), address: z.string(),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  street: z.string(), locality: z.string(), city: z.string(), state: z.string(), pincode: z.string(),
  attributions: z.array(z.object({ provider: z.string(), uri: z.string().optional() })).default([]),
});
export const mapSearchInputSchema = z.object({ query: z.string().trim().min(2).max(160),
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(),
}).refine(v => (v.latitude === undefined) === (v.longitude === undefined), "Provide both coordinates or neither");
export const mapSearchResultSchema = z.object({ configured: z.boolean(), places: mapPlaceSchema.array() });
export type MapPlace = z.infer<typeof mapPlaceSchema>;

export const mapPointInputSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export const mapAddressSchema = mapPlaceSchema.pick({ address: true, street: true, locality: true, city: true, state: true, pincode: true });
export const mapAddressResultSchema = z.object({ configured: z.boolean(), address: mapAddressSchema.nullable() });
