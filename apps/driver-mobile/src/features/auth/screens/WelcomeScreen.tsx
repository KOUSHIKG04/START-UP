import type { WelcomeScreenProps } from "../types/welcome-screen";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView, Button } from "@startup/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, Check, Shield } from "lucide-react-native";
import { s } from "../components/Registration.styles";
import { teal } from "../utils/registrationConstants";
import { registrationBenefits } from "../utils/registrationConstants";

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <SafeAreaView style={s.headerSafeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView style={s.screen} contentContainerStyle={s.welcomeScroll}>
        <View style={s.hero}>
          <Image
            alt=""
            source={require("../../../../assets/figma/hero.png")}
            style={s.heroImage}
            resizeMode="cover"
          />
          <View style={s.heroShade} />
          <Text style={s.heroTitle}>Drive to{"\n"}save lives.</Text>
          <Text style={s.heroSubtitle}>
            Trusted emergency response{"\n"}network.
          </Text>
        </View>
        <View style={s.welcomeBody}>
          <View style={s.benefitHeading}>
            <View style={s.checkCircle}>
              <Shield size={20} color="white" />
            </View>
            <Text style={s.title}>Why partner with us</Text>
          </View>
          {registrationBenefits.map(({ icon: Icon, title, body }) => (
            <View key={title} style={s.benefit}>
              <View style={s.checkCircle}>
                <Check size={18} color="white" />
              </View>
              <View style={s.flex}>
                <Text style={s.rowTitle}>{title}</Text>
                <Text style={s.muted}>{body}</Text>
              </View>
              <View style={s.iconCircle}>
                <Icon size={19} color={teal} />
              </View>
            </View>
          ))}
        </View>
        <SafeAreaView edges={["bottom"]} style={s.welcomeAction}>
          <Button
            theme="driver"
            label="Set up driver profile"
            onPress={onNext}
            style={s.welcomeButton}
            leftIcon={<ArrowRight size={19} color="white" />}
          />
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}
