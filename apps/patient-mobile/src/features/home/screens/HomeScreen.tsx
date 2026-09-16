import { HomeSearchHeader } from "@/features/home/components/HomeSearchHeader";
import { HomeActions } from "@/features/home/components/HomeActions";
import { useCollapsingHeader } from "@/features/home/hooks/useCollapsingHeader";
import { CONTENT_TOP } from "@/features/home/data/homeLayout";
import { StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { colors } from "@startup/design-tokens";
import { FadedScrollView } from "@startup/mobile-ui";
import AmbulanceBanner from "@/features/home/components/AmbulanceBanner";
import UpcomingAppointmentCard from "@/features/appointments/components/UpcomingAppointmentCard";
import PopularServices from "@/features/home/components/PopularServices";

function getFindDoctorRoute(consultationType: string) {
  return {
    pathname: "/doctor/search",
    params: { consultationType },
  } satisfies Href;
}

export function HomeScreen() {
  const header = useCollapsingHeader();

  return (
    <View style={styles.screen}>
      <HomeSearchHeader header={header} />

      <FadedScrollView
        contentContainerStyle={styles.content}
        containerStyle={styles.scrollContainer}
        edgeColor={colors.white}
        topEdgeOffset={header.collapsedHeight}
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <HomeActions
          onSelectConsultation={(type) => router.push(getFindDoctorRoute(type))}
        />

        <View style={styles.ambulanceBanner}>
          <AmbulanceBanner onBookPress={() => router.push("/ambulance")} />
        </View>
        <UpcomingAppointmentCard />
        <PopularServices />
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingTop: CONTENT_TOP,
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 14,
  },
  scrollContainer: {
    ...StyleSheet.absoluteFill,
  },
  ambulanceBanner: {
    marginTop: 10,
    alignItems: "center",
  },
});
