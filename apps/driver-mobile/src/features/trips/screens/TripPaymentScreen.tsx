import { View } from "react-native";
import { router } from "expo-router";
import { Body, PageHeader } from "../../../components/DriverUI";
import { ui } from "../../../components/theme";
import { TripPayment } from "../components/TripPayment";

export function TripPaymentScreen({ bookingId }: { bookingId: string }) {
  return (
    <View style={ui.screen}>
      <PageHeader title="Trip payment" onBack={() => router.back()} />
      <Body>
        <TripPayment bookingId={bookingId} />
      </Body>
    </View>
  );
}
