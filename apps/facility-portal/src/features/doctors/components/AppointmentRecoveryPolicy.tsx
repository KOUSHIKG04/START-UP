"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  loadFacilityRecoveryPolicy,
  saveFacilityRecoveryPolicy,
} from "../server/scheduleActions";
import { NumberSetting } from "./NumberSetting";
import { ScheduleSection } from "./ScheduleSection";
import type { PolicyDraft } from "../types/appointmentRecoveryPolicy";

export function AppointmentRecoveryPolicy({
  practiceId,
}: {
  practiceId: string;
}) {
  const client = useQueryClient();
  const saved = useQuery({
    queryKey: ["facility-recovery-policy", practiceId],
    queryFn: () => loadFacilityRecoveryPolicy(practiceId),
  });
  const [edits, setEdits] = useState<PolicyDraft | null>(null);
  const draft = edits ?? {
    onlineGraceMinutes: saved.data?.online_grace_minutes ?? 15,
    rescheduleCutoffMinutes: saved.data?.reschedule_cutoff_minutes ?? 0,
    maxSelfReschedules: saved.data?.max_self_reschedules ?? 1,
    expectedVersion: Number(saved.data?.row_version ?? 0),
  };
  const mutation = useMutation({
    mutationFn: () => saveFacilityRecoveryPolicy({ practiceId, ...draft }),
    onSuccess: (data) => {
      client.setQueryData(["facility-recovery-policy", practiceId], data);
      void client.invalidateQueries({
        queryKey: ["facility-practice-schedule", practiceId],
      });
      setEdits(null);
    },
    onError: () => {
      void saved.refetch();
    },
  });
  const update = (value: Partial<PolicyDraft>) =>
    setEdits({ ...draft, ...value });
  return (
    <ScheduleSection title="Appointment recovery">
      <p className="text-muted-foreground text-sm">
        Online grace applies after the booked end time. Clinic attendance
        follows the session and queue. This policy applies to this practice.
      </p>
      {saved.isError ? (
        <Button variant="outline" onClick={() => void saved.refetch()}>
          Retry policy
        </Button>
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
        <div className="space-y-2">
          <p role="alert" className="text-destructive text-sm">
            Could not save the policy. Reload the latest settings before editing
            again. Reloading replaces your unsaved changes.
          </p>
          <Button
            variant="outline"
            disabled={saved.isFetching}
            onClick={async () => {
              const result = await saved.refetch();
              if (!result.isError) {
                setEdits(null);
                mutation.reset();
              }
            }}
          >
            Reload latest settings
          </Button>
        </div>
      ) : null}
      {mutation.isSuccess && !edits ? (
        <p role="status" className="text-sm">
          Recovery policy saved.
        </p>
      ) : null}
      <Button
        disabled={!edits || !saved.data || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Saving…" : "Save recovery policy"}
      </Button>
    </ScheduleSection>
  );
}
