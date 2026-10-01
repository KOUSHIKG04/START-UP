import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  Building,
  ChevronRight,
  CircleHelp,
  DollarSign,
  LogOut,
  User,
  Star,
} from "lucide-react-native";
import { Button, Input } from "@startup/mobile-ui";
import { signOutWithPushCleanup } from "../../notifications/deviceNotifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyDoctorProfile,
  listMyPracticeAppointments,
  updateMyDoctorProfile,
} from "@startup/data-access";
import {
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../../services/supabase";
const rows = [
  {
    title: "Edit profile",
    icon: User,
    color: "#087F78",
    background: "#EFFFF9",
  },
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
  const { session } = useMobileSession();
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["my-doctor-profile"],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase),
  });
  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  const [section, setSection] = useState<string | null>(null);
  const [logout, setLogout] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.full_name);
    setBio(profile.data.bio ?? "");
    setLanguages(profile.data.languages.join(", "));
  }, [profile.data]);

  const saveProfile = useMutation({
    mutationFn: () =>
      updateMyDoctorProfile(supabase!, {
        fullName: name,
        bio,
        languages: languages
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      }),

    onSuccess: async () => {
      setEditMessage("Profile saved.");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-doctor-profile"] }),
        mobileSession.refresh(),
      ]);
    },

    onError: (cause) =>
      setEditMessage(
        cause instanceof Error ? cause.message : "Could not save profile."
      ),
  });
  const reset = useDoctorStore((s) => s.reset);
  const years = profile.data
    ? Math.max(
        0,
        new Date().getFullYear() -
          Number(profile.data.practice_started_on.slice(0, 4))
      )
    : null;
    
  const patientsSeen = new Set(
    appointments.data
      ?.filter((item) => item.status === "completed")
      .map((item) => item.patient_id) ?? []
  ).size;

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
            <Heading style={{ fontSize: 30, color: "#087F78" }}>
              {profile.data?.full_name?.charAt(0).toUpperCase() ?? "D"}
            </Heading>
          </View>
          <View style={ui.flex}>
            <Heading style={{ fontSize: 18, color: palette.text }}>
              {profile.data?.full_name ?? "Doctor"}
            </Heading>
            <Label>
              {profile.data?.specialties.map((item) => item.name).join(", ") ||
                "Specialty awaiting review"}
            </Label>
            <Label muted style={{ fontSize: 12 }}>
              {profile.data?.registration_authority ?? "Registration pending"}
            </Label>
          </View>
        </View>
        <View style={ui.row}>
          {[
            [years === null ? "—" : `${years} Yrs`, "Experience"],
            [String(patientsSeen), "Patients Seen"],
            ["—", "Earnings"],
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
          [
            "Hospital",
            profile.data?.facilities
              .map((item) => item.facility_name)
              .join(", ") || "No linked facility",
          ],
          ["Registration No.", profile.data?.registration_number ?? "—"],
          ["Phone", session?.user.phone || "Not linked"],
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
                borderBottomWidth: index < rows.length - 1 ? 1 : 0,
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
            {title === "My Ratings & Reviews" && (
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
                <Label style={{ color: "#00A77A", fontSize: 12 }}>—</Label>
              </View>
            )}
            <ChevronRight color="#93A4B9" size={18} />
          </Pressable>
        ))}
      </View>
      {section && (
        <Panel>
          <Heading>{section}</Heading>
          {section === "Edit profile" && (
            <>
              <Input label="Full name" value={name} onChangeText={setName} />
              <Input
                label="About"
                value={bio}
                onChangeText={setBio}
                multiline
              />
              <Input
                label="Languages (codes separated by commas)"
                value={languages}
                onChangeText={setLanguages}
                placeholder="en, hi"
              />
              <Button
                theme="doctor"
                label={saveProfile.isPending ? "Saving…" : "Save profile"}
                disabled={saveProfile.isPending}
                onPress={() => saveProfile.mutate()}
              />
              {editMessage ? (
                <Label
                  style={
                    editMessage === "Profile saved." ? ui.success : ui.error
                  }
                >
                  {editMessage}
                </Label>
              ) : null}
            </>
          )}
          {section === "My Ratings & Reviews" && (
            <Label muted>Patient reviews are not connected yet.</Label>
          )}
          {section === "Earnings & Payouts" && (
            <Label muted>Payout statements are not connected yet.</Label>
          )}
          {section === "Hospital Settings" && (
            <>
              {profile.data?.facilities.length ? (
                profile.data.facilities.map((item) => (
                  <Label key={item.practice_id}>
                    {item.facility_name} · {item.address}
                  </Label>
                ))
              ) : (
                <Label muted>No facility linked yet.</Label>
              )}
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
              <Label style={{ flex: 1 }}>Appointment notifications</Label>
              <Switch
                accessibilityLabel="Appointment notifications"
                value={false}
                disabled
                trackColor={{ false: "#D1D5DB", true: palette.primary }}
              />
              <Label muted>Notification delivery is not connected yet.</Label>
            </View>
          )}
          {section === "Help & Support" && (
            <Label muted>
              Your clinic or operator can provide support contact details. For
              an emergency, call local emergency services.
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
          <Heading>Sign out of your account?</Heading>
          <Label>You can sign back in with the same verified account.</Label>
          <View style={ui.row}>
            <Button
              label="Cancel"
              theme="doctor"
              variant="secondary"
              style={ui.flex}
              onPress={() => setLogout(false)}
            />
            <Button
              label="Sign out"
              theme="doctor"
              style={ui.flex}
              onPress={() => {
                reset();
                void signOutWithPushCleanup();
                setLogout(false);
                router.replace("/");
              }}
            />
          </View>
        </Panel>
      )}
    </DoctorScreen>
  );
}
