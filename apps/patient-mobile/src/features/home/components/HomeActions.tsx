import { StyleSheet, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { IconLabel } from "@startup/mobile-ui";
import { homeActions } from "../data/homeActions";
import type { ConsultationType } from "@/types/appointment";

export function HomeActions({
  onSelectConsultation,
}: {
  onSelectConsultation: (type: ConsultationType) => void;
}) {
  return (
    <View style={styles.actionsRow}>
      {homeActions.map((action) => (
        <IconLabel
          key={action.key}
          icon={action.icon}
          label={action.label}
          onPress={
            action.consultationType
              ? () => onSelectConsultation(action.consultationType!)
              : undefined
          }
          surfaceSize={52}
          surfaceRadius={16}
          iconSize={24}
          labelWidth={76}
          gap={8}
          labelNumberOfLines={2}
          labelStyle={styles.actionLabel}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    gap: 8,
    marginTop: 2,
  },
  actionLabel: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
});
