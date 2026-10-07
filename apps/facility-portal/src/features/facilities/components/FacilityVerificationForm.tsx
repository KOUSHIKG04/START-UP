"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { Skeleton } from "@startup/web-ui/components/ui/skeleton";
import { Spinner } from "@startup/web-ui/components/ui/spinner";
import { toast } from "@startup/web-ui/components/ui/toast";
import { listBedTypeCatalog, registerMyCareFacility } from "@startup/data-access";
import type { BedTypeCatalogItem } from "@startup/contracts";
import { useRouter } from "next/navigation";

type Facility = { facility_id: string; facility_name: string; facility_kind: string };
type Status = { status: string; documents: Array<{ kind: string; status: string; rejection_reason: string | null }> };
type FacilityLocation = { latitude: number; longitude: number };

function getFacilityLocation(): Promise<FacilityLocation> {
  if (!navigator.geolocation) return Promise.reject(new Error("Location is unavailable in this browser. Use a supported browser at the facility."));
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    () => reject(new Error("Allow location access while at the facility, then try again.")),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
  ));
}

export function FacilityVerificationForm({ facilities }: { facilities: Facility[] }) {
  const router = useRouter();
  const [facilityName,setFacilityName] = useState("");
  const [facilityKind,setFacilityKind] = useState<"hospital" | "clinic">("hospital");
  const [facilityAddress,setFacilityAddress] = useState("");
  const [facilityLocality,setFacilityLocality] = useState("");
  const [facilityCity,setFacilityCity] = useState("");
  const [facilityState,setFacilityState] = useState("");
  const [facilityPincode,setFacilityPincode] = useState("");
  const [facilityLocation,setFacilityLocation] = useState<FacilityLocation | null>(null);
  const [locating,setLocating] = useState(false);
  const [offersBeds,setOffersBeds] = useState<boolean | null>(null);
  const [bedTypeCodes,setBedTypeCodes] = useState<string[]>([]);
  const [bedTypes,setBedTypes] = useState<BedTypeCatalogItem[]>([]);
  const [bedTypesError,setBedTypesError] = useState("");
  const [registering,setRegistering] = useState(false);
  const [facilityId,setFacilityId] = useState("");
  const activeFacilityId = facilityId || facilities[0]?.facility_id || "";
  const [registration,setRegistration] = useState("");
  const certificateRef = useRef<File | null>(null);
  const licenceRef = useRef<File | null>(null);
  const [status,setStatus] = useState<Status | null>(null);
  const [statusLoading,setStatusLoading] = useState(facilities.length > 0);
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    if (facilities.length) return;
    let active = true;
    void listBedTypeCatalog(createBrowserSupabaseClient())
      .then(items => { if (active) setBedTypes(items); })
      .catch(() => { if (active) { setBedTypesError("Could not load bed categories. Refresh and try again."); toast.add({ title: "Could not load bed categories", description: "Refresh and try again.", type: "error" }); } });
    return () => { active = false; };
  }, [facilities.length]);
  const loadStatus = useCallback(async (id: string) => {
    if (!id) { setStatus(null); return null; }
    const client = createBrowserSupabaseClient();
    const { data, error } = await client.rpc("get_my_verification_case",{p_subject_type:"facility",p_subject_id:id});
    if (error) throw error;
    const nextStatus = data as Status | null;
    setStatus(nextStatus);
    return nextStatus;
  }, []);
  async function checkStatus() {
    setStatusLoading(true);
    try {
      const current = await loadStatus(activeFacilityId);
      if (current?.status === "verified") {
        router.replace("/dashboard");
      } else {
        toast.add({ title: "Company verification is still pending", description: "Check again after the reviewer verifies the facility.", type: "info" });
      }
    } catch (cause) {
      toast.add({ title: "Could not check verification status", description: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally {
      setStatusLoading(false);
    }
  }
  useEffect(() => {
    if (!activeFacilityId) return;
    let active = true;
    const client = createBrowserSupabaseClient();
    void client.rpc("get_my_verification_case", { p_subject_type: "facility", p_subject_id: activeFacilityId })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.add({ title: "Could not load verification status", type: "error" });
        else setStatus(data as Status | null);
        setStatusLoading(false);
      });
    return () => { active = false; };
  }, [activeFacilityId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const certificate = certificateRef.current;
    const licence = licenceRef.current;
    if (!activeFacilityId || !certificate || !licence) {
      toast.add({ title: "Missing documents", description: "Choose a facility and both documents.", type: "warning" });
      return;
    }
    setBusy(true);
    try {
      const client = createBrowserSupabaseClient();
      const { data: user, error: authError } = await client.auth.getUser();
      if (authError || !user.user) throw new Error("Your session expired. Sign in again.");
      const upload = async (file: File, kind: string) => {
        if (file.size > 10 * 1024 * 1024 || !["application/pdf","image/jpeg","image/png"].includes(file.type))
          throw new Error("Use a PDF, JPG or PNG file under 10 MB.");
        const path = `${user.user!.id}/${activeFacilityId}/${kind}-${crypto.randomUUID()}`;
        const { error } = await client.storage.from("facility-evidence").upload(path,file,{contentType:file.type,upsert:false});
        if (error) throw error;
        return path;
      };
      const certificatePath = await upload(certificate,"registration-certificate");
      const licencePath = await upload(licence,"operating-licence");
      const { error } = await client.rpc("submit_my_facility_verification",{
        p_facility_id:activeFacilityId,p_registration_number:registration.trim(),
        p_certificate_path:certificatePath,p_operating_licence_path:licencePath,
      });
      if (error) throw error;
      await loadStatus(activeFacilityId);
      certificateRef.current = null; licenceRef.current = null;
      form.reset();
      toast.add({ title: "Submitted for company review", type: "success" });
    } catch (cause) {
      const errorMessage = cause instanceof Error ? cause.message : "Submission failed. Try again.";
      toast.add({ title: "Submission failed", description: errorMessage, type: "error" });
    }
    finally { setBusy(false); }
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (offersBeds === null || (offersBeds && bedTypeCodes.length === 0)) {
      toast.add({ title: "Complete bed services", description: "Choose whether beds are offered, then select the offered categories.", type: "warning" });
      return;
    }
    setRegistering(true);
    try {
      const location = facilityLocation ?? await getFacilityLocation();
      const address = [facilityAddress,facilityLocality,facilityCity,facilityState,facilityPincode]
        .map(part => part.trim()).join(", ");
      await registerMyCareFacility(createBrowserSupabaseClient(), {
        name:facilityName.trim(),kind:facilityKind,address,
        locality:facilityLocality.trim(),city:facilityCity.trim(),
        state:facilityState.trim(),pincode:facilityPincode.trim(),
        offersBeds,bedTypeCodes:offersBeds ? bedTypeCodes : [],
        latitude:location.latitude,longitude:location.longitude,
      });
      toast.add({title:"Facility registered",description:"Upload its registration certificate and operating licence next.",type:"success"});
      setStatusLoading(true);
      router.refresh();
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Could not register the facility. Allow location access while at the facility.";
      toast.add({title:"Registration failed",description:text,type:"error"});
    } finally { setRegistering(false); }
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const location = await getFacilityLocation();
      setFacilityLocation(location);
      const response = await fetch("/api/facility-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      const result = await response.json() as {
        address?: string; locality?: string; city?: string; state?: string;
        pincode?: string; error?: string;
      };
      if (response.ok && result.address) {
        setFacilityAddress(current => current.trim() ? current : result.address ?? "");
        setFacilityLocality(current => current.trim() ? current : result.locality ?? "");
        setFacilityCity(current => current.trim() ? current : result.city ?? "");
        setFacilityState(current => current.trim() ? current : result.state ?? "");
        setFacilityPincode(current => current.trim() ? current : result.pincode ?? "");
        toast.add({ title: "Location captured", description: "Check each address field and fill any missing details.", type: "success" });
      } else {
        toast.add({ title: "Location captured", description: result.error ?? "Enter the facility address manually.", type: "info" });
      }
    } catch (cause) {
      toast.add({ title: "Could not capture location", description: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally {
      setLocating(false);
    }
  }

  const awaitingReview = status?.status === "pending" || status?.status === "under_review";
  const addressFields = <div className="space-y-3">
    <div className="space-y-2">
      <Label htmlFor="facility-address">Street address</Label>
      <Input id="facility-address" placeholder="Street address" value={facilityAddress} onChange={event => setFacilityAddress(event.target.value)} minLength={5} maxLength={500} required />
    </div>
    <div className="space-y-2">
      <Label htmlFor="facility-locality">Area / locality</Label>
      <Input id="facility-locality" placeholder="Area or locality" value={facilityLocality} onChange={event => setFacilityLocality(event.target.value)} minLength={2} maxLength={120} required />
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="facility-city">City</Label>
        <Input id="facility-city" placeholder="City" value={facilityCity} onChange={event => setFacilityCity(event.target.value)} minLength={2} maxLength={120} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="facility-state">State</Label>
        <Input id="facility-state" placeholder="State" value={facilityState} onChange={event => setFacilityState(event.target.value)} minLength={2} maxLength={120} required />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="facility-pincode">Pincode</Label>
      <Input id="facility-pincode" placeholder="6-digit pincode" value={facilityPincode} onChange={event => setFacilityPincode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
    </div>
    <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating || registering}>{locating ? <Spinner aria-label="Getting location" /> : "Use current location"}</Button>
  </div>;

  return <div className="space-y-5">
    {!facilities.length ? <form onSubmit={register} className="space-y-5 rounded-xl border bg-card p-6"><h2 className="font-semibold">Register your hospital or clinic</h2><p className="text-sm text-muted-foreground">Be at the facility to capture its location. Registration remains pending until Clinzo approves its documents.</p><div className="space-y-2"><Label htmlFor="facility-name">Facility name</Label><Input id="facility-name" value={facilityName} onChange={event=>setFacilityName(event.target.value)} minLength={2} maxLength={160} required /></div><div className="space-y-2"><Label htmlFor="facility-kind">Type</Label><select id="facility-kind" value={facilityKind} onChange={event=>setFacilityKind(event.target.value as "hospital" | "clinic")} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="hospital">Hospital</option><option value="clinic">Clinic</option></select></div>{addressFields}<fieldset className="space-y-2"><legend className="text-sm font-medium">Does this facility offer patient beds?</legend><div className="flex gap-5 text-sm"><label className="flex items-center gap-2"><input type="radio" name="offers-beds" checked={offersBeds === true} onChange={() => setOffersBeds(true)} required />Yes</label><label className="flex items-center gap-2"><input type="radio" name="offers-beds" checked={offersBeds === false} onChange={() => { setOffersBeds(false); setBedTypeCodes([]); }} required />No</label></div></fieldset>{offersBeds && <fieldset className="space-y-2"><legend className="text-sm font-medium">Bed categories offered</legend><p className="text-xs text-muted-foreground">Select only categories this facility provides. Enter live bed counts after registration.</p><div className="grid gap-2 sm:grid-cols-2">{bedTypes.map(type => <label key={type.code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bedTypeCodes.includes(type.code)} onChange={event => setBedTypeCodes(current => event.target.checked ? [...current,type.code] : current.filter(code => code !== type.code))} />{type.name}</label>)}</div></fieldset>}<Button disabled={registering || Boolean(bedTypesError)}>{registering ? "Registering…" : "Register facility"}</Button></form> : statusLoading ? <div role="status" aria-label="Loading verification status" className="space-y-3 rounded-xl border bg-card p-6"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-28" /></div> : awaitingReview ? <section className="rounded-xl border bg-card p-6"><h2 className="font-semibold">Awaiting company approval</h2><p className="text-muted-foreground mt-2 text-sm">Your registration certificate and operating licence have been submitted. The dashboard opens after Clinzo approves the facility.</p><Button className="mt-4" variant="outline" onClick={checkStatus}>Check status</Button></section> : <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-6">
      <div className="space-y-2"><Label htmlFor="facility">Facility</Label><select id="facility" value={activeFacilityId} onChange={(event) => { setFacilityId(event.target.value); setStatus(null); setStatusLoading(true); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{facilities.map((facility) => <option key={facility.facility_id} value={facility.facility_id}>{facility.facility_name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="registration">Registration number</Label><Input id="registration" value={registration} onChange={(event) => setRegistration(event.target.value)} minLength={4} maxLength={120} required /></div>
      <div className="space-y-2"><Label htmlFor="certificate">Registration certificate</Label><Input id="certificate" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { certificateRef.current = event.target.files?.[0] ?? null; }} required /><p className="text-xs text-muted-foreground">PDF, JPG or PNG, up to 10 MB.</p></div>
      <div className="space-y-2"><Label htmlFor="licence">Operating licence</Label><Input id="licence" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { licenceRef.current = event.target.files?.[0] ?? null; }} required /></div>
      <Button disabled={busy}>{busy ? "Uploading…" : "Submit for verification"}</Button>
    </form>}
    {status && <section className="rounded-xl border bg-card p-6"><h2 className="font-semibold">Review status: {status.status.replaceAll("_"," ")}</h2><ul className="mt-3 space-y-2 text-sm">{status.documents.map((document) => <li key={document.kind}><strong className="capitalize">{document.kind.replaceAll("_"," ")}</strong> — {document.status}{document.rejection_reason && <p className="text-destructive">{document.rejection_reason}</p>}</li>)}</ul></section>}
  </div>;
}
