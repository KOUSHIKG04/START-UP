type GoogleAddress = { formatted_address?: string; address_components?: { long_name?: string; types?: string[] }[] };
export function normalizeAddress(result: GoogleAddress | undefined) {
  if (!result?.formatted_address) return null;
  const part = (type: string) => result.address_components?.find(c => c.types?.includes(type))?.long_name ?? "";
  return {
    address: result.formatted_address,
    street: [part("street_number"), part("route")].filter(Boolean).join(" "),
    locality: part("sublocality_level_1") || part("sublocality") || part("neighborhood"),
    city: part("locality") || part("postal_town") || part("administrative_area_level_3"),
    state: part("administrative_area_level_1"), pincode: part("postal_code"),
  };
}
