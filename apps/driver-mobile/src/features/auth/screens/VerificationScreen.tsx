import { verificationItems } from "../utils/verificationConstants";
import type { VerificationScreenProps } from "../types/verification-screen";
import { Image, ScrollView, Text, View } from "react-native";
import { Button } from "@startup/mobile-ui";
import { BadgeCheck, CheckCheck, Clock3 } from "lucide-react-native";
import { s } from "../components/Registration.styles";
import { Frame } from "../components/RegistrationFrame";
import { teal } from "../utils/registrationConstants";

export function VerificationScreen({
  verified,
  rejectionReason,
  onDashboard,
  onBack,
}: VerificationScreenProps) {
  return (
    <Frame title="Verification" onBack={onBack}>
      <ScrollView contentContainerStyle={s.verificationContent}>
        <Image
          alt=""
          source={require("../../../../assets/figma/verified.png")}
          style={s.verifiedImage}
          resizeMode="contain"
        />
        <Text style={s.thankYou}>Thank You!</Text>
        <Text style={s.verificationSubtitle}>
          {verified
            ? "You’re ready to respond."
            : rejectionReason
              ? "A document needs a replacement"
              : "Please Wait Until We Verify Your Profile"}
        </Text>
        {rejectionReason ? (
          <Text accessibilityRole="alert" style={s.waitBody}>
            {rejectionReason}
          </Text>
        ) : null}
        {verified ? (
          <View style={s.statusCard}>
            <Text style={s.sectionTitle}>Verification status</Text>
            {verificationItems.map((item) => (
              <View key={item.title} style={s.statusRow}>
                <BadgeCheck color={teal} size={23} />
                <View style={s.flex}>
                  <Text style={s.rowTitle}>{item.title}</Text>
                  <Text style={s.caption}>{item.body}</Text>
                </View>
                <View style={s.pill}>
                  <Text style={s.pillText}>Verified</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.waiting}>
            <Clock3 color={teal} size={26} />
            <Text style={s.waitTitle}>Verification in progress</Text>
            <Text style={s.waitBody}>
              Your personal details, vehicle and documents are ready for review.
              Your dashboard will be available after approval.
            </Text>
            <View style={s.received}>
              <CheckCheck size={18} color={teal} />
              <Text style={s.receivedText}>
                All required documents selected
              </Text>
            </View>
          </View>
        )}
        <View style={s.verificationFooter}>
          {verified ? (
            <Button
              theme="driver"
              label="Open Driver Dashboard"
              onPress={onDashboard}
            />
          ) : (
            <Button
              theme="driver"
              variant="outline"
              label={
                rejectionReason
                  ? "Replace document"
                  : "Review submitted details"
              }
              onPress={onBack}
            />
          )}
        </View>
      </ScrollView>
    </Frame>
  );
}
