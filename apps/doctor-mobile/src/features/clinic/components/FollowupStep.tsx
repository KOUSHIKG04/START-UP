import type { FollowupStepProps } from "../types/followup-step";
export type { FollowupStepProps } from "../types/followup-step";
import { Button, DatePicker, Input } from "@startup/mobile-ui";

export function FollowupStep({
  setStep,
  followupSaved,
  setError,
  followupDate,
  setFollowupDate,
  followupReason,
  setFollowupReason,
  tomorrow,
  followup,
  busy,
}: FollowupStepProps) {
  return (
    <>
      <DatePicker
        theme="doctor"
        label="Follow-up date"
        value={followupDate}
        minDate={tomorrow}
        disabled={busy || followupSaved}
        onChange={setFollowupDate}
      />
      <Input
        label="Reason"
        value={followupReason}
        disabled={busy || followupSaved}
        onChangeText={setFollowupReason}
        multiline
      />
      <Button
        loading={followup.isPending}
        theme="doctor"
        label={followupSaved ? "Continue" : "Save and continue"}
        disabled={
          followup.isPending ||
          (!followupSaved &&
            (!followupDate || followupReason.trim().length < 2))
        }
        onPress={() => {
          if (followupSaved) {
            setStep(3);
            return;
          }
          followup.mutate();
        }}
      />
      {!followupSaved ? (
        <Button
          theme="doctor"
          variant="outline"
          label="No follow-up needed"
          disabled={busy || Boolean(followupDate || followupReason.trim())}
          onPress={() => {
            setError("");
            setStep(3);
          }}
        />
      ) : null}
    </>
  );
}
