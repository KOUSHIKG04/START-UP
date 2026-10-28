import { View } from "react-native";
import { router } from "expo-router";
import {
  AppText,
  Button,
  Card,
  FadedScrollView,
  Header,
} from "@startup/mobile-ui";
import { AmbulancePayment } from "../components/AmbulancePayment";
import { useAmbulancePaymentHistory } from "../hooks/useAmbulancePaymentHistory";

export function AmbulancePaymentsScreen({ bookingId }: { bookingId?: string }) {
  const { refresh, bookings, completed } =
    useAmbulancePaymentHistory(bookingId);
  return (
    <View style={{ flex: 1 }}>
      <Header
        app="patient"
        title={bookingId ? "Trip payment" : "Past trips & payments"}
        onBackPress={() => router.back()}
      />
      <FadedScrollView
        onRefresh={refresh}
        refreshTheme="patient"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      >
        {bookingId ? (
          <AmbulancePayment bookingId={bookingId} />
        ) : (
          <>
            {bookings.isLoading ? (
              <AppText>Loading completed trips…</AppText>
            ) : null}
            {bookings.isError ? (
              <Button
                theme="patient"
                label="Retry completed trips"
                variant="outline"
                onPress={() => void bookings.refetch()}
              />
            ) : null}
            {!bookings.isLoading && !bookings.isError && !completed.length ? (
              <AppText>No completed ambulance trips yet.</AppText>
            ) : null}
            {completed.map((b) => (
              <Card key={b.id} padding={16} gap={8}>
                <AppText variant="cardHeading">Trip {b.public_code}</AppText>
                <AppText>
                  {b.pickup_address ?? "Pickup"} →{" "}
                  {b.destination_address ?? "Destination"}
                </AppText>
                <Button
                  theme="patient"
                  label="View fare & payment"
                  variant="outline"
                  onPress={() =>
                    router.push({
                      pathname: "/ambulance/payment/[id]",
                      params: { id: b.id },
                    })
                  }
                />
              </Card>
            ))}
          </>
        )}
      </FadedScrollView>
    </View>
  );
}
