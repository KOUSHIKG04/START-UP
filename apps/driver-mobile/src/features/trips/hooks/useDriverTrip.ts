import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  completeMyDriverTrip,
  listMyDriverTrips,
  transitionMyDriverTrip,
} from "@startup/data-access";
import type {
  MyDriverTrip,
  TransitionDriverTripInput,
} from "@startup/contracts";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";

export function useDriverTrip() {
  const { profile } = useMobileSession();
  const { showToast } = useToast();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [completedId, setCompletedId] = useState<string | null>(null);
  const trips = useQuery({
    queryKey: ["my-driver-trips", profile?.driver?.id],
    queryFn: () => listMyDriverTrips(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  useToastFeedback({ error: trips.isError ? "Could not load trip." : "" });
  const trip =
    trips.data?.find(
      (item) => !["completed", "cancelled"].includes(item.status)
    ) ?? trips.data?.find((item) => item.id === completedId);
  async function transition(
    item: MyDriverTrip,
    action: TransitionDriverTripInput["action"]
  ) {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      await transitionMyDriverTrip(supabase, {
        tripId: item.id,
        expectedVersion: Number(item.row_version),
        action,
      });
      await trips.refetch();
      showToast({ title: "Trip status updated", type: "success" });
    } catch {
      const feedback =
        "Trip could not be updated. Refresh and check its status.";
      showToast({
        title: "Trip update failed",
        message: feedback,
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  async function complete(item: MyDriverTrip) {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const verified = await completeMyDriverTrip(supabase, {
        tripId: item.id,
        patientPin: pin,
      });
      if (verified) {
        setCompletedId(item.id);
        setPin("");
        await trips.refetch();
        showToast({ title: "Trip completed", type: "success" });
      } else {
        const feedback =
          "PIN did not match, or verification is temporarily locked. Ask the patient to check their app.";
        showToast({
          title: "PIN not verified",
          message: feedback,
          type: "error",
        });
      }
    } catch {
      const feedback =
        "Could not complete the trip. Check the PIN and trip status.";
      showToast({
        title: "Trip completion failed",
        message: feedback,
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  return {
    showToast,
    pin,
    setPin,
    busy,
    setCompletedId,
    trips,
    trip,
    transition,
    complete,
  };
}
