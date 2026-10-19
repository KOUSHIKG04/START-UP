import { AppText as Text } from "../primitives/AppText";
import { Loader } from "../primitives/Loader";
import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, View } from "react-native";
import {
  Bell,
  Trash2,
  CalendarCheck,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import type {
  NotificationItem,
  NotificationCardProps,
} from "../types/notification";
import {
  createNotificationStyles,
  notificationPalette,
} from "./NotificationDrawer.styles";

function renderIcon(
  type: NotificationItem["type"],
  palette: ReturnType<typeof notificationPalette>
) {
  switch (type) {
    case "appointment":
      return (
        <CalendarCheck color={palette.primary} size={22} strokeWidth={2} />
      );
    case "prescription":
      return <FileText color="#0284C7" size={22} strokeWidth={2} />;
    case "medicine":
      return <Pill color="#D97706" size={22} strokeWidth={2} />;
    case "queue":
      return <Stethoscope color={palette.dark} size={22} strokeWidth={2} />;
    default:
      return <Bell color={palette.accent} size={22} strokeWidth={2} />;
  }
}

function getIconBg(type: NotificationItem["type"]) {
  switch (type) {
    case "appointment":
      return "#E6F7F5";
    case "prescription":
      return "#E0F2FE";
    case "medicine":
      return "#FEF3C7";
    case "queue":
      return "#E6F5F4";
    default:
      return "#E8F8F4";
  }
}

export function NotificationCard({
  item,
  theme,
  onPress,
  onDelete,
  deleting,
}: NotificationCardProps) {
  const styles = useMemo(() => createNotificationStyles(theme), [theme]);
  const palette = notificationPalette(theme);
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const settle = useCallback(
    (expanded: boolean) => {
      openRef.current = expanded;
      setOpen(expanded);
      Animated.spring(translateX, {
        toValue: expanded ? -76 : 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    },
    [translateX]
  );
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !deleting &&
          Math.abs(g.dx) > 10 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => translateX.stopAnimation(),
        onPanResponderMove: (_, g) =>
          translateX.setValue(
            Math.max(-76, Math.min(0, (openRef.current ? -76 : 0) + g.dx))
          ),
        onPanResponderRelease: (_, g) =>
          settle((openRef.current ? -76 : 0) + g.dx < -32),
        onPanResponderTerminate: () => settle(openRef.current),
      }),
    [deleting, settle, translateX]
  );
  const handlePress = useCallback(() => {
    if (openRef.current) {
      settle(false);
      return;
    }
    onPress(item.id);
  }, [item.id, onPress, settle]);

  return (
    <View style={styles.swipeRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete notification: ${item.title}`}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "yes" : "no-hide-descendants"}
        disabled={deleting}
        onPress={() => onDelete(item.id)}
        style={styles.deleteAction}
      >
        {deleting ? (
          <Loader theme={theme} />
        ) : (
          <Trash2 size={22} color={colors.white} />
        )}
      </Pressable>
      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.message}. ${item.read ? "Read" : "Unread"}`}
          accessibilityActions={[
            { name: "delete", label: "Delete notification" },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "delete" && !deleting)
              onDelete(item.id);
          }}
          style={({ pressed }) => [
            styles.notificationCard,
            !item.read ? styles.unreadCard : undefined,
            pressed ? styles.cardPressed : undefined,
          ]}
          onPress={handlePress}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: getIconBg(item.type) },
            ]}
          >
            {renderIcon(item.type, palette)}
          </View>

          <View style={styles.textContainer}>
            <View style={styles.cardHeaderRow}>
              <Text
                variant="cardHeading"
                numberOfLines={1}
                style={[
                  styles.itemTitle,
                  !item.read ? styles.unreadItemTitle : undefined,
                ]}
              >
                {item.title}
              </Text>
              <Text variant="caption" style={styles.itemTime}>
                {item.time}
              </Text>
            </View>
            <Text variant="body" style={styles.itemMessage}>
              {item.message}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
