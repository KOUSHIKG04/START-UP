export type CredentialStatus = "pending" | "verified" | "suspended";
export type OrganizationRole =
  | "owner"
  | "receptionist"
  | "facility_admin"
  | "dispatcher"
  | "organization_admin";
/** Read-only server projection; never accept these roles from signup metadata. */
export interface MembershipProjection {
  organizationId: string;
  facilityId: string | null;
  role: OrganizationRole;
  doctorPracticeIds: string[];
}
export type DriverEnrollment =
  { kind: "independent" } | { kind: "invited"; invitationToken: string };
