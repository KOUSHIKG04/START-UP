import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";
import { ambulanceTrip } from "../utils/ambulanceConstants";

export function AmbulancePayment({
  onPaymentComplete,
}: {
  onPaymentComplete: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "cash">("upi");

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.handoverBanner}>
        <View style={styles.handoverIconBox}>
          <CheckCircle2 color="#059669" size={26} strokeWidth={2.2} />
        </View>
        <View style={styles.handoverCopy}>
          <Text style={styles.handoverTitle}>Patient Handed Over</Text>
          <Text style={styles.handoverSubtitle}>
            Emergency care initiated at {ambulanceTrip.dropoff.split(",")[0]}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Building2 color="#087F78" size={18} />
          <Text style={styles.cardTitle}>Hospital Emergency Admission</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Hospital</Text>
          <Text style={styles.infoValue}>{ambulanceTrip.dropoff.split(",")[0]}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ward</Text>
          <Text style={styles.infoValue}>Emergency & Trauma Care (Ground Floor)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Driver / Unit</Text>
          <Text style={styles.infoValue}>
            {ambulanceTrip.driver} ({ambulanceTrip.vehicle})
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trip Duration</Text>
          <Text style={styles.infoValue}>16 mins • {ambulanceTrip.distance}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ReceiptText color="#087F78" size={18} />
          <Text style={styles.cardTitle}>Fare Breakdown</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Base Ambulance Dispatch</Text>
          <Text style={styles.infoValue}>₹500</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ALS Support & Oxygen Kit</Text>
          <Text style={styles.infoValue}>₹600</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Emergency Priority Charge</Text>
          <Text style={styles.infoValue}>₹100</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable Amount</Text>
          <Text style={styles.totalValue}>₹{ambulanceTrip.fare}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Payment Method</Text>
        <View style={styles.methodsList}>
          <Pressable
            onPress={() => setPaymentMethod("upi")}
            style={({ pressed }) => [
              styles.methodItem,
              paymentMethod === "upi" && styles.methodItemSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.methodLeft}>
              <View
                style={[
                  styles.methodIconBox,
                  paymentMethod === "upi" && styles.methodIconBoxSelected,
                ]}
              >
                <Sparkles
                  color={paymentMethod === "upi" ? "#087F78" : "#71818F"}
                  size={18}
                />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodName}>UPI (Google Pay / PhonePe / Paytm)</Text>
                <Text style={styles.methodHint}>Instant 1-click payment</Text>
              </View>
            </View>
            <View
              style={[
                styles.radioCircle,
                paymentMethod === "upi" && styles.radioCircleSelected,
              ]}
            >
              {paymentMethod === "upi" ? (
                <View style={styles.radioInner} />
              ) : null}
            </View>
          </Pressable>

          <Pressable
            onPress={() => setPaymentMethod("card")}
            style={({ pressed }) => [
              styles.methodItem,
              paymentMethod === "card" && styles.methodItemSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.methodLeft}>
              <View
                style={[
                  styles.methodIconBox,
                  paymentMethod === "card" && styles.methodIconBoxSelected,
                ]}
              >
                <CreditCard
                  color={paymentMethod === "card" ? "#087F78" : "#71818F"}
                  size={18}
                />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodName}>Credit / Debit Card</Text>
                <Text style={styles.methodHint}>Visa, Mastercard, RuPay</Text>
              </View>
            </View>
            <View
              style={[
                styles.radioCircle,
                paymentMethod === "card" && styles.radioCircleSelected,
              ]}
            >
              {paymentMethod === "card" ? (
                <View style={styles.radioInner} />
              ) : null}
            </View>
          </Pressable>

          <Pressable
            onPress={() => setPaymentMethod("cash")}
            style={({ pressed }) => [
              styles.methodItem,
              paymentMethod === "cash" && styles.methodItemSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.methodLeft}>
              <View
                style={[
                  styles.methodIconBox,
                  paymentMethod === "cash" && styles.methodIconBoxSelected,
                ]}
              >
                <Wallet
                  color={paymentMethod === "cash" ? "#087F78" : "#71818F"}
                  size={18}
                />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodName}>Cash / Hospital Billing</Text>
                <Text style={styles.methodHint}>Pay directly at admission desk</Text>
              </View>
            </View>
            <View
              style={[
                styles.radioCircle,
                paymentMethod === "cash" && styles.radioCircleSelected,
              ]}
            >
              {paymentMethod === "cash" ? (
                <View style={styles.radioInner} />
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>

      <Button
        label={`Pay ₹${ambulanceTrip.fare} & Complete Handover`}
        variant="primary"
        theme="patient"
        onPress={onPaymentComplete}
        style={styles.payButton}
      />

      <View style={styles.trustFooter}>
        <ShieldCheck color="#087F78" size={16} />
        <Text style={styles.trustText}>
          Secure Encrypted Transaction • Hospital receipt included
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 14,
  },
  handoverBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#E6F7ED",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  handoverIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  handoverCopy: {
    flex: 1,
    gap: 3,
  },
  handoverTitle: {
    color: "#065F46",
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  handoverSubtitle: {
    color: "#047857",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  infoValue: {
    color: "#0C2434",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalLabel: {
    color: "#0C2434",
    fontFamily: fontFamilies.bold,
    fontSize: 15,
  },
  totalValue: {
    color: "#087F78",
    fontFamily: fontFamilies.bold,
    fontSize: 20,
  },
  methodsList: {
    gap: 10,
    marginTop: 4,
  },
  methodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  methodItemSelected: {
    backgroundColor: "#E8F5F4",
    borderColor: "#087F78",
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  methodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  methodIconBoxSelected: {
    backgroundColor: "#C8EAE7",
  },
  methodCopy: {
    flex: 1,
    gap: 2,
  },
  methodName: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
  },
  methodHint: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#087F78",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#087F78",
  },
  payButton: {
    height: 52,
    borderRadius: 14,
    marginTop: 4,
  },
  trustFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  trustText: {
    color: "#087F78",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
});
