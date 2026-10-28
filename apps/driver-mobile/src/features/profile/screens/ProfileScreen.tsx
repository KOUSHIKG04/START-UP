import { useDriverProfile } from "../hooks/useDriverProfile";

import { Image, ScrollView, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";

import {
  Ambulance,
  ChevronRight,
  FileCheck,
  Headphones,
  ShieldCheck,
  User,
} from "lucide-react-native";

import { Button, Card, PullToRefresh } from "@startup/mobile-ui";
import { colors, fontFamilies, surfaces } from "@startup/design-tokens";
import { Copy, Heading, PageHeader } from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";

import { signOutWithPushCleanup } from "../../notifications/services/deviceNotifications";

export function ProfileScreen() {
  const {
    refresh,
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
      <ScrollView
        alwaysBounceVertical
        refreshControl={<PullToRefresh theme="driver" onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
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
        <Card theme="driver" style={styles.card}>
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
          <Card
            theme="driver"
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={action}
            key={label}
            padding={0}
            gap={0}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.actionRow}>
              <View style={styles.actionIcon}>
                <Icon color={colors.white} size={21} />
              </View>
              <Copy style={styles.actionTitle}>{label}</Copy>
              <ChevronRight
                color={palette.muted}
                size={24}
                style={styles.trailingIcon}
              />
            </View>
          </Card>
        ))}
        {support ? (
          <Card theme="driver" style={styles.card}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 118,
    flexGrow: 1,
    gap: 14,
  },
  card: {
    width: "98%",
    alignSelf: "center",
    borderRadius: 14,
    backgroundColor: colors.white,
    ...surfaces.card,
    overflow: "visible",
  },
  actionRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    flex: 1,
    fontFamily: fontFamilies.semibold,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 19,
  },
  trailingIcon: { transform: [{ translateX: -1 }] },
  pressed: { opacity: 0.75 },
});
