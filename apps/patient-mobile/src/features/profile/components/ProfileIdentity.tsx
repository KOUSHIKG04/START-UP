import { Image, StyleSheet, Text, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import type { ReactNode } from "react";

export function ProfileIdentity({ initials, name, gender, photoUrl, children, inverse = false }: {
  initials: string;
  name: string;
  gender?: string | null;
  photoUrl?: string;
  children?: ReactNode;
  inverse?: boolean;
}) {
  return (
    <View style={styles.identity}>
      <View style={styles.avatarShadow}><View style={styles.avatar}>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : <Text style={styles.initials}>{initials}</Text>}
      </View></View>
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, inverse && { color: colors.white }]}>{name}</Text>
          {gender ? <View style={styles.genderBadge}><Text style={styles.gender}>{gender}</Text></View> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatarShadow: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.white, elevation: 3, shadowColor: colors.patient.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 4 },
  avatar: { width: 88, height: 88, alignItems: "center", justifyContent: "center", borderRadius: 44, borderWidth: 0.25, borderColor: colors.border, backgroundColor: colors.patient.surface, overflow: "hidden" },
  initials: { color: colors.patient.primaryDark, fontFamily: fontFamilies.bold, fontSize: 24 },
  photo: { width: "100%", height: "100%" },
  copy: { flex: 1, gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 1.5 },
  genderBadge: { flexShrink: 0, backgroundColor: colors.patient.surface, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  gender: { color: colors.patient.primaryDark, fontFamily: fontFamilies.medium, fontSize: 12, lineHeight: 18, textTransform: "capitalize", includeFontPadding: false },
  name: { flexShrink: 1, color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 18, lineHeight: 24, includeFontPadding: false },
});
