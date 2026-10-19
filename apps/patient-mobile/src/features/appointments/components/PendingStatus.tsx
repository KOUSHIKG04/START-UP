import type { PendingStatusProps } from "../types/booking-status";
import { styles } from "./BookingStatus.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { CheckCircle2, Clock3 } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";
export function PendingStatus({ onPreviewApproval }: PendingStatusProps) {
  return (
    <View style={styles.pendingCard}>
      <View style={styles.pendingHeader}>
        <View style={styles.pendingIconContainer}>
          <Clock3
            color={colors.patient.primaryDark}
            size={20}
            strokeWidth={2.2}
          />
        </View>
        <View style={styles.statusCopy}>
          <View style={styles.pendingTitleRow}>
            <Text variant="cardHeading" style={styles.pendingTitle}>
              Waiting for doctor’s approval
            </Text>
            {/* <View style={styles.pendingTag}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingTagText}>In Review</Text>
            </View> */}
          </View>
          <Text variant="body" style={styles.pendingDescription}>
            We’ll notify you once your booking is confirmed by the doctor.
          </Text>
        </View>
      </View>
      {onPreviewApproval ? (
        <Button
          label="Preview approved booking"
          onPress={onPreviewApproval}
          variant="outline"
          theme="patient"
          style={styles.previewButton}
          labelStyle={styles.previewButtonLabel}
          leftIcon={
            <CheckCircle2
              color={colors.patient.primaryDark}
              size={16}
              strokeWidth={2}
            />
          }
        />
      ) : null}
    </View>
  );
}
