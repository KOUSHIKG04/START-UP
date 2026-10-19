import { useToastFeedback } from "@startup/mobile-ui";
import { useRef, useState } from "react";
import { TextInput } from "react-native";
import { useVisit } from "./useVisit";
export function useHomeVisit() {
  const { patient, appointment } = useVisit();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const inputs = useRef<(TextInput | null)[]>([]);

  return { patient, appointment, pin, setPin, setError, inputs };
}
