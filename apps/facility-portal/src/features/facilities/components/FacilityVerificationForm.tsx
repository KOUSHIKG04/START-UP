"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { toast } from "@startup/web-ui/components/ui/toast";

type Facility = { facility_id: string; facility_name: string; facility_kind: string };
type Status = { status: string; documents: Array<{ kind: string; status: string; rejection_reason: string | null }> };

export function FacilityVerificationForm({ facilities }: { facilities: Facility[] }) {
  const [facilityId,setFacilityId] = useState(facilities[0]?.facility_id ?? "");
  const [registration,setRegistration] = useState("");
  const certificateRef = useRef<File | null>(null);
  const licenceRef = useRef<File | null>(null);
  const [status,setStatus] = useState<Status | null>(null);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const loadStatus = useCallback(async (id: string) => {
    if (!id) { setStatus(null); return; }
    const client = createBrowserSupabaseClient();
    const { data, error } = await client.rpc("get_my_verification_case",{p_subject_type:"facility",p_subject_id:id});
    if (error) throw error;
    setStatus(data as Status | null);
  }, []);
  useEffect(() => {
    if (!facilityId) return;
    let active = true;
    const client = createBrowserSupabaseClient();
    void client.rpc("get_my_verification_case", { p_subject_type: "facility", p_subject_id: facilityId })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage("Could not load verification status.");
        else setStatus(data as Status | null);
      });
    return () => { active = false; };
  }, [facilityId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const certificate = certificateRef.current;
    const licence = licenceRef.current;
    if (!facilityId || !certificate || !licence) {
      setMessage("Choose a facility and both documents.");
      toast.add({ title: "Missing documents", description: "Choose a facility and both documents.", type: "warning" });
      return;
    }
    setBusy(true); setMessage("");
    try {
      const client = createBrowserSupabaseClient();
      const { data: user, error: authError } = await client.auth.getUser();
      if (authError || !user.user) throw new Error("Your session expired. Sign in again.");
      const upload = async (file: File, kind: string) => {
        if (file.size > 10 * 1024 * 1024 || !["application/pdf","image/jpeg","image/png"].includes(file.type))
          throw new Error("Use a PDF, JPG or PNG file under 10 MB.");
        const path = `${user.user!.id}/${facilityId}/${kind}-${crypto.randomUUID()}`;
        const { error } = await client.storage.from("facility-evidence").upload(path,file,{contentType:file.type,upsert:false});
        if (error) throw error;
        return path;
      };
      const certificatePath = await upload(certificate,"registration-certificate");
      const licencePath = await upload(licence,"operating-licence");
      const { error } = await client.rpc("submit_my_facility_verification",{
        p_facility_id:facilityId,p_registration_number:registration.trim(),
        p_certificate_path:certificatePath,p_operating_licence_path:licencePath,
      });
      if (error) throw error;
      await loadStatus(facilityId);
      certificateRef.current = null; licenceRef.current = null;
      form.reset();
      setMessage("Submitted for company review.");
      toast.add({ title: "Submitted for company review", type: "success" });
    } catch (cause) {
      const errorMessage = cause instanceof Error ? cause.message : "Submission failed. Try again.";
      setMessage(errorMessage);
      toast.add({ title: "Submission failed", description: errorMessage, type: "error" });
    }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    {!facilities.length ? <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No facility is linked to this account yet.</p> : <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-6">
      <div className="space-y-2"><Label htmlFor="facility">Facility</Label><select id="facility" value={facilityId} onChange={(event) => { setFacilityId(event.target.value); setStatus(null); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{facilities.map((facility) => <option key={facility.facility_id} value={facility.facility_id}>{facility.facility_name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="registration">Registration number</Label><Input id="registration" value={registration} onChange={(event) => setRegistration(event.target.value)} minLength={4} maxLength={120} required /></div>
      <div className="space-y-2"><Label htmlFor="certificate">Registration certificate</Label><Input id="certificate" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { certificateRef.current = event.target.files?.[0] ?? null; }} required /><p className="text-xs text-muted-foreground">PDF, JPG or PNG, up to 10 MB.</p></div>
      <div className="space-y-2"><Label htmlFor="licence">Operating licence</Label><Input id="licence" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { licenceRef.current = event.target.files?.[0] ?? null; }} required /></div>
      <Button disabled={busy}>{busy ? "Uploading…" : "Submit for verification"}</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>}
    {status && <section className="rounded-xl border bg-card p-6"><h2 className="font-semibold">Review status: {status.status.replaceAll("_"," ")}</h2><ul className="mt-3 space-y-2 text-sm">{status.documents.map((document) => <li key={document.kind}><strong className="capitalize">{document.kind.replaceAll("_"," ")}</strong> — {document.status}{document.rejection_reason && <p className="text-destructive">{document.rejection_reason}</p>}</li>)}</ul></section>}
  </div>;
}
