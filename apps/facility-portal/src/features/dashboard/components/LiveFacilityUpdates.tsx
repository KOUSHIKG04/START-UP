"use client";

import { useLiveFacilityUpdates } from "../hooks/useLiveFacilityUpdates";

import type { LiveFacilityUpdatesProps } from "../types/liveFacilityUpdates";

export function LiveFacilityUpdates({ facilityIds }: LiveFacilityUpdatesProps) {
  useLiveFacilityUpdates({ facilityIds });
  return null;
}
