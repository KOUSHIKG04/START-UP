import { useHospitalSettings } from "../hooks/useHospitalSettings";

import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Button, Dropdown, Input, Skeleton } from "@startup/mobile-ui";

import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

import { useClinicLocationDraft } from "../../locations/stores/clinicLocationDraft";
export function HospitalSettingsScreen() {
  const {
    profile,
    registeredFacilities,
    associationRequests,
    selectedFacilityId,
    setSelectedFacilityId,
    requestFacility,
    respondInvitation,
    openingPractice,
    manageSchedule,
    active,
    available,
    clinicLicence,
  } = useHospitalSettings();
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
