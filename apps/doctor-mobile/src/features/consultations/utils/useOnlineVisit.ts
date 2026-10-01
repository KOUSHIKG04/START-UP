import { useQuery } from "@tanstack/react-query";
import { uuidSchema } from "@startup/contracts";
import { listMyPracticeAppointments } from "@startup/data-access";
import { supabase } from "../../../services/supabase";

export function useOnlineVisit(appointmentId?: string) {
  const isLive = uuidSchema.safeParse(appointmentId).success;
  const query = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(isLive && supabase),
    refetchInterval: 15000,
  });
  return {
    isLive,
    appointment: query.data?.find(item => item.id === appointmentId && item.visit_mode === "online"),
    loading: query.isLoading,
    error: query.isError,
  };
}
