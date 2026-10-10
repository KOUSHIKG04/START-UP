import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { greetingForTime } from "../utils/greeting";

export function useTimeGreeting() {
  const [greeting, setGreeting] = useState(() => greetingForTime());
  useEffect(() => {
    const refresh = () => setGreeting(greetingForTime());
    refresh();
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return greeting;
}
