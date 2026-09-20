import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, MapPin, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import { FadedScrollView } from "@startup/mobile-ui";
import { fontFamilies } from "@startup/design-tokens";
import { appointments } from "../../../data/demo";
import { PatientCard } from "../../patients/components/PatientCard";
import {
  Choice,
  Heading,
  IconButton,
  Label,
  palette,
  Panel,
  ui,
} from "../../../components/DoctorScreen";
import { useDoctorStore } from "../../../stores/useDoctorStore";
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const available = useDoctorStore((s) => s.available);
  const setAvailable = useDoctorStore((s) => s.setAvailable);
  const completed = useDoctorStore((s) => s.completedIds);
  const [showNotifications, setShowNotifications] = useState(false);
  return (
    <View style={ui.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={ui.flex}>
          <Heading style={{ color: palette.dark, fontSize: 16 }}>
            Good Morning! Dr Ananya
          </Heading>
          <View style={ui.row}>
            <MapPin size={14} color={palette.dark} />
            <Label style={{ color: palette.dark, fontSize: 13 }}>
              Bengaluru, India
            </Label>
          </View>
        </View>
        <IconButton
          label="Notifications"
          onPress={() => setShowNotifications(!showNotifications)}
          style={{ backgroundColor: palette.surface }}
        >
          <Bell size={19} color={palette.primary} />
        </IconButton>
      </View>
      <FadedScrollView
        edgeColor="white"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 130 + insets.bottom },
        ]}
      >
        {showNotifications && (
          <Panel>
            <Heading>Notifications</Heading>
            <Label muted>No new notifications in this demo.</Label>
          </Panel>
        )}
        <View style={ui.row}>
          {[
            ["18", "Appointments"],
            [String(Math.max(0, 6 - completed.length)), "In Queue"],
            ["₹4.5K", "Today’s Earnings"],
          ].map(([value, title], index) => (
            <View key={title} style={styles.stat}>
              <Heading
                style={{
                  fontSize: 24,
                  lineHeight: 30,
                  color:
                    index === 1
                      ? palette.text
                      : index === 2
                        ? "#22A86B"
                        : palette.accent,
                }}
              >
                {value}
              </Heading>
              <Label muted style={styles.caption}>
                {title}
              </Label>
            </View>
          ))}
        </View>
        <View style={[ui.between, { marginTop: 12 }]}>
          <Heading>Today’s Appointment</Heading>
          <IconButton
            label="See all appointments"
            onPress={() => router.navigate("/appointments")}
            style={{ width: 80 }}
          >
            <View style={{ ...ui.row, gap: 4 }}>
              <Label style={{ color: palette.dark, fontSize: 13 }}>
                See all
              </Label>
              <ArrowRight size={15} color={palette.dark} />
            </View>
          </IconButton>
        </View>
        <PatientCard home appointment={appointments[0]} />
        <PatientCard home appointment={appointments[3]} />
        <View style={styles.availability}>
          <View
            style={[
              ui.row,
              {
                gap: 0,
                borderRadius: 24,
                padding: 4,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <Choice
              label="Out"
              selected={!available}
              onPress={() => setAvailable(false)}
            />
            <Choice
              label="In"
              selected={available}
              onPress={() => setAvailable(true)}
            />
          </View>
        </View>
      </FadedScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: palette.chart,
    paddingHorizontal: 24,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  content: { padding: 16, paddingTop: 10, gap: 14, flexGrow: 1 },
  stat: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: palette.subtle,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  caption: { fontSize: 11, fontFamily: fontFamilies.medium },
  availability: {
    flex: 1,
    minHeight: 110,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingTop: 20,
  },
});
