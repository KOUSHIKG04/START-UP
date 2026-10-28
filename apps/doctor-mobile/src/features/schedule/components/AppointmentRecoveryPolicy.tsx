import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMySchedulePreferences,
  setAppointmentRecoveryPolicy,
} from "@startup/data-access";
import { Button, useToast } from "@startup/mobile-ui";
import { Label } from "../../../components/DoctorScreen";
import { supabase } from "../../../services/supabase";
import { NumberSetting } from "./NumberSetting";
import { ScheduleSection } from "./ScheduleSection";

type PolicyDraft = {
  onlineGraceMinutes: number;
  rescheduleCutoffMinutes: number;
  maxSelfReschedules: number;
  expectedVersion: number;
};

export function AppointmentRecoveryPolicy({
  practiceId,
}: {
  practiceId: string;
}) {
  const client = useQueryClient();
  const { showToast } = useToast();
  const saved = useQuery({
    queryKey: ["my-doctor-schedule", practiceId],
    queryFn: () => getMySchedulePreferences(supabase!, practiceId),
  });
  const [edits, setEdits] = useState<PolicyDraft | null>(null);
  const draft = edits ?? {
    onlineGraceMinutes: saved.data?.online_grace_minutes ?? 15,
    rescheduleCutoffMinutes: saved.data?.reschedule_cutoff_minutes ?? 0,
    maxSelfReschedules: saved.data?.max_self_reschedules ?? 1,
    expectedVersion: Number(saved.data?.row_version ?? 0),
  };
  const mutation = useMutation({
    mutationFn: () =>
      setAppointmentRecoveryPolicy(supabase!, { practiceId, ...draft }),
    onSuccess: (data) => {
      client.setQueryData(["my-doctor-schedule", practiceId], data);
      void client.invalidateQueries({
        queryKey: ["doctor-clinic-appointments"],
      });
      void client.invalidateQueries({
        queryKey: ["doctor-reschedule-options"],
      });
      setEdits(null);
      showToast({ title: "Recovery policy saved", type: "success" });
    },
    onError: () => {
      void saved.refetch();
      showToast({
        title: "Could not save policy",
        message:
          "The settings may have changed. Reload the latest settings before editing again.",
        type: "error",
      });
    },
  });
  const update = (value: Partial<PolicyDraft>) =>
    setEdits({ ...draft, ...value });
  return (
    <ScheduleSection title="Appointment recovery">
      <Label muted>
        Online grace applies after the booked end time. Clinic attendance
        follows the session and queue. This policy applies to all visit types in
        this practice.
      </Label>
      {saved.isError ? (
        <Button
          theme="doctor"
          label="Retry policy"
          variant="outline"
          onPress={() => void saved.refetch()}
        />
      ) : null}
      <NumberSetting
        title="Online attendance grace"
        value={draft.onlineGraceMinutes}
        suffix="min"
        min={0}
        max={180}
        disabled={!saved.data || mutation.isPending}
        onChange={(onlineGraceMinutes) => update({ onlineGraceMinutes })}
      />
      <NumberSetting
        title="Self-reschedule cutoff before start"
        value={draft.rescheduleCutoffMinutes}
        suffix="min"
        min={0}
        max={10080}
        disabled={!saved.data || mutation.isPending}
        onChange={(rescheduleCutoffMinutes) =>
          update({ rescheduleCutoffMinutes })
        }
      />
      <NumberSetting
        title="Allowed self-service reschedules"
        value={draft.maxSelfReschedules}
        suffix=""
        min={0}
        max={10}
        disabled={!saved.data || mutation.isPending}
        onChange={(maxSelfReschedules) => update({ maxSelfReschedules })}
      />
      {mutation.isError ? (
        <>
          <Label>Reloading replaces your unsaved changes.</Label>
          <Button
            theme="doctor"
            variant="outline"
            label="Reload latest settings"
            disabled={saved.isFetching}
            onPress={async () => {
              const result = await saved.refetch();
              if (!result.isError) {
                setEdits(null);
                mutation.reset();
              }
            }}
          />
        </>
      ) : null}
      <Button
        theme="doctor"
        label="Save recovery policy"
        disabled={!edits || !saved.data || mutation.isPending}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    </ScheduleSection>
  );
}
