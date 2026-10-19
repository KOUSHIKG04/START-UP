import type { AddressSheetProps } from "../types/address-sheet";
import { useToastFeedback } from "@startup/mobile-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useDriverLocationDraft } from "../../locations/stores/locationDraft";
import { Keyboard } from "react-native";
import { useMobileSession } from "../../../services/supabase";
import { type PatientAddress } from "../types/address";
import { emptyAddress } from "../utils/addressConstants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export function useDriverAddressSheet({
  visible,
  value,
  onClose,
  onConfirm,
  onReopen,
}: AddressSheetProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useMobileSession();
  const [address, setAddress] = useState<PatientAddress>(value);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [attemptedConfirm, setAttemptedConfirm] = useState(false);
  const awaitingMap = useRef(false);
  const chosen = useDriverLocationDraft((state) => state.chosen);
  const clearChosen = useDriverLocationDraft((state) => state.clear);
  useFocusEffect(
    useCallback(() => {
      if (!chosen || !awaitingMap.current) return;
      awaitingMap.current = false;
      setAddress((current) => ({
        ...current,
        line1: chosen.street || chosen.locality || current.line1,
        line2: chosen.locality || current.line2,
        city: chosen.city || current.city,
        state: chosen.state || current.state,
        pincode: chosen.pincode || current.pincode,
        latitude: chosen.latitude,
        longitude: chosen.longitude,
      }));
      clearChosen();
      onReopen();
    }, [chosen, clearChosen, onReopen])
  );

  // Only a new confirmed address replaces the draft. Dismissing the drawer
  // must not reset partially entered fields when it is opened again.
  useEffect(() => {
    setAddress(value || emptyAddress);
    setAttemptedConfirm(false);
  }, [value]);
  useEffect(() => {
    if (visible) setError("");
  }, [visible]);

  function handleConfirm() {
    setAttemptedConfirm(true);
    const trimmed: PatientAddress = {
      building: address.building.trim(),
      line1: address.line1.trim(),
      line2: address.line2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
      ...(address.latitude !== undefined && address.longitude !== undefined
        ? { latitude: address.latitude, longitude: address.longitude }
        : {}),
    };

    if (!trimmed.building) {
      setError("Please enter House No. / Flat / Building.");
      return;
    }
    if (!trimmed.line1) {
      setError("Please enter Address Line 1.");
      return;
    }
    if (trimmed.city.length < 2) {
      setError("Please enter a valid City name.");
      return;
    }
    if (trimmed.state.length < 2) {
      setError("Please enter a valid State name.");
      return;
    }
    if (!/^\d{6}$/.test(trimmed.pincode)) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    setError("");
    Keyboard.dismiss();
    onConfirm(trimmed);
  }

  return {
    insets,
    profile,
    address,
    setAddress,
    setError,
    attemptedConfirm,
    awaitingMap,
    clearChosen,
    handleConfirm,
  };
}
