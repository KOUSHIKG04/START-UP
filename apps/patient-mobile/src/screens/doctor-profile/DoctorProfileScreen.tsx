import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@startup/design-tokens";
import { FadedScrollView, Header } from "@startup/mobile-ui";
import DoctorCard from "../../components/DoctorCard";
import type { ConsultationType } from "../../types/appointment";
import { consultationFlows } from "../../utils/consultationFlow";
import {
  DEFAULT_ADDRESS,
  type ProfileTab,
} from "../../utils/doctorProfileConstants";
import type {
  BookingSelection,
  DoctorProfileScreenProps,
} from "../../types/doctor-profile";
import {
  AboutDoctor,
  BookSlots,
  HomeVisitAddress,
  OnlineConsultation,
  ProfileTabs,
} from "../../components/doctor-profile";

export type { BookingSelection, DoctorProfileScreenProps };

export function DoctorProfileScreen({
  doctor,
  consultationType: initialConsultationType,
  onBackPress,
  onBookAppointment,
}: DoctorProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [consultationType, setConsultationType] = useState<ConsultationType>(
    initialConsultationType
  );
  const [addressDraft, setAddressDraft] = useState(DEFAULT_ADDRESS);
  const [homeAddress, setHomeAddress] = useState(addressDraft);
  const flow = consultationFlows[consultationType];

  const changeTab = (tab: ProfileTab) => {
    setActiveTab(tab);
  };

  const selectOnlineConsultation = () => {
    setConsultationType("Online");
    changeTab("slots");
  };

  return (
    <View style={styles.screen}>
      <Header
        title={
          consultationType === "Online"
            ? "Doctor Details (Online Consultation)"
            : consultationType === "Home Visit"
            ? "Doctor Details (Home Consultation)"
            : "Doctor Details"
        }
        app="patient"
        onBackPress={onBackPress}
        titleStyle={
          consultationType === "Online" || consultationType === "Home Visit"
            ? styles.onlineHeaderTitle
            : styles.headerTitle
        }
      />

      <FadedScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DoctorCard
          {...doctor}
          contextLabel={
            consultationType === "Online" ? undefined : flow.profileContext
          }
          showChevron={false}
        />

        {consultationType === "Clinic Visit" ? (
          <OnlineConsultation
            fee={doctor.fee ?? ""}
            onBookPress={selectOnlineConsultation}
          />
        ) : null}

        {flow.requiresAddress ? (
          <HomeVisitAddress
            address={addressDraft}
            onAddressChange={setAddressDraft}
            onConfirm={() => setHomeAddress(addressDraft.trim())}
            verifiedAddress={homeAddress}
          />
        ) : null}

        <View style={styles.tabSection}>
          <ProfileTabs activeTab={activeTab} onTabChange={changeTab} />

          <View style={styles.page}>
            {activeTab === "about" ? (
              <AboutDoctor
                doctorName={doctor.name}
                onGoToSlots={() => changeTab("slots")}
              />
            ) : (
              <BookSlots
                address={flow.requiresAddress ? homeAddress : undefined}
                consultationType={consultationType}
                onBookAppointment={onBookAppointment}
                onGoToAbout={() => changeTab("about")}
              />
            )}
          </View>
        </View>
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.patient.background,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  onlineHeaderTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
  },
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  tabSection: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: 14,
    overflow: "hidden",
  },
  page: {},
});
