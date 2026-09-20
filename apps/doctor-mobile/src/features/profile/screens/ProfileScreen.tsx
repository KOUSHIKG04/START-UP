import { useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  Building,
  ChevronRight,
  CircleHelp,
  DollarSign,
  LogOut,
  Star,
} from "lucide-react-native";
import { Button, Input } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  palette,
  Panel,
  ui,
} from "../../../components/DoctorScreen";
import { useDoctorStore } from "../../../stores/useDoctorStore";
const rows = [
  {
    title: "My Ratings & Reviews",
    icon: Star,
    color: "#F59E0B",
    background: "#FFF8E5",
  },
  {
    title: "Earnings & Payouts",
    icon: DollarSign,
    color: "#FF7800",
    background: "#FFF3E2",
  },
  {
    title: "Hospital Settings",
    icon: Building,
    color: "#7565FF",
    background: "#F3F1FF",
  },
  {
    title: "Notification Preferences",
    icon: Bell,
    color: "#005E64",
    background: "#EFFFF9",
  },
  {
    title: "Help & Support",
    icon: CircleHelp,
    color: "#71818F",
    background: "#F5F5F7",
  },
];
export function ProfileScreen() {
  const [section, setSection] = useState<string | null>(null);
  const [logout, setLogout] = useState(false);
  const [hospital, setHospital] = useState("Apollo Hospitals");
  const [hospitalDraft, setHospitalDraft] = useState(hospital);
  const notifications = useDoctorStore((s) => s.notifications);
  const setNotifications = useDoctorStore((s) => s.setNotifications);
  const reset = useDoctorStore((s) => s.reset);
  return (
    <DoctorScreen
      title="My Profile"
      background="#F5F5F5"
      contentStyle={{ paddingTop: 0 }}
    >
      <View
        style={{
          backgroundColor: palette.chart,
          marginHorizontal: -16,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          gap: 20,
        }}
      >
        <View style={ui.row}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: palette.text,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Heading style={{ fontSize: 30, color: "#087F78" }}>P</Heading>
          </View>
          <View style={ui.flex}>
            <Heading style={{ fontSize: 18, color: palette.text }}>
              Dr. Priya Sharma
            </Heading>
            <Label>General Physician</Label>
            <Label muted style={{ fontSize: 12 }}>
              MBBS, MD (Internal Medicine)
            </Label>
          </View>
        </View>
        <View style={ui.row}>
          {[
            ["12 Yrs", "Experience"],
            ["0", "Patients Seen"],
            ["₹0.0k", "Earnings"],
          ].map(([value, label]) => (
            <View
              key={label}
              style={{
                flex: 1,
                alignItems: "center",
                backgroundColor: "#BED9D8",
                padding: 9,
                borderRadius: 10,
              }}
            >
              <Heading style={{ color: palette.text }}>{value}</Heading>
              <Label style={{ fontSize: 10 }}>{label}</Label>
            </View>
          ))}
        </View>
      </View>
      <View
        style={{
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        {[
          ["Hospital", hospital],
          ["Registration No.", "KMC–DR–001"],
          ["Phone", "1234567876"],
        ].map(([title, value], index) => (
          <View
            key={title}
            style={{
              ...ui.between,
              minHeight: 46,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: index < 2 ? 1 : 0,
              borderBottomColor: "#EEF4F5",
            }}
          >
            <Label muted style={{ fontSize: 13 }}>
              {title}
            </Label>
            <Heading style={{ fontSize: 13, color: palette.text }}>
              {value}
            </Heading>
          </View>
        ))}
      </View>
      <View
        style={{
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        {rows.map(({ title, icon: Icon, color, background }, index) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={() => {
              setSection(section === title ? null : title);
              setLogout(false);
            }}
            style={({ pressed }) => [
              {
                ...ui.row,
                minHeight: 64,
                paddingHorizontal: 16,
                borderBottomWidth: index < 4 ? 1 : 0,
                borderBottomColor: "#EEF4F5",
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                backgroundColor: background,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon color={color} size={21} />
            </View>
            <Label style={{ flex: 1 }}>{title}</Label>
            {index === 0 && (
              <View
                style={{
                  ...ui.row,
                  gap: 3,
                  backgroundColor: "#EAFBF4",
                  paddingHorizontal: 8,
                  borderRadius: 12,
                }}
              >
                <Star size={13} color="#00B989" />
                <Label style={{ color: "#00A77A", fontSize: 12 }}>4.9</Label>
              </View>
            )}
            <ChevronRight color="#93A4B9" size={18} />
          </Pressable>
        ))}
      </View>
      {section && (
        <Panel>
          <Heading>{section}</Heading>
          {section === "My Ratings & Reviews" && (
            <Label muted>
              4.9 is the Figma demo rating. No patient reviews are connected.
            </Label>
          )}
          {section === "Earnings & Payouts" && (
            <Label muted>
              No payouts are connected in this demo. Profile earnings: ₹0.0k.
            </Label>
          )}
          {section === "Hospital Settings" && (
            <>
              <Input
                label="Hospital name"
                accessibilityLabel="Hospital name"
                value={hospitalDraft}
                onChangeText={setHospitalDraft}
                containerStyle={ui.field}
              />
              <Button
                theme="doctor"
                label="Save hospital"
                disabled={!hospitalDraft.trim()}
                onPress={() => {
                  setHospital(hospitalDraft.trim());
                  setSection(null);
                }}
              />
              <Button
                theme="doctor"
                variant="secondary"
                label="Manage schedule"
                onPress={() => router.navigate("/schedule")}
              />
            </>
          )}
          {section === "Notification Preferences" && (
            <View style={ui.between}>
              <Label style={{ flex: 1 }}>
                Appointment notifications (demo)
              </Label>
              <Switch
                accessibilityLabel="Appointment notifications"
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#D1D5DB", true: palette.primary }}
              />
            </View>
          )}
          {section === "Help & Support" && (
            <Label muted>
              Use Scan QR to look up CLZ-0001. Home visit PIN: 1234. Notes,
              messages, and schedules are saved only for the current app
              session.
            </Label>
          )}
        </Panel>
      )}
      <Button
        label="Logout"
        variant="secondary"
        leftIcon={<LogOut size={21} color={palette.danger} />}
        labelStyle={{ color: palette.danger }}
        style={{ backgroundColor: "#FFF1F3", marginTop: 20 }}
        onPress={() => {
          setLogout(true);
          setSection(null);
        }}
      />
      {logout && (
        <Panel>
          <Heading>Reset the demo session?</Heading>
          <Label>
            There is no signed-in account. Resetting clears local notes,
            prescriptions, messages, and schedule changes.
          </Label>
          <View style={ui.row}>
            <Button
              label="Cancel"
              theme="doctor"
              variant="secondary"
              style={ui.flex}
              onPress={() => setLogout(false)}
            />
            <Button
              label="Reset demo"
              theme="doctor"
              style={ui.flex}
              onPress={() => {
                reset();
                setLogout(false);
                setHospital("Apollo Hospitals");
                setHospitalDraft("Apollo Hospitals");
                router.replace("/");
              }}
            />
          </View>
        </Panel>
      )}
    </DoctorScreen>
  );
}
