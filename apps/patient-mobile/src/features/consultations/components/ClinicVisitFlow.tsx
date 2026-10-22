import type { ClinicVisitFlowProps } from "../types/visit-session";
export type { ClinicVisitFlowProps } from "../types/visit-session";
import { AppText as Text } from "@startup/mobile-ui";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { MapPin } from "lucide-react-native";
import QRCode from "react-qr-code";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, FadedScrollView, Loader } from "@startup/mobile-ui";
import { useClinicCheckIn } from "../hooks/useClinicCheckIn";

import { QueueStatus } from "./QueueStatus";
import { ScheduleSummary } from "./ScheduleSummary";

export function ClinicVisitFlow({
  appointment,
  onComplete,
}: ClinicVisitFlowProps) {
  const { live, item, appointments, canShowQr, qr, issueQr, refreshQr } =
    useClinicCheckIn(appointment.backendId);
  const completionShown = useRef(false);
  useEffect(() => {
    if (item?.status === "completed" && !completionShown.current) {
      completionShown.current = true;
      onComplete();
    }
  }, [item?.status, onComplete]);
  const checkedIn = Boolean(
    item &&
    ["waiting", "called", "in_service", "held"].includes(item.queue_state ?? "")
  );

  return (
    <FadedScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScheduleSummary appointment={appointment} />
      {appointments.isLoading && live ? <Loader theme="patient" /> : null}
      {appointments.isError ? (
        <Card theme="patient" gap={12}>
          <Text>Could not load your clinic visit.</Text>
          <Button label="Retry" onPress={() => void appointments.refetch()} />
        </Card>
      ) : null}
      {checkedIn && item ? (
        <QueueStatus appointment={item} />
      ) : (
        <>
          <Card
            variant="plain"
            backgroundColor={colors.white}
            borderRadius={radius.md}
            borderWidth={0}
            borderColor="transparent"
            gap={12}
            padding={20}
            style={[styles.centeredCard, styles.flatCard, styles.noBorderCard]}
          >
            <View
              style={styles.qrSurface}
              accessibilityLabel="Clinic check-in QR code"
            >
              {qr ? (
                <QRCode value={qr} size={190} />
              ) : issueQr.isPending ? (
                <Loader theme="patient" />
              ) : null}
            </View>
            <Text variant="inherit" style={styles.checkInCode}>
              {appointment.id.slice(-8)}
            </Text>
            <Text variant="inherit" style={styles.centeredDescription}>
              {qr
                ? "Show this check-in code at reception or to your doctor. It expires in five minutes."
                : !live
                  ? "Open this visit from My Bookings to access your check-in QR."
                  : issueQr.isError
                    ? "Could not load your QR code. Try again."
                    : !item
                      ? "Your appointment is not available yet."
                      : canShowQr
                        ? "Generate a fresh QR code before checking in."
                        : item.status === "confirmed" &&
                            item.queue_state === "awaiting_arrival"
                          ? "Your QR code is available on the day of your clinic appointment."
                          : `Appointment ${item.status.replaceAll("_", " ")}. Check-in is unavailable.`}
            </Text>
            {canShowQr ? (
              <Button
                label={qr ? "Refresh QR code" : "Generate check-in QR"}
                loading={issueQr.isPending}
                disabled={issueQr.isPending}
                onPress={refreshQr}
              />
            ) : null}
          </Card>
          <Card
            variant="outlined"
            borderRadius={radius.md}
            borderWidth={1}
            borderColor="#E0E5EB"
            gap={12}
            padding={16}
            style={styles.flatCard}
          >
            <View style={styles.locationRow}>
              <MapPin color={colors.patient.primaryDark} size={21} />
              <View style={styles.flexCopy}>
                <Text variant="inherit" style={styles.cardTitle}>
                  {appointment.hospital}
                </Text>
                <Text variant="inherit" style={styles.secondaryText}>
                  {appointment.location}
                </Text>
              </View>
            </View>
            <Text variant="inherit" style={styles.secondaryText}>
              Your queue appears once reception or your doctor confirms
              check-in.
            </Text>
            <Button
              label="I’ve checked in"
              disabled={
                !live ||
                !item ||
                item.status !== "confirmed" ||
                appointments.isFetching
              }
              loading={appointments.isFetching}
              onPress={() => void appointments.refetch()}
            />
          </Card>
        </>
      )}
    </FadedScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  flatCard: {
    boxShadow: "none",
    elevation: 0,
    shadowOpacity: 0,
  },
  noBorderCard: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  centeredCard: {
    alignItems: "center",
  },
  qrSurface: {
    width: 214,
    height: 214,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  checkInCode: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
  },
  centeredDescription: {
    maxWidth: 250,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  flexCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
});
