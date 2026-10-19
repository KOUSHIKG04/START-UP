import { PaymentOptions } from "../components/PaymentOptions";
import { OnlineConsultationActions } from "../components/OnlineConsultationActions";
import { OnlineScheduleCard } from "../components/OnlineScheduleCard";
import { ApprovedStatus } from "../components/ApprovedStatus";
import { PendingStatus } from "../components/PendingStatus";
import { styles } from "../components/BookingStatus.styles";

import { useState } from "react";
import { View } from "react-native";

import { Button, FadedScrollView, Header } from "@startup/mobile-ui";
import AppointmentDetailsCard from "../components/AppointmentDetailsCard";
import DoctorCard from "../../doctors/components/DoctorCard";
import type { AppointmentStatus } from "../types/appointment";
import { consultationFlows } from "../utils/consultationConstants";
import type { BookingStatusScreenProps } from "../types/booking-status";

export function BookingStatusScreen({
  appointment,
  status,
  onBackPress,
  onContinue,
}: BookingStatusScreenProps) {
  const [previewStatus, setPreviewStatus] = useState<AppointmentStatus | null>(
    null
  );
  const currentStatus = previewStatus ?? status;
  const flow = consultationFlows[appointment.consultationType];
  const isApprovedOnline =
    currentStatus === "approved" && appointment.consultationType === "Online";

  return (
    <View style={styles.screen}>
      <Header
        title="Appointment Status"
        app="patient"
        onBackPress={onBackPress}
        titleStyle={styles.headerTitle}
      />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {isApprovedOnline ? (
            <OnlineScheduleCard appointment={appointment} />
          ) : (
            <DoctorCard
              name={appointment.doctorName}
              qualification={appointment.qualification}
              specialty={appointment.specialty}
              experience={appointment.experience}
              fee={appointment.fee}
              contextLabel={flow.profileContext}
              showChevron={false}
            />
          )}

          <AppointmentDetailsCard appointment={appointment} />

          {currentStatus === "pending" ? (
            <PendingStatus
              onPreviewApproval={
                appointment.backendId
                  ? undefined
                  : () => setPreviewStatus("approved")
              }
            />
          ) : null}
        </View>

        <View style={styles.bottomSection}>
          {currentStatus === "approved" ? (
            isApprovedOnline ? (
              <OnlineConsultationActions
                onChatPress={() => onContinue("online-chat")}
                onJoinPress={() => onContinue("online-video")}
              />
            ) : (
              <View style={styles.actionsRow}>
                <Button
                  label="Cancel Appointment"
                  onPress={onBackPress}
                  variant="secondary"
                  style={styles.sideButton}
                  labelStyle={styles.sideButtonLabel}
                />
                <ApprovedStatus
                  label={flow.confirmationLabel}
                  style={styles.sideButton}
                  labelStyle={styles.sideButtonLabel}
                />
              </View>
            )
          ) : (
            <Button
              label="Cancel Appointment"
              onPress={onBackPress}
              variant="secondary"
              style={styles.cancelButton}
              labelStyle={styles.cancelLabel}
            />
          )}

          {currentStatus === "approved" && flow.showsPayment ? (
            <PaymentOptions />
          ) : null}

          {currentStatus === "approved" &&
          appointment.consultationType !== "Online" ? (
            <Button
              label={
                appointment.consultationType === "Home Visit"
                  ? "Track doctor visit"
                  : "View hospital check-in"
              }
              onPress={() =>
                onContinue(
                  appointment.consultationType === "Home Visit"
                    ? "home-tracking"
                    : "clinic-check-in"
                )
              }
              style={styles.continueButton}
            />
          ) : null}
        </View>
      </FadedScrollView>
    </View>
  );
}
