import { useState } from "react";
import { Image, Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ambulance,
  ChevronRight,
  FileCheck,
  Headphones,
  ShieldCheck,
  User,
} from "lucide-react-native";
import {
  getMyDriverProfile,
  listMyAmbulanceFleet,
  setMyDriverAvailability,
} from "@startup/data-access";
import { Button } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  PageHeader,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
import { signOutWithPushCleanup } from "../../notifications/deviceNotifications";

export function ProfileScreen() {
  const { profile } = useMobileSession();
  const [support, setSupport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const driver = useQuery({
    queryKey: ["my-driver-profile"],
    queryFn: () => getMyDriverProfile(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });

  const fleet = useQuery({
    queryKey: ["driver-fleet", profile?.driver?.id],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });

  const photo = useQuery({
    queryKey: ["my-driver-photo", driver.data?.profile_photo_path],
    queryFn: async () => {
      const result = await supabase!.storage
        .from("driver-evidence")
        .createSignedUrl(driver.data!.profile_photo_path!, 3600);
      if (result.error) throw result.error;
      return result.data.signedUrl;
    },
    enabled: Boolean(supabase && driver.data?.profile_photo_path),
  });

  const vehicle =
    fleet.data?.find((item) => item.desired_availability === "online") ??
    fleet.data?.find((item) => item.ready_to_go_available);

  const online = vehicle?.desired_availability === "online";

  async function changeAvailability(value: boolean) {
    if (!supabase || !vehicle || busy) return;

    setBusy(true);
    setMessage("");

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (value) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted)
          throw new Error("Allow location to go Available.");
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      await setMyDriverAvailability(supabase, {
        vehicleId: vehicle.vehicle_id,
        online: value,
        latitude,
        longitude,
      });
      await queryClient.invalidateQueries({
        queryKey: ["driver-fleet", profile?.driver?.id],
      });
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Could not update availability."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={ui.screen}>
      <PageHeader title="Profile" subtitle="Your CLINZO partner account" />
      <Body>
        <View style={[ui.center, { paddingVertical: 16 }]}>
          {photo.data ? (
            <Image
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
        {fleet.isError || driver.isError ? (
          <Copy accessibilityRole="alert">
            Could not load your partner details.
          </Copy>
        ) : null}
        {message ? <Copy accessibilityRole="alert">{message}</Copy> : null}
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
