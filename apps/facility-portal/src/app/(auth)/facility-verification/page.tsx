import { redirect } from "next/navigation";
import { FacilityVerificationForm } from "@/features/facilities";
import { signOut } from "@/features/auth";
import { getFacilityAccess } from "@/server/auth/facilityAccess";

export const dynamic = "force-dynamic";

export default async function FacilityVerificationPage() {
  const { approved, facilities } = await getFacilityAccess();
  if (approved) redirect("/dashboard");

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Facility verification</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Register your hospital or clinic and submit its registration certificate
          and operating licence for company review.
        </p>
        <form action={signOut} className="mt-3">
          <button type="submit" className="text-sm underline">Sign out</button>
        </form>
      </header>
      <FacilityVerificationForm facilities={facilities.map((facility) => ({
        facility_id: facility.facilityId,
        facility_name: facility.facilityName,
        facility_kind: facility.facilityKind,
      }))} />
    </main>
  );
}
