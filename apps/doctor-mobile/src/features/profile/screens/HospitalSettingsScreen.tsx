import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dropdown,
  Input,
  Skeleton,
  useToast,
  useToastFeedback,
} from "@startup/mobile-ui";
import {
  getMyDoctorProfile,
  getMyVerificationCase,
  listRegisteredCareFacilities,
  listMyDoctorFacilityRequests,
  requestMyDoctorFacility,
  respondToMyFacilityInvitation,
} from "@startup/data-access";
import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
import {
  selectedPracticeQueryKey,
  setSelectedPracticeId,
} from "../../practices/selectedPractice";
import { useClinicLocationDraft } from "../../locations/clinicLocationDraft";
export function HospitalSettingsScreen() {
  const { showToast } = useToast();
  const client = useQueryClient();
  const { profile: sessionProfile } = useMobileSession();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  
  const registeredFacilities = useQuery({
    queryKey: ["registered-care-facilities"],
    queryFn: () => listRegisteredCareFacilities(supabase!),
    enabled: Boolean(supabase),
  });

  const associationRequests = useQuery({
    queryKey: ["my-doctor-facility-requests"],
    queryFn: () => listMyDoctorFacilityRequests(supabase!),
    enabled: Boolean(supabase),
  });

  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const requestFacility = useMutation({
    mutationFn: () => requestMyDoctorFacility(supabase!, selectedFacilityId),
    onSuccess: async () => {
      showToast({ title: "Request sent to the facility", type: "success" });
      await client.invalidateQueries({
        queryKey: ["my-doctor-facility-requests"],
      });
    },
    onError: (error) =>
      showToast({
        title: "Action failed",
        message: error.message,
        type: "error",
      }),
  });

  const respondInvitation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      respondToMyFacilityInvitation(supabase!, id, accept),
    onSuccess: async () => {
      showToast({ title: "Invitation response saved", type: "success" });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-doctor-facility-requests"] }),
        client.invalidateQueries({ queryKey: ["my-doctor-profile"] }),
        client.invalidateQueries({ queryKey: ["my-practices"] }),
      ]);
    },
    onError: (error) =>
      showToast({
        title: "Action failed",
        message: error.message,
        type: "error",
      }),
  });

  useToastFeedback({
    error:
      profile.isError ||
      registeredFacilities.isError ||
      associationRequests.isError
        ? "Could not load hospital settings. Please try again."
        : "",
  });
  const verification = useQuery({
    queryKey: ["doctor-verification", sessionProfile?.doctor?.id],
    queryFn: () =>
      getMyVerificationCase(supabase!, "doctor", sessionProfile!.doctor!.id),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const [openingPractice, setOpeningPractice] = useState<string | null>(null);
  async function manageSchedule(practiceId: string) {
    if (!sessionProfile?.doctor?.id || openingPractice) return;
    setOpeningPractice(practiceId);
    try {
      await setSelectedPracticeId(sessionProfile.doctor.id, practiceId);
      client.setQueryData(
        selectedPracticeQueryKey(sessionProfile.doctor.id),
        practiceId
      );
      router.push("/schedule");
    } catch (error) {
      showToast({
        title: "Could not open practice schedule",
        message: error instanceof Error ? error.message : "Try again.",
        type: "error",
      });
    } finally {
      setOpeningPractice(null);
    }
  }
  const active = profile.data?.facilities.filter((item) => item.active) ?? [];
  const available =
    registeredFacilities.data?.filter(
      (item) =>
        !active.some((practice) => practice.facility_id === item.id) &&
        !associationRequests.data?.some(
          (request) =>
            request.facility_id === item.id && request.status === "pending"
        )
    ) ?? [];
  const clinicLicence = verification.data?.documents.find(
    (item) => item.kind === "clinic_operating_licence"
  );
  return (
    <DoctorScreen title="Hospital Settings" bottomNav={false}>
      {profile.isLoading || associationRequests.isLoading ? (
        <Skeleton height={120} />
      ) : active.length ? (
        active.map((item) => (
          <Panel key={item.practice_id}>
            <Input
              label={
                item.can_edit_clinic ? "Clinic Name" : "Hospital/Clinic Name"
              }
              value={item.facility_name}
              disabled
              style={styles.input}
              labelStyle={styles.label}
            />
            <Input
              label="Clinic Address"
              value={item.address}
              disabled
              style={styles.input}
              labelStyle={styles.label}
            />
            {item.can_edit_clinic ? (
              <>
                <View style={ui.row}>
                  <View style={ui.flex}>
                    <Input
                      label="Area / locality"
                      value={item.locality ?? ""}
                      disabled
                      style={styles.input}
                      labelStyle={styles.label}
                    />
                  </View>
                  <View style={ui.flex}>
                    <Input
                      label="City"
                      value={item.city ?? ""}
                      disabled
                      style={styles.input}
                      labelStyle={styles.label}
                    />
                  </View>
                </View>
                <View style={ui.row}>
                  <View style={ui.flex}>
                    <Input
                      label="State"
                      value={item.state ?? ""}
                      disabled
                      style={styles.input}
                      labelStyle={styles.label}
                    />
                  </View>
                  <View style={ui.flex}>
                    <Input
                      label="Pincode"
                      value={item.pincode ?? ""}
                      disabled
                      style={styles.input}
                      labelStyle={styles.label}
                    />
                  </View>
                </View>
                <Input
                  label="Clinic operating licence"
                  value={
                    clinicLicence
                      ? `Version ${clinicLicence.version} - ${clinicLicence.status}`
                      : "No submitted licence"
                  }
                  disabled
                  style={styles.input}
                  labelStyle={styles.label}
                />
                <Button
                  theme="doctor"
                  label="Edit clinic details"
                  variant="outline"
                  onPress={() => {
                    useClinicLocationDraft.getState().clear();
                    router.push({
                      pathname: "/edit-clinic",
                      params: { facilityId: item.facility_id },
                    });
                  }}
                />
              </>
            ) : (
              <Label muted>
                Registered facility details are managed by its administration.
              </Label>
            )}
            <Button
              theme="doctor"
              label="Manage schedule"
              loading={openingPractice === item.practice_id}
              disabled={
                Boolean(openingPractice) ||
                profile.data?.credential_status !== "verified"
              }
              onPress={() => void manageSchedule(item.practice_id)}
            />
          </Panel>
        ))
      ) : (
        <Panel>
          <Label muted>No approved practice linked yet.</Label>
        </Panel>
      )}
      <Panel>
        <Text style={[ui.heading, { color: palette.text }]}>
          Associate with another hospital or clinic
        </Text>
        {/* <Text style={styles.label}>Hospital/Clinic Name</Text> */}
        <Dropdown
          accessibilityLabel="Select registered hospital or clinic"
          placeholder="Select registered hospital or clinic"
          value={selectedFacilityId}
          onValueChange={setSelectedFacilityId}
          options={available.map((item) => ({
            label: `${item.name} - ${item.address}`,
            value: item.id,
          }))}
          triggerLabel={
            available.find((item) => item.id === selectedFacilityId)?.name
          }
          triggerStyle={styles.input}
          backdropColor="#00000066"
          selectedOptionBackgroundColor="#F3F4F6"
        />
        {/* <Label muted>
          {profile.data?.credential_status === "verified"
            ? "Your approved  do not need to be uploaded again. Once the hospital accepts your request, you and its authorized staff can manage this practice's appointments and schedule."
            : "The hospital must accept your request. Your existing doctor verification must also be completed before the practice becomes available."}
        </Label> */}
        <Button
          theme="doctor"
          label="Request association"
          loading={requestFacility.isPending}
          disabled={
            !available.some((item) => item.id === selectedFacilityId) ||
            requestFacility.isPending
          }
          onPress={() => requestFacility.mutate()}
        />
        {!registeredFacilities.isLoading && !available.length ? (
          <Label muted>
            No additional registered facilities are available.
          </Label>
        ) : null}
      </Panel>
      {associationRequests.data?.map((item) => (
        <Panel key={item.id}>
          <Label>{item.facility_name}</Label>
          <Label muted>
            {item.initiated_by === "facility" && item.status === "pending"
              ? "Invitation awaiting your response"
              : item.status}
            {item.rejection_reason ? ` - ${item.rejection_reason}` : ""}
          </Label>
          {item.initiated_by === "facility" && item.status === "pending" ? (
            <View style={ui.row}>
              <Button
                theme="doctor"
                style={ui.flex}
                label="Accept"
                disabled={respondInvitation.isPending}
                loading={
                  respondInvitation.isPending &&
                  respondInvitation.variables?.id === item.id &&
                  respondInvitation.variables.accept
                }
                onPress={() =>
                  respondInvitation.mutate({ id: item.id, accept: true })
                }
              />
              <Button
                theme="doctor"
                style={ui.flex}
                variant="outline"
                label="Decline"
                disabled={respondInvitation.isPending}
                loading={
                  respondInvitation.isPending &&
                  respondInvitation.variables?.id === item.id &&
                  !respondInvitation.variables.accept
                }
                onPress={() =>
                  respondInvitation.mutate({ id: item.id, accept: false })
                }
              />
            </View>
          ) : null}
        </Panel>
      ))}
    </DoctorScreen>
  );
}
const styles = StyleSheet.create({
  input: { height: 54, minHeight: 54, borderRadius: 12 },
  label: { color: palette.text, fontSize: 13 },
});
