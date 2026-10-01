import { createClient } from "@/lib/supabase/server";
import { FacilityVerificationForm } from "@/features/facilities";

type Facility = {
  facility_id: string;
  facility_name: string;
  facility_kind: string;
};

export default async function FacilityVerificationPage() {
  const client = await createClient();
  
  const { data, error } = await client.rpc("list_my_inventory_facilities");
  
  const facilities = error ? [] : ((data as Facility[] | null) ?? []);
  
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Facility verification
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submit your registration certificate and operating licence for company
          review.
        </p>
      </header>
      {error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm"
        >
          Could not load your facilities. Refresh or contact your administrator.
        </p>
      ) : (
        <FacilityVerificationForm facilities={facilities} />
      )}
    </main>
  );
}
