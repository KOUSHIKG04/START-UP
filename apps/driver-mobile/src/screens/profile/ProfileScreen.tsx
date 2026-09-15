import { useState } from "react";
import { Image, Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import {
  Ambulance,
  ChevronRight,
  FileCheck,
  Headphones,
  ShieldCheck,
  User,
} from "lucide-react-native";
import {
  Body,
  Card,
  Copy,
  Heading,
  PageHeader,
  palette,
  ui,
} from "../../components/DriverUI";
import { useDriver } from "../../store/driver";
export function ProfileScreen() {
  const { profile, verified, online, setOnline, stage } = useDriver();
  const [support, setSupport] = useState(false);
  return (
    <View style={ui.screen}>
      <PageHeader title="Profile" subtitle="Your CLINZO partner account" />
      <Body>
        <View style={[ui.center, { paddingVertical: 16 }]}>
          {profile.photo ? (
            <Image
              source={{ uri: profile.photo }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
            />
          ) : (
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: palette.soft,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <User size={36} color={palette.primary} />
            </View>
          )}
          <Heading>{profile.name || "Ambulance Partner"}</Heading>
          <Copy style={ui.caption}>
            {profile.mobile || "Add your contact details"}
          </Copy>
          <Copy style={ui.badge}>
            {verified ? "Verified partner · preview" : "Verification pending"}
          </Copy>
        </View>
        <Card>
          <View style={ui.between}>
            <View style={ui.grow}>
              <Heading>Availability</Heading>
              <Copy style={ui.caption}>
                {online ? "Online for emergency requests" : "Currently offline"}
              </Copy>
            </View>
            <Switch
              accessibilityLabel="Driver availability"
              value={online}
              onValueChange={setOnline}
              disabled={!["idle", "complete"].includes(stage)}
              trackColor={{ true: palette.primary }}
            />
          </View>
        </Card>
        <Card>
          {[
            {
              label: "Personal details",
              Icon: User,
              action: () =>
                router.push({ pathname: "/details", params: { edit: "true" } }),
            },
            {
              label: "Vehicle & documents",
              Icon: Ambulance,
              action: () =>
                router.push({
                  pathname: "/documents",
                  params: { edit: "true" },
                }),
            },
            {
              label: "Verification status",
              Icon: ShieldCheck,
              action: () => router.push("/verification"),
            },
            {
              label: "Trip history",
              Icon: FileCheck,
              action: () => router.navigate("/trips"),
            },
            {
              label: "Help & support",
              Icon: Headphones,
              action: () => setSupport(!support),
            },
          ].map(({ label, Icon, action }) => (
            <Pressable
              accessibilityRole="button"
              onPress={action}
              key={label}
              style={[ui.row, { minHeight: 52 }]}
            >
              <Icon color={palette.primary} size={22} />
              <Copy style={ui.grow}>{label}</Copy>
              <ChevronRight color={palette.muted} size={18} />
            </Pressable>
          ))}
        </Card>
        {support && (
          <Card>
            <Heading>Partner support</Heading>
            <Copy>
              Support contact details will be supplied by your ambulance
              operator when your account is activated.
            </Copy>
          </Card>
        )}
        <Copy style={[ui.caption, { textAlign: "center" }]}>
          CLINZO Rescue · Ambulance Partner
        </Copy>
      </Body>
    </View>
  );
}
