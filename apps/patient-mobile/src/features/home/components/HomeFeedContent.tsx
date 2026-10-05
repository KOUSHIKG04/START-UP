import { StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { colors } from "@startup/design-tokens";
import { IconLabel } from "@startup/mobile-ui";
import { homeActions } from "../utils/HomeActions";
import AmbulanceBanner from "./AmbulanceBanner";
import UpcomingAppointmentCard from "../../appointments/components/UpcomingAppointmentCard";
import PopularServices from "./PopularServices";
import { formatDisplayDate, type ClinicAppointment } from "@startup/contracts";

function getFindDoctorRoute(consultationType: string) {
  return {
    pathname: "/find-doctor",
    params: { consultationType },
  } as unknown as Href;
}

export function HomeFeedContent({
  upcoming,
  isLoading,
  isError,
}: {
  upcoming?: ClinicAppointment;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <>
      <View style={styles.actionsRow}>
        {homeActions.map((action) => (
          <IconLabel
            key={action.key}
            icon={action.icon}
            label={action.label}
            backgroundColor={colors.patient.primary}
            iconColor={colors.patient.surface}
            onPress={
              action.consultationType
                ? () =>
                    router.push(
                      getFindDoctorRoute(action.consultationType!)
                    )
                : undefined
            }
            surfaceSize={52}
            surfaceRadius={16}
            iconSize={24}
            labelWidth={76}
            gap={8}
            labelNumberOfLines={2}
            labelStyle={styles.actionLabel}
          />
        ))}
      </View>

      <View style={styles.ambulanceBanner}>
        <AmbulanceBanner
          onBookPress={() => router.push("/ambulance" as unknown as Href)}
        />
      </View>

      {upcoming ? (
        <UpcomingAppointmentCard
          doctorName={upcoming.doctor_name}
          specialization={upcoming.facility_name}
          date={formatDisplayDate(upcoming.starts_at)}
          time={new Date(upcoming.starts_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          onCardPress={() => router.push("/appointments" as Href)}
        />
      ) : isLoading ? (
        <Text style={{ color: colors.patient.textSecondary }}>
          Loading your appointments…
        </Text>
      ) : isError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.patient.textSecondary }}
        >
          Could not load appointments. Open Bookings to retry.
        </Text>
      ) : null}

      <PopularServices />
    </>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  actionLabel: {
    textAlign: "center",
    fontSize: 12,
    color: colors.patient.text,
  },
  ambulanceBanner: {
    marginTop: 10,
    alignItems: "center",
  },
});
