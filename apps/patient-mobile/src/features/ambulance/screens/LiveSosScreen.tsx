import { useLiveSos } from "../hooks/useLiveSos";
import type { LiveSosScreenProps } from "../types/live-sos-screen";
import { sosDispatchEnabled } from "../utils/sosConstants";
import { AppText as Text } from "@startup/mobile-ui";

import { Linking, ScrollView, StyleSheet, View } from "react-native";
import * as Crypto from "expo-crypto";

import {
  Button,
  Header,
  Input,
  Loader,
  SafeAreaView,
} from "@startup/mobile-ui";

export function LiveSosScreen({
  onBackPress,
  onboarding = false,
}: LiveSosScreenProps) {
  const {
    profile,
    pickup,
    address,
    setAddress,
    summary,
    setSummary,
    fullName,
    setFullName,
    contactPhone,
    setContactPhone,
    setRequestKey,
    locating,
    bookings,
    active,
    pinVisible,
    verificationPin,
    tracking,
    locate,
    request,
    cancel,
    refreshDispatch,
  } = useLiveSos({ onBackPress, onboarding });
  return (
    <SafeAreaView style={styles.screen}>
      <Header title="SOS Emergency" app="patient" onBackPress={onBackPress} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="cardHeading" style={styles.title}>
          Emergency help
        </Text>
        <Text variant="body">
          For immediate voice assistance, call your local emergency service. In
          India, dial 112.
        </Text>
        <Button
          label="Call emergency 112"
          onPress={() => void Linking.openURL("tel:112")}
        />
        {!sosDispatchEnabled ? (
          <Text variant="body" accessibilityRole="alert">
            In-app SOS dispatch is not active yet. Use the emergency call button
            above.
          </Text>
        ) : null}
        {sosDispatchEnabled ? (
          <>
            {active ? (
              <View style={styles.card}>
                <Text variant="body" style={styles.subtitle}>
                  Active SOS · {active.status}
                </Text>
                <Text variant="body">{active.public_code}</Text>
                <Text variant="body">
                  {active.driver_name
                    ? `Driver: ${active.driver_name} · ${active.vehicle_registration}`
                    : "No driver assigned yet."}
                </Text>
                {active.trip_status ? (
                  <Text variant="body">Trip: {active.trip_status}</Text>
                ) : null}
                {active.status === "assigned" ? (
                  tracking.data ? (
                    <Text variant="body">
                      Driver location: {tracking.data.latitude.toFixed(5)},{" "}
                      {tracking.data.longitude.toFixed(5)} · updated{" "}
                      {new Date(tracking.data.received_at).toLocaleTimeString()}
                    </Text>
                  ) : (
                    <Text variant="body">
                      Waiting for a current driver location.
                    </Text>
                  )
                ) : null}
                {pinVisible ? (
                  <View style={styles.card}>
                    <Text variant="body" style={styles.subtitle}>
                      Your completion PIN
                    </Text>
                    {verificationPin.isLoading ? (
                      <Loader theme="patient" style={{ minHeight: 36 }} />
                    ) : null}
                    {verificationPin.data ? (
                      <Text
                        variant="body"
                        accessibilityLabel="Four-digit completion PIN"
                        style={styles.pin}
                      >
                        {verificationPin.data}
                      </Text>
                    ) : null}
                    <Text variant="body">
                      Give this PIN to the driver only when you reach your
                      destination.
                    </Text>
                  </View>
                ) : null}
                {active.status === "searching" ? (
                  <>
                    <Button
                      loading={refreshDispatch.isPending}
                      label="Search again"
                      variant="outline"
                      disabled={refreshDispatch.isPending}
                      onPress={() => refreshDispatch.mutate()}
                    />
                    <Button
                      loading={cancel.isPending}
                      label="Cancel unassigned SOS"
                      variant="outline"
                      disabled={cancel.isPending}
                      onPress={() => cancel.mutate()}
                    />
                  </>
                ) : null}
              </View>
            ) : (
              <>
                <Text variant="body" style={styles.subtitle}>
                  Request an ALS ambulance
                </Text>
                {onboarding ? (
                  <>
                    <Input
                      label="Patient name"
                      value={fullName}
                      autoComplete="name"
                      onChangeText={(value) => {
                        setFullName(value);
                        setRequestKey(Crypto.randomUUID());
                      }}
                    />
                    <Input
                      label="Contact phone"
                      value={contactPhone}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                      onChangeText={(value) => {
                        setContactPhone(value.replace(/[\s()-]/g, ""));
                        setRequestKey(Crypto.randomUUID());
                      }}
                    />
                  </>
                ) : null}
                <Button
                  loading={locating}
                  label={
                    pickup ? "Refresh location" : "Use my current location"
                  }
                  accessibilityLabel={
                    locating
                      ? "Locating pickup"
                      : pickup
                        ? "Refresh location"
                        : "Use my current location"
                  }
                  leftIcon={locating ? <Loader theme="patient" /> : undefined}
                  disabled={locating}
                  variant="outline"
                  onPress={() => void locate()}
                />
                <Input
                  label="Pickup address or landmark"
                  value={address}
                  onChangeText={(value) => {
                    setAddress(value);
                    setRequestKey(Crypto.randomUUID());
                  }}
                />
                <Input
                  label="What happened?"
                  value={summary}
                  onChangeText={(value) => {
                    setSummary(value);
                    setRequestKey(Crypto.randomUUID());
                  }}
                />
                <Button
                  loading={request.isPending}
                  label="Hold to send SOS"
                  variant="danger"
                  labelStyle={styles.sosText}
                  accessibilityRole="button"
                  accessibilityLabel="Hold to send SOS request"
                  disabled={
                    request.isPending ||
                    !pickup ||
                    address.trim().length < 5 ||
                    summary.trim().length < 5 ||
                    (onboarding &&
                      (fullName.trim().length < 2 ||
                        !/^\+[1-9][0-9]{7,14}$/.test(contactPhone)))
                  }
                  delayLongPress={2300}
                  accessibilityHint="Hold for 2.3 seconds to send the SOS request."
                  onLongPress={() => request.mutate()}
                  style={styles.sosButton}
                >
                  <Text variant="body" style={styles.sosText}>
                    {request.isPending ? "Sending…" : "Hold to send SOS"}
                  </Text>
                </Button>
                <Text variant="body">
                  The destination hospital can be chosen after emergency
                  assessment.
                </Text>
              </>
            )}
            <Button
              loading={bookings.isFetching}
              label="Refresh status"
              variant="outline"
              disabled={!profile?.patient_id || bookings.isFetching}
              onPress={() => void bookings.refetch()}
            />
          </>
        ) : null}
        {onboarding ? (
          <Button
            label="Continue profile setup"
            variant="outline"
            onPress={onBackPress}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 27, fontWeight: "700" },
  subtitle: { fontSize: 19, fontWeight: "700" },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#DAE0E5",
    borderRadius: 12,
    gap: 12,
  },
  sosButton: {
    backgroundColor: "#BB1D27",
    minHeight: 68,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sosText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  pin: { fontSize: 30, letterSpacing: 8, fontWeight: "700" },
});
