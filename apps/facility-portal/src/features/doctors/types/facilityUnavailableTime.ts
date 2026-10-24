import type { unavailableServiceOptions as scopes } from "../utils/facilityScheduleEditorConstants";

export type Scope = (typeof scopes)[number][0];

export type FacilityUnavailableTimeProps = {
  practiceId: string;
};
