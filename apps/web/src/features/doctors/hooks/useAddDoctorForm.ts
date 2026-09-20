"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  initialDoctorForm,
  doctorSuccessDelayMs,
} from "../utils/addDoctorConstants";

export function useAddDoctorForm(onSuccess?: () => void) {
  const [formData, setFormData] = useState(() => ({ ...initialDoctorForm }));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formData.name.trim()) return;
    if (timer.current !== null) clearTimeout(timer.current);
    setIsSubmitted(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setIsSubmitted(false);
      setFormData({ ...initialDoctorForm });
      onSuccess?.();
    }, doctorSuccessDelayMs);
  }
  return { formData, setFormData, isSubmitted, handleSubmit };
}
