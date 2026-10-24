import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@startup/design-tokens";
import { AppText } from "../primitives/AppText";
import { Button } from "../primitives/Button";
import { Dropdown } from "../primitives/Dropdown";
import { Input } from "../primitives/Input";
import { Loader } from "../primitives/Loader";
import { ModalSurface } from "../primitives/ModalSurface";

export type RecoveryTimeChoice = {
  value: string;
  day: string;
  dayLabel: string;
  label: string;
  fee: string;
};

export function AppointmentRecoveryDialog({
  visible,
  title,
  description,
  actionLabel,
  theme,
  times,
  loading = false,
  busy = false,
  error,
  requireReason = true,
  onRetry,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  description: string;
  actionLabel: string;
  theme: "patient" | "doctor";
  times?: RecoveryTimeChoice[];
  loading?: boolean;
  busy?: boolean;
  error?: string;
  requireReason?: boolean;
  onRetry?: () => void;
  onClose: () => void;
  onSubmit: (value: { targetWindowId: string; reason: string }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState("");
  const [targetWindowId, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const days = [
    ...new Map(
      (times ?? []).map((time) => [
        time.day,
        { value: time.day, label: time.dayLabel },
      ])
    ).values(),
  ];
  const selected = times?.find((time) => time.value === targetWindowId);
  return (
    <ModalSurface
      visible={visible}
      onClose={busy ? undefined : onClose}
      layout="custom"
      transparent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.ui.overlay }}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingTop: Math.max(20, insets.top),
            paddingBottom: Math.max(20, insets.bottom),
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "100%",
              flexShrink: 1,
              backgroundColor: colors.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ gap: 16 }}
            >
              <AppText variant="sectionHeading" accessibilityRole="header">
                {title}
              </AppText>
              <AppText>{description}</AppText>
              {loading ? <Loader theme={theme} /> : null}
              {times !== undefined && !loading && !error ? (
                <>
                  {times.length ? (
                    <>
                      <Dropdown
                        theme={theme}
                        label="New date"
                        value={day}
                        options={days}
                        disabled={busy}
                        onValueChange={(value) => {
                          setDay(value);
                          setTarget("");
                        }}
                      />
                      <Dropdown
                        theme={theme}
                        label="New time"
                        value={targetWindowId}
                        options={times
                          .filter((time) => time.day === day)
                          .map((time) => ({
                            value: time.value,
                            label: time.label,
                          }))}
                        disabled={busy || !day}
                        onValueChange={setTarget}
                      />
                      {selected ? (
                        <AppText>Consultation fee: {selected.fee}</AppText>
                      ) : null}
                    </>
                  ) : (
                    <AppText>
                      No replacement times are available. Try again later or
                      contact the clinic.
                    </AppText>
                  )}
                </>
              ) : null}
              <Input
                label={requireReason ? "Reason" : "Note (optional)"}
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={1000}
                disabled={busy}
              />
              {error ? (
                <View style={{ gap: 8 }}>
                  <AppText accessibilityRole="alert">{error}</AppText>
                  {onRetry ? (
                    <Button
                      theme={theme}
                      variant="outline"
                      label="Try again"
                      disabled={busy}
                      onPress={onRetry}
                    />
                  ) : null}
                </View>
              ) : null}
              <Button
                theme={theme}
                label={actionLabel}
                loading={busy}
                disabled={
                  busy ||
                  loading ||
                  Boolean(error) ||
                  (requireReason && reason.trim().length < 2) ||
                  (times !== undefined && !selected)
                }
                onPress={() =>
                  onSubmit({ targetWindowId, reason: reason.trim() })
                }
              />
              <Button
                theme={theme}
                variant="ghost"
                label="Close"
                disabled={busy}
                onPress={onClose}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ModalSurface>
  );
}
