import { StatusBar } from "expo-status-bar";
import { NotificationDrawer } from "../../notifications/components/NotificationDrawer";
import { locationHeadline } from "../../locations/utils/savedLocationDisplay";
import { colors } from "@startup/design-tokens";
import { Image, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Ambulance, Bell, ChevronDown, MapPin } from "lucide-react-native";
import { Button } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";
import { useDriverHome } from "../hooks/useDriverHome";
import { styles } from "../components/Home.styles";
import { DriverOfferDialog } from "../components/DriverOfferDialog";

export function HomeScreen() {
  const {
    refresh,
    greeting,
    insets,
    showNotifications,
    setShowNotifications,
    busy,
    responding,
    selectedLocation,
    driverProfile,
    vehicle,
    online,
    active,
    completedToday,
    offer,
    remaining,
    changeAvailability,
    respond,
  } = useDriverHome();
  return (
    <View style={ui.screen}>
      <StatusBar style="light" />
      <View
        style={[styles.header, { minHeight: Math.max(165, insets.top + 88) }]}
      >
        <View style={[styles.headerRow, { marginTop: insets.top + 18 }]}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}! {driverProfile.data?.full_name ?? "Driver"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Selected location: ${locationHeadline(selectedLocation)}. Change location`}
            onPress={() => router.push("/select-location")}
            style={styles.location}
          >
            <MapPin size={15} strokeWidth={2} color={colors.white} />
            <Text
              style={styles.locationText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {locationHeadline(selectedLocation)}
            </Text>
            <ChevronDown size={15} color={colors.white} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={10}
          onPress={() => setShowNotifications(true)}
          style={({ pressed }) => [
            styles.notificationButton,
            { top: insets.top + 22 },
            pressed && styles.notificationButtonPressed,
          ]}
        >
          <Bell size={20} strokeWidth={1.9} color={palette.primary} />
        </Pressable>
      </View>
      <Body onRefresh={refresh}>
        <View style={ui.between}>
          <Heading>{online ? "Available" : "Offline"}</Heading>
          <Switch
            accessibilityLabel="Receive emergency requests"
            value={online}
            disabled={
              busy || !vehicle?.ready_to_go_available || Boolean(active)
            }
            onValueChange={(value) => void changeAvailability(value)}
            trackColor={{ false: colors.borderDefault, true: palette.primary }}
            thumbColor={online ? colors.white : palette.primary}
          />
        </View>
        {active ? (
          <Button
            theme="driver"
            label="Return to active trip"
            onPress={() => router.push("/trip")}
          />
        ) : null}
        {online ? (
          <>
            <View style={styles.wait}>
              <View style={styles.dot} />
              <Copy style={{ color: palette.primary }}>
                Waiting for requests...
              </Copy>
            </View>
            <Image
              alt="Reference map; live route navigation is not connected"
              source={require("../../../../assets/figma/online-map.png")}
              style={styles.map}
            />
            <Copy style={ui.caption}>
              Reference map Â· live navigation is not connected
            </Copy>
          </>
        ) : null}
        <Card>
          <Copy style={{ color: palette.muted }}>
            {online ? "TODAYâ€™S WORK SUMMARY" : "TODAYâ€™S SUMMARY"}
          </Copy>
          <View style={ui.between}>
            <View>
              <Copy style={styles.total}>â€”</Copy>
              <Copy style={ui.caption}>Total Earnings</Copy>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Copy style={styles.total}>{completedToday}</Copy>
              <Copy style={ui.caption}>Completed Trips</Copy>
            </View>
          </View>
        </Card>
        <Metrics
          items={[
            ["â€”", "Acceptance"],
            ["â€”", "Rating"],
            ["â€”", "Online Hrs"],
          ]}
        />
        {!online && completedToday === 0 ? (
          <Card>
            <View style={[ui.center, { paddingVertical: 10 }]}>
              <Ambulance size={42} color={palette.border} />
              <Heading>No trips yet today</Heading>
              <Copy style={[ui.caption, { textAlign: "center" }]}>
                Your completed ambulance trips for today will appear here.
              </Copy>
            </View>
          </Card>
        ) : null}
        {!vehicle ? (
          <Card>
            <Heading>Vehicle review required</Heading>
            <Copy>
              Add a vehicle and documents in Profile, then wait for company
              approval before going Available.
            </Copy>
          </Card>
        ) : null}
      </Body>
      <DriverOfferDialog
        offer={offer}
        remaining={remaining}
        busy={busy}
        responding={responding}
        respond={respond}
      />
      <NotificationDrawer
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
}
