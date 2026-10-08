import { ModalSurface } from "@startup/mobile-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyNotifications, markMyNotificationsRead } from "@startup/data-access";
import { formatDisplayDate } from "@startup/contracts";
import {
  Bell,
  CalendarCheck,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Header } from "@startup/mobile-ui";
import { supabase } from "../services/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "appointment" | "prescription" | "medicine" | "queue" | "general";
  read: boolean;
};

export type NotificationDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

function renderIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "appointment":
      return <CalendarCheck color={colors.patient.primary} size={18} strokeWidth={2} />;
    case "prescription":
      return <FileText color="#0284C7" size={18} strokeWidth={2} />;
    case "medicine":
      return <Pill color="#D97706" size={18} strokeWidth={2} />;
    case "queue":
      return <Stethoscope color={colors.patient.primaryDark} size={18} strokeWidth={2} />;
    default:
      return <Bell color={colors.patient.accent} size={18} strokeWidth={2} />;
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

function notificationTime(createdAt: string) {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return formatDisplayDate(createdAt);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : formatDisplayDate(createdAt);
}

function NotificationCard({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(item.id);
  }, [item.id, onPress]);

  return (
    <Pressable
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
        {renderIcon(item.type)}
      </View>

      <View style={styles.textContainer}>
        <View style={styles.cardHeaderRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.itemTitle,
              !item.read ? styles.unreadItemTitle : undefined,
            ]}
          >
            {item.title}
          </Text>
          <Text style={styles.itemTime}>{item.time}</Text>
        </View>
        <Text style={styles.itemMessage}>{item.message}</Text>
      </View>
    </Pressable>
  );
}

export function NotificationDrawer({ visible, onClose }: NotificationDrawerProps) {
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(visible);
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listMyNotifications(supabase!),
    enabled: Boolean(supabase && showModal),
  });
  const markRead = useMutation({
    mutationFn: (ids?: string[]) => markMyNotificationsRead(supabase!, ids),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
  const notifications: NotificationItem[] = (notificationsQuery.data ?? []).map((item) => {
    const status = item.safe_parameters.status;
    const isAppointment = item.template_key.startsWith("appointment.");
    const isAmbulance = item.template_key.startsWith("ambulance.");
    return {
      id: item.id,
      title: item.template_key === "appointment.requested" ? "Appointment requested"
        : item.template_key === "appointment.auto_confirmed" || item.template_key === "appointment.approve" ? "Appointment confirmed"
        : isAppointment ? "Appointment update" : isAmbulance ? "Ambulance trip update" : item.template_key.startsWith("verification.") ? "Verification update" : "Notification",
      message: typeof status === "string" ? `Status: ${status.replaceAll("_", " ")}` : "You have a new update.",
      time: notificationTime(item.created_at),
      type: isAppointment ? "appointment" as const : "general" as const,
      read: item.is_read,
    };
  });
  const slideAnimRef = useRef<Animated.Value | null>(null);
  if (slideAnimRef.current === null) {
    slideAnimRef.current = new Animated.Value(SCREEN_WIDTH);
  }
  const slideAnim = slideAnimRef.current;

  const fadeAnimRef = useRef<Animated.Value | null>(null);
  if (fadeAnimRef.current === null) {
    fadeAnimRef.current = new Animated.Value(0);
  }
  const fadeAnim = fadeAnimRef.current;

  useEffect(() => {
    // No native animation views exist while the drawer is initially closed.
    if (!visible && !showModal) return;
    let active = true;
    let animation: Animated.CompositeAnimation;
    if (visible) {
      setShowModal(true);
      slideAnim.setValue(SCREEN_WIDTH);
      animation = Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]);
    } else {
      animation = Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]);
    }
    animation.start(({ finished }) => {
      if (active && finished && !visible) setShowModal(false);
    });
    return () => { active = false; animation.stop(); };
  }, [visible, showModal, slideAnim, fadeAnim]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onCloseRef.current();
        return true;
      }
    );
    return () => backHandler.remove();
  }, [visible]);

  const markAllAsRead = useCallback(() => {
    markRead.mutate();
  }, [markRead]);

  const handleCardPress = useCallback(
    (id: string) => {
      const item = notifications.find((n) => n.id === id);
      if (item && !item.read) {
        markRead.mutate([id]);
      }
    },
    [notifications, markRead]
  );

  if (!showModal) return null;

  return (
    <ModalSurface layout="custom"
      transparent
      visible={showModal}
      animationType="none"
      onClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable
            accessibilityLabel="Close notification drawer"
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <Header
            title="Notification"
            app="patient"
            onBackPress={onClose}
          />

          <View style={styles.drawerSubheader}>
            <Text style={styles.unreadCountText}>
              {notifications.filter((n) => !n.read).length > 0
                ? `${notifications.filter((n) => !n.read).length} new notification${
                    notifications.filter((n) => !n.read).length > 1 ? "s" : ""
                  }`
                : "All caught up"}
            </Text>
            {notifications.some((n) => !n.read) ? (
              <Pressable
                accessibilityLabel="Mark all as read"
                accessibilityRole="button"
                onPress={markAllAsRead}
                hitSlop={8}
              >
                <Text style={styles.markReadText}>Mark all read</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 20 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {notificationsQuery.isError ? <Text accessibilityRole="alert" style={styles.itemMessage}>Could not load notifications.</Text> : null}
            {!notificationsQuery.isError && notifications.length === 0 ? <Text style={styles.itemMessage}>No notifications yet.</Text> : null}
            {notifications.map((item) => <NotificationCard key={item.id} item={item} onPress={handleCardPress} />)}
          </ScrollView>
        </Animated.View>
      </View>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ui.overlay,
  },
  drawer: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.patient.background,
  },
  drawerSubheader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
    backgroundColor: "#F8FCFB",
  },
  unreadCountText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  markReadText: {
    color: colors.patient.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
  },
  listContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    position: "relative",
  },
  unreadCard: {
    backgroundColor: "#F5FBFA",
    borderColor: "#C8E8E7",
  },
  cardPressed: {
    opacity: 0.76,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  itemTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  unreadItemTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontWeight: "700",
  },
  itemTime: {
    color: colors.patient.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  itemMessage: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.patient.primary,
    position: "absolute",
    top: 10,
    right: 10,
  },
});
