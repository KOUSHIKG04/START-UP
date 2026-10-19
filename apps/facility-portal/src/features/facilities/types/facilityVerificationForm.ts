export type Facility = {
  facility_id: string;
  facility_name: string;
  facility_kind: string;
};

export type Status = {
  status: string;
  documents: Array<{
    kind: string;
    status: string;
    rejection_reason: string | null;
  }>;
};

export type FacilityLocation = { latitude: number; longitude: number };

export type FacilityVerificationFormProps = {
  facilities: Facility[];
};
