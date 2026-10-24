import type { ProfileHeaderProps } from "../types/profile-form";
import { styles } from "./ProfileFormLayout.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { ProfilePhotoButton } from "@startup/mobile-ui";

export function ProfileHeader({
  family,
  photoUrl,
  onPickPhoto,
}: ProfileHeaderProps) {
  return (
    <View style={styles.head}>
      <ProfilePhotoButton
        theme="patient"
        source={photoUrl ? { uri: photoUrl } : undefined}
        onPress={onPickPhoto}
      />
      <View style={styles.headText}>
        <Text variant="cardHeading" style={styles.title}>
          {family ? "Family member Profile" : "Your Profile"}
        </Text>
        {
          <Text variant="label" style={styles.photoHint}>
            Tap the plus button on your profile icon to add a photo.
          </Text>
        }
      </View>
    </View>
  );
}
