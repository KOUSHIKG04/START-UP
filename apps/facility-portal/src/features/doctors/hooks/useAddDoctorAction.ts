"use client";

import { useState } from "react";

export function useAddDoctorAction() {
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);

  return { isAddDoctorOpen, setIsAddDoctorOpen };
}
