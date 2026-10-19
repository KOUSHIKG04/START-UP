import { useQuery } from "@tanstack/react-query";
import { getDoctorConsultationDraft } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import type { FlowProps } from "../types/consultation";
export function useConsultationDraft(props: FlowProps) {
  const draft = useQuery({
    queryKey: ["doctor-consultation-draft", props.appointmentId],
    queryFn: () => getDoctorConsultationDraft(supabase!, props.appointmentId),
    staleTime: 0,
  });

  return { draft };
}
