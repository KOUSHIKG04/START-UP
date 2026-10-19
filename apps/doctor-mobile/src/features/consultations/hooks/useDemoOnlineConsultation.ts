import { useState } from "react";
import { useVisit } from "./useVisit";
export function useDemoOnlineConsultation() {
  const { patient, appointment } = useVisit();
  const [muted, setMuted] = useState(false);
  const [front, setFront] = useState(true);
  const [ending, setEnding] = useState(false);

  return {
    patient,
    appointment,
    muted,
    setMuted,
    front,
    setFront,
    ending,
    setEnding,
  };
}
