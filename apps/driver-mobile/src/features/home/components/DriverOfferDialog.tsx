import type { DriverOfferDialogProps } from "../types/driver-offer-dialog";
export type { DriverOfferDialogProps } from "../types/driver-offer-dialog";
import { ModalSurface } from "@startup/mobile-ui";
import { View } from "react-native";
import { CircleAlert, User } from "lucide-react-native";
import { Button } from "@startup/mobile-ui";
import { Copy, Heading, Metrics } from "../../../components/DriverUI";
import { ui } from "../../../components/theme";

import { styles } from "./Home.styles";

export function DriverOfferDialog({
  offer,
  remaining,
  busy,
  responding,
  respond,
}: DriverOfferDialogProps) {
  return (
    <ModalSurface
      layout="custom"
      visible={Boolean(offer)}
      transparent
      animationType="fade"
      onClose={() => void respond(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.request}>
          <View style={styles.alert}>
            <CircleAlert size={20} color="white" />
            <Copy style={styles.alertText}>New Emergency Request</Copy>
            <Copy style={styles.counter}>{remaining}s</Copy>
          </View>
          <View style={ui.row}>
            <View style={styles.avatar}>
              <User color="white" />
            </View>
            <Heading>
              {offer?.booking_type === "sos"
                ? "SOS request"
                : "Ambulance request"}
            </Heading>
            <Copy style={[ui.badge, { marginLeft: "auto", maxWidth: 140 }]}>
              {offer?.capability_code}
            </Copy>
          </View>
          <Address
            label="PICKUP"
            text={offer?.pickup_address ?? "Location provided in request"}
          />
          <Address
            label="HOSPITAL"
            text={offer?.destination_address ?? "Destination to be confirmed"}
          />
          <Metrics
            items={[
              [
                offer
                  ? `${(offer.distance_meters / 1000).toFixed(1)} km`
                  : "â€”",
                "Distance",
              ],
              ["â€”", "ETA"],
              ["â€”", "Est. fare"],
            ]}
          />
          <View style={[ui.row, { marginTop: 20 }]}>
            <Button
              loading={busy && responding === false}
              theme="driver"
              variant="outline"
              label="Reject"
              style={ui.grow}
              disabled={busy}
              onPress={() => void respond(false)}
            />
            <Button
              loading={busy && responding === true}
              theme="driver"
              label="Accept"
              style={ui.grow}
              disabled={busy}
              onPress={() => void respond(true)}
            />
          </View>
        </View>
      </View>
    </ModalSurface>
  );
}
function Address({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.address}>
      <Copy style={ui.caption}>{label}</Copy>
      <Copy style={{ fontWeight: "600" }}>{text}</Copy>
    </View>
  );
}
