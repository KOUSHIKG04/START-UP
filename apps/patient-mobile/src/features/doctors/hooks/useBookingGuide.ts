import { steps } from "../utils/bookingGuideConstants";
import { useEffect, useRef, useState } from "react";
import { BackHandler, FlatList, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { parseConsultationType } from "../../appointments/utils/consultation";
export function useBookingGuide() {
  const { consultationType } = useLocalSearchParams<{
    consultationType?: string | string[];
  }>();
  const { width, height } = useWindowDimensions();
  const pageWidth = Math.min(width, 600);
  const heroHeight = Math.min(400, Math.max(200, height * 0.42));
  const [step, setStep] = useState(0);
  const pages = useRef<FlatList<(typeof steps)[number]>>(null);
  const scrollToStep = (next: number) => {
    const index = Math.max(0, Math.min(steps.length - 1, next));
    setStep(index);
    pages.current?.scrollToOffset({
      offset: index * pageWidth,
      animated: true,
    });
  };
  const close = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: "/find-doctor",
        params: { consultationType: parseConsultationType(consultationType) },
      });
  };
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      pages.current?.scrollToOffset({
        offset: step * pageWidth,
        animated: false,
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [pageWidth]);
  useEffect(() => {
    if (!step) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        scrollToStep(step - 1);
        return true;
      }
    );
    return () => subscription.remove();
  }, [step, pageWidth]);

  return {
    width,
    height,
    pageWidth,
    heroHeight,
    step,
    setStep,
    pages,
    scrollToStep,
    close,
  };
}
