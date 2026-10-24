"use client";

import { getFacilityLocation } from "../services/browserLocation";
import type { FacilityVerificationFormProps } from "../types/facilityVerificationForm";
import type {
  Status,
  FacilityLocation,
} from "../types/facilityVerificationForm";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  listBedTypeCatalog,
  registerMyCareFacility,
  setMyProfilePhoto,
} from "@startup/data-access";
import type { BedTypeCatalogItem } from "@startup/contracts";
import { useRouter } from "next/navigation";

export function useFacilityVerification({
  facilities,
}: FacilityVerificationFormProps) {
  const router = useRouter();
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [facilityName, setFacilityName] = useState("");
  const [facilityKind, setFacilityKind] = useState<"hospital" | "clinic">(
    "hospital"
  );
  const [facilityAddress, setFacilityAddress] = useState("");
  const [facilityLocality, setFacilityLocality] = useState("");
  const [facilityCity, setFacilityCity] = useState("");
  const [facilityState, setFacilityState] = useState("");
  const [facilityPincode, setFacilityPincode] = useState("");
  const [facilityLocation, setFacilityLocation] =
    useState<FacilityLocation | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const handleMapUnavailable = useCallback((unavailable: boolean) => {
    setMapUnavailable(unavailable);
    if (unavailable)
      setLocationMessage(
        "The map could not load. Use current location and check the address fields manually."
      );
  }, []);
  const [offersBeds, setOffersBeds] = useState<boolean | null>(null);
  const [bedTypeCodes, setBedTypeCodes] = useState<string[]>([]);
  const [bedTypes, setBedTypes] = useState<BedTypeCatalogItem[]>([]);
  const [bedTypesError, setBedTypesError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [facilityId, setFacilityId] = useState("");
  const activeFacilityId = facilityId || facilities[0]?.facility_id || "";
  const [registration, setRegistration] = useState("");
  const certificateRef = useRef<File | null>(null);
  const licenceRef = useRef<File | null>(null);
  const logoRef = useRef<File | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [statusLoading, setStatusLoading] = useState(facilities.length > 0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (facilities.length) return;
    let active = true;
    void listBedTypeCatalog(createBrowserSupabaseClient())
      .then((items) => {
        if (active) setBedTypes(items);
      })
      .catch(() => {
        if (active) {
          setBedTypesError(
            "Could not load bed categories. Refresh and try again."
          );
          toast.add({
            title: "Could not load bed categories",
            description: "Refresh and try again.",
            type: "error",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [facilities.length]);
  const loadStatus = useCallback(async (id: string) => {
    if (!id) {
      setStatus(null);
      return null;
    }
    const client = createBrowserSupabaseClient();
    const { data, error } = await client.rpc("get_my_verification_case", {
      p_subject_type: "facility",
      p_subject_id: id,
    });
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
        toast.add({
          title: "Company verification is still pending",
          description: "Check again after the reviewer verifies the facility.",
          type: "info",
        });
      }
    } catch (cause) {
      toast.add({
        title: "Could not check verification status",
        description: cause instanceof Error ? cause.message : "Try again.",
        type: "error",
      });
    } finally {
      setStatusLoading(false);
    }
  }
  useEffect(() => {
    if (!activeFacilityId) return;
    let active = true;
    const client = createBrowserSupabaseClient();
    void client
      .rpc("get_my_verification_case", {
        p_subject_type: "facility",
        p_subject_id: activeFacilityId,
      })
      .then(({ data, error }) => {
        if (!active) return;
        if (error)
          toast.add({
            title: "Could not load verification status",
            type: "error",
          });
        else setStatus(data as Status | null);
        setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeFacilityId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const certificate = certificateRef.current;
    const licence = licenceRef.current;
    if (!activeFacilityId || !certificate || !licence) {
      toast.add({
        title: "Missing documents",
        description: "Choose a facility and both documents.",
        type: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      const client = createBrowserSupabaseClient();
      const { data: user, error: authError } = await client.auth.getUser();
      if (authError || !user.user)
        throw new Error("Your session expired. Sign in again.");
      const upload = async (file: File, kind: string) => {
        if (
          file.size > 10 * 1024 * 1024 ||
          !["application/pdf", "image/jpeg", "image/png"].includes(file.type)
        )
          throw new Error("Use a PDF, JPG or PNG file under 10 MB.");
        const path = `${user.user!.id}/${activeFacilityId}/${kind}-${crypto.randomUUID()}`;
        const { error } = await client.storage
          .from("facility-evidence")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        return path;
      };
      const certificatePath = await upload(
        certificate,
        "registration-certificate"
      );
      const licencePath = await upload(licence, "operating-licence");
      const { error } = await client.rpc("submit_my_facility_verification", {
        p_facility_id: activeFacilityId,
        p_registration_number: registration.trim(),
        p_certificate_path: certificatePath,
        p_operating_licence_path: licencePath,
      });
      if (error) throw error;
      await loadStatus(activeFacilityId);
      certificateRef.current = null;
      licenceRef.current = null;
      form.reset();
      toast.add({ title: "Submitted for company review", type: "success" });
    } catch (cause) {
      const errorMessage =
        cause instanceof Error
          ? cause.message
          : "Submission failed. Try again.";
      toast.add({
        title: "Submission failed",
        description: errorMessage,
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mapsApiKey && !mapUnavailable && !facilityLocation) {
      setLocationMessage(
        "Confirm the facility pin on the map before registering."
      );
      return;
    }
    if (offersBeds === null || (offersBeds && bedTypeCodes.length === 0)) {
      toast.add({
        title: "Complete bed services",
        description:
          "Choose whether beds are offered, then select the offered categories.",
        type: "warning",
      });
      return;
    }
    setRegistering(true);
    try {
      const location = facilityLocation ?? (await getFacilityLocation());
      const address = [
        facilityAddress,
        facilityLocality,
        facilityCity,
        facilityState,
        facilityPincode,
      ]
        .map((part) => part.trim())
        .join(", ");
      const client = createBrowserSupabaseClient();
      const registeredId = await registerMyCareFacility(client, {
        name: facilityName.trim(),
        kind: facilityKind,
        address,
        locality: facilityLocality.trim(),
        city: facilityCity.trim(),
        state: facilityState.trim(),
        pincode: facilityPincode.trim(),
        offersBeds,
        bedTypeCodes: offersBeds ? bedTypeCodes : [],
        latitude: location.latitude,
        longitude: location.longitude,
      });
      let logoWarning = "";
      if (logoRef.current) {
        try {
          const logo = logoRef.current;
          if (
            logo.size > 5 * 1024 * 1024 ||
            !["image/jpeg", "image/png"].includes(logo.type)
          )
            throw new Error("Choose a JPG or PNG logo under 5 MB.");
          const { data, error } = await client.auth.getUser();
          if (error || !data.user)
            throw error ?? new Error("Sign in to upload a logo.");
          const path = `${data.user.id}/${crypto.randomUUID()}.${logo.type === "image/png" ? "png" : "jpg"}`;
          const uploaded = await client.storage
            .from("provider-profile-photos")
            .upload(path, logo, { contentType: logo.type, upsert: false });
          if (uploaded.error) throw uploaded.error;
          await setMyProfilePhoto(client, "facility", path, registeredId);
        } catch (cause) {
          logoWarning =
            cause instanceof Error ? cause.message : "Logo upload failed.";
        }
      }
      toast.add({
        title: logoWarning
          ? "Facility registered; logo upload failed"
          : "Facility registered",
        description:
          logoWarning ||
          "Upload its registration certificate and operating licence next.",
        type: logoWarning ? "warning" : "success",
      });
      setStatusLoading(true);
      router.refresh();
    } catch (cause) {
      const text =
        cause instanceof Error
          ? cause.message
          : "Could not register the facility. Allow location access while at the facility.";
      toast.add({
        title: "Registration failed",
        description: text,
        type: "error",
      });
    } finally {
      setRegistering(false);
    }
  }

  async function applyLocation(location: FacilityLocation) {
    setLocating(true);
    setLocationMessage("");
    setFacilityLocation(location);
    try {
      const response = await fetch("/api/facility-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      const result = (await response.json()) as {
        address?: string;
        locality?: string;
        city?: string;
        state?: string;
        pincode?: string;
        error?: string;
      };
      if (response.ok) {
        setFacilityAddress(result.address ?? "");
        setFacilityLocality(result.locality ?? "");
        setFacilityCity(result.city ?? "");
        setFacilityState(result.state ?? "");
        setFacilityPincode(result.pincode ?? "");
        setLocationMessage(
          "Address filled from your location. Check every field and add missing street details."
        );
        toast.add({
          title: "Address found",
          description:
            "Check the address fields against the facility before registering. Add any missing street details.",
          type: "success",
        });
      } else {
        setLocationMessage(
          result.error ??
            "Address lookup failed. Enter the address manually; location coordinates were captured."
        );
        toast.add({
          title: "Address lookup unavailable",
          description:
            result.error ??
            "Enter the facility address manually. Location coordinates were captured.",
          type: "warning",
        });
      }
    } catch (cause) {
      setLocationMessage(
        "Location confirmed, but address lookup failed. Check and enter the address fields manually."
      );
      toast.add({
        title: "Address lookup failed",
        description:
          cause instanceof Error
            ? cause.message
            : "Enter the address manually.",
        type: "warning",
      });
    } finally {
      setLocating(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setLocationMessage("");
    setFacilityLocation(null);
    try {
      await applyLocation(await getFacilityLocation());
    } catch (cause) {
      setLocationMessage(
        cause instanceof Error
          ? cause.message
          : "Could not capture location. Try again."
      );
      toast.add({
        title: "Could not capture location",
        description: cause instanceof Error ? cause.message : "Try again.",
        type: "error",
      });
    } finally {
      setLocating(false);
    }
  }

  const awaitingReview =
    status?.status === "pending" || status?.status === "under_review";

  return {
    mapsApiKey,
    facilityName,
    setFacilityName,
    facilityKind,
    setFacilityKind,
    facilityAddress,
    setFacilityAddress,
    facilityLocality,
    setFacilityLocality,
    facilityCity,
    setFacilityCity,
    facilityState,
    setFacilityState,
    facilityPincode,
    setFacilityPincode,
    facilityLocation,
    mapUnavailable,
    locating,
    locationMessage,
    handleMapUnavailable,
    offersBeds,
    setOffersBeds,
    bedTypeCodes,
    setBedTypeCodes,
    bedTypes,
    bedTypesError,
    registering,
    setFacilityId,
    activeFacilityId,
    registration,
    setRegistration,
    certificateRef,
    licenceRef,
    logoRef,
    status,
    setStatus,
    statusLoading,
    setStatusLoading,
    busy,
    checkStatus,
    submit,
    register,
    applyLocation,
    useCurrentLocation,
    awaitingReview,
  };
}
