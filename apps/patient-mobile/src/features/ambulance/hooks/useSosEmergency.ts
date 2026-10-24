import { useEffect, useState } from "react";
import type { SosEmergencyScreenProps } from "../types/sos";

export function useSosEmergency({
  onCancel,
  onCallEmergency,
}: SosEmergencyScreenProps) {
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDispatched(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  return { dispatched };
}
