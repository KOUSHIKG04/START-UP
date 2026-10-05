"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { inviteDoctorToMyFacility, listMyInventoryFacilities } from "@startup/data-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { initialDoctorForm } from "../utils/addDoctorConstants";

export function useAddDoctorForm(onSuccess?: () => void) {
  const [formData, setFormData] = useState(() => ({ ...initialDoctorForm }));
  const [isSubmitted, setIsSubmitted] = useState(false);
  useEffect(() => {
    if (!isSubmitted) return;
    const timer = setTimeout(() => setIsSubmitted(false), 3000);
    return () => clearTimeout(timer);
  }, [isSubmitted]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [facilityId,setFacilityId] = useState("");
  const queryClient = useQueryClient();
  const facilities = useQuery({queryKey:["my-inventory-facilities"],queryFn:()=>listMyInventoryFacilities(createBrowserSupabaseClient())});
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const selectedFacilityId = facilityId || facilities.data?.[0]?.facilityId;
    if (!formData.name.trim() || !selectedFacilityId) {setError("Choose a facility and enter the doctor name.");return;}
    setBusy(true);setError("");
    try {
      const phone = formData.phone.trim().replace(/\s/g,"");
      const normalizedPhone = /^\d{10}$/.test(phone) ? `+91${phone}` : phone;
      await inviteDoctorToMyFacility(createBrowserSupabaseClient(),{
        facilityId:selectedFacilityId,doctorCode:formData.clinzoId.trim(),name:formData.name.trim(),
        specialization:formData.specialization.trim(),phone:normalizedPhone,
      });
      setIsSubmitted(true);
      setFormData({ ...initialDoctorForm });
      onSuccess?.();
      await queryClient.invalidateQueries({queryKey:["facility-doctor-requests"]});
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not invite doctor."); }
    finally {setBusy(false);}
  }
  return { formData, setFormData, isSubmitted, handleSubmit, busy, error, facilities:facilities.data ?? [], facilityId, setFacilityId };
}
