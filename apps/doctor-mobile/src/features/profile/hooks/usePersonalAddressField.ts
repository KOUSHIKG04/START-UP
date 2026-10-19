import type { PersonalAddressFieldProps } from "../types/personal-address-field";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "@startup/mobile-ui";
import { type DoctorPersonalAddressInput } from "@startup/contracts";
import { useMobileSession } from "../../../services/supabase";
import { useLocationDraft } from "../../locations/stores/locationDraft";
export function usePersonalAddressField({
  value,
  onChange,
  clinicAddress,
}: PersonalAddressFieldProps) {
  const [sameAsClinic, setSameAsClinic] = useState(false);
  const previousAddress = useRef(value);
  const clinicKey = JSON.stringify(clinicAddress);
  useEffect(() => {
    if (!sameAsClinic) return;
    if (!clinicKey) {
      setSameAsClinic(false);
      onChange(previousAddress.current);
      return;
    }
    onChange(JSON.parse(clinicKey) as DoctorPersonalAddressInput);
  }, [sameAsClinic, clinicKey, onChange]);
  const { profile } = useMobileSession();
  const [open, setOpen] = useState(false);
  const waitingForMap = useRef(false);
  const chosen = useLocationDraft((state) => state.chosen);
  const clear = useLocationDraft((state) => state.clear);
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!waitingForMap.current || !chosen) return;
    waitingForMap.current = false;
    onChange({
      ...value,
      latitude: chosen.latitude,
      longitude: chosen.longitude,
      street: chosen.street,
      locality: chosen.locality,
      city: chosen.city,
      state: chosen.state,
      pincode: chosen.pincode,
    });
    clear();
    setOpen(true);
  }, [chosen, clear, onChange, value]);
  const set = (
    key: "building" | "street" | "locality" | "city" | "state" | "pincode",
    text: string
  ) => onChange({ ...value, [key]: text });
  const summary = [
    value.building,
    value.street,
    value.locality,
    value.city,
    value.state,
    value.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    sameAsClinic,
    setSameAsClinic,
    previousAddress,
    profile,
    open,
    setOpen,
    waitingForMap,
    clear,
    showToast,
    insets,
    set,
    summary,
  };
}
