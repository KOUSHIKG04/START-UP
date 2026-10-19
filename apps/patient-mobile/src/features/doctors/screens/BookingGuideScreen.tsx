import { useBookingGuide } from "../hooks/useBookingGuide";
import { steps } from "../utils/bookingGuideConstants";
import { AppText as Text } from "@startup/mobile-ui";

import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Button, SafeAreaView } from "@startup/mobile-ui";

export function BookingGuideScreen() {
  const {
    width,
    height,
    pageWidth,
    heroHeight,
    step,
    setStep,
    pages,
    scrollToStep,
    close,
  } = useBookingGuide();
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={[styles.body, { width: pageWidth }]}>
        <View style={styles.toolbar}>
          <Button
            theme="patient"
            variant="ghost"
            accessibilityLabel={step ? "Previous step" : "Close booking guide"}
            onPress={() => (step ? scrollToStep(step - 1) : close())}
            style={styles.back}
          >
            <ChevronLeft size={24} color={colors.patient.primaryDark} />
          </Button>
          <Button
            theme="patient"
            variant="secondary"
            label="Skip"
            onPress={close}
            style={styles.skip}
          />
        </View>
        <FlatList
          ref={pages}
          data={steps}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          style={styles.pages}
          keyExtractor={(item) => item.title}
          getItemLayout={(_, index) => ({
            length: pageWidth,
            offset: pageWidth * index,
            index,
          })}
          onMomentumScrollEnd={(event) =>
            setStep(
              Math.max(
                0,
                Math.min(
                  steps.length - 1,
                  Math.round(event.nativeEvent.contentOffset.x / pageWidth)
                )
              )
            )
          }
          renderItem={({ item, index }) => (
            <ScrollView
              style={{ width: pageWidth }}
              contentContainerStyle={styles.page}
              showsVerticalScrollIndicator={false}
              accessibilityElementsHidden={step !== index}
              importantForAccessibility={
                step === index ? "auto" : "no-hide-descendants"
              }
            >
              <Image
                source={item.image}
                resizeMode="contain"
                style={[
                  styles.illustration,
                  {
                    width: Math.min(pageWidth - 48, 440) * item.imageScale,
                    height: heroHeight * item.imageScale,
                  },
                ]}
                accessible={false}
              />
              <View style={styles.dots}>
                {steps.map((dot, dotIndex) => (
                  <Pressable
                    key={dot.title}
                    accessibilityRole="button"
                    accessibilityLabel={`Step ${dotIndex + 1}: ${dot.title}`}
                    accessibilityState={{ selected: step === dotIndex }}
                    onPress={() => scrollToStep(dotIndex)}
                    style={styles.dotTarget}
                  >
                    <View
                      style={[
                        styles.dot,
                        step === dotIndex && styles.activeDot,
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
              <Text
                variant="screenTitle"
                accessibilityRole="header"
                style={styles.title}
              >
                {item.title}
              </Text>
              <Text variant="body" style={styles.description}>
                {item.description}
              </Text>
              <Text variant="label" style={styles.note}>
                {item.note}
              </Text>
            </ScrollView>
          )}
        />
        <View style={styles.footer}>
          <Button
            theme="patient"
            label={step === steps.length - 1 ? "Start booking" : "Next"}
            onPress={() =>
              step === steps.length - 1 ? close() : scrollToStep(step + 1)
            }
            style={styles.next}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, alignSelf: "center" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  back: { width: 44, height: 44, paddingHorizontal: 0 },
  skip: {
    minWidth: 72,
    minHeight: 44,
    backgroundColor: colors.patient.surface,
    borderRadius: 12,
  },
  pages: { flex: 1 },
  page: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  illustration: { marginBottom: 8 },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
    maxWidth: 400,
  },
  description: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 370,
  },
  note: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 24,
    maxWidth: 350,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 12 },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 8 },
  dotTarget: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.patient.surfaceBorder,
  },
  activeDot: { width: 20, backgroundColor: colors.patient.primaryDark },
  next: { minHeight: 52, borderRadius: 12 },
});
