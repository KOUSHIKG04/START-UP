import { useDriverProfile } from "../hooks/useDriverProfile";

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

import { Button } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  PageHeader,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";

import { signOutWithPushCleanup } from "../../notifications/services/deviceNotifications";

export function ProfileScreen() {
  const {
    profile,
    support,
    setSupport,
    busy,
    driver,
    photo,
    vehicle,
    online,
    changeAvailability,
  } = useDriverProfile();
  return (
    <View style={ui.screen}>
      <PageHeader title="Profile" />
      <Body>
        <View style={[ui.center, { paddingVertical: 16 }]}>
          {photo.data ? (
            <Image
              alt="Your driver profile photo"
              source={{ uri: photo.data }}
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
          <Heading>
            {driver.data?.full_name ??
              profile?.display_name ??
              "Ambulance Partner"}
          </Heading>
          <Copy style={ui.caption}>
            {driver.data?.contact_phone ?? "Add your contact details"}
          </Copy>
          <Copy style={ui.badge}>
            {profile?.driver?.status === "verified"
              ? "Verified partner"
              : "Verification pending"}
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
              onValueChange={(value) => void changeAvailability(value)}
              disabled={busy || !vehicle || !vehicle.ready_to_go_available}
              trackColor={{ true: palette.primary }}
            />
          </View>
        </Card>
        <Card>
          {[
            {
              label: "Personal details",
              Icon: User,
              action: () => router.push("/(app)/edit-profile"),
            },
            {
              label: "Vehicle & documents",
              Icon: Ambulance,
              action: () => router.push("/(app)/documents"),
            },
            {
              label: "Verification status",
              Icon: ShieldCheck,
              action: () => router.push("/(app)/verification"),
            },
            {
              label: "Trip history",
              Icon: FileCheck,
              action: () => router.navigate("/(app)/(tabs)/trips"),
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
        {support ? (
          <Card>
            <Heading>Partner support</Heading>
            <Copy>
              Support contact details will be supplied by your ambulance
              operator when your account is activated.
            </Copy>
          </Card>
        ) : null}
        <Button
          theme="driver"
          variant="outline"
          label="Sign out"
          onPress={() => void signOutWithPushCleanup()}
        />
        <Copy style={[ui.caption, { textAlign: "center" }]}>
          CLINZO Rescue · Ambulance Partner
        </Copy>
      </Body>
    </View>
  );
}
