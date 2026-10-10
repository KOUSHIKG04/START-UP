import { Loader, useToastFeedback, ModalSurface, Dropdown } from "@startup/mobile-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dismissMyNotification,
  listMyNotifications,
  markMyNotificationsRead,
} from "@startup/data-access";
import { type InAppNotification, formatDisplayDate } from "@startup/contracts";
import {
  Bell,
  Filter,
  Trash2,
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
  important: boolean;
  emergency: boolean;
};

export type NotificationDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

function renderIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "appointment":
      return (
        <CalendarCheck
          color={colors.driver.primary}
          size={22}
          strokeWidth={2}
        />
      );
    case "prescription":
      return <FileText color="#0284C7" size={22} strokeWidth={2} />;
    case "medicine":
      return <Pill color="#D97706" size={22} strokeWidth={2} />;
    case "queue":
      return (
        <Stethoscope
          color={colors.driver.dark}
          size={22}
          strokeWidth={2}
        />
      );
    default:
      return <Bell color={colors.driver.primary} size={22} strokeWidth={2} />;
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
  if (!Number.isFinite(elapsed) || elapsed < 0)
    return formatDisplayDate(createdAt);
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
  onDelete,
  deleting,
}: {
  item: NotificationItem;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const settle = useCallback((expanded: boolean) => {
    openRef.current = expanded; setOpen(expanded);
    Animated.spring(translateX, { toValue: expanded ? -76 : 0, useNativeDriver: true, bounciness: 0 }).start();
  }, [translateX]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !deleting && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => translateX.stopAnimation(),
    onPanResponderMove: (_, g) => translateX.setValue(Math.max(-76, Math.min(0, (openRef.current ? -76 : 0) + g.dx))),
    onPanResponderRelease: (_, g) => settle((openRef.current ? -76 : 0) + g.dx < -32),
    onPanResponderTerminate: () => settle(openRef.current),
  }), [deleting, settle, translateX]);
  const handlePress = useCallback(() => {
    if (openRef.current) { settle(false); return; }
    onPress(item.id);
  }, [item.id, onPress, settle]);

  return (
    <View style={styles.swipeRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete notification: ${item.title}`} accessibilityElementsHidden={!open} importantForAccessibility={open ? "yes" : "no-hide-descendants"} disabled={deleting} onPress={() => onDelete(item.id)} style={styles.deleteAction}>
        {deleting ? <Loader theme="driver" /> : <Trash2 size={22} color={colors.white} />}
      </Pressable>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.message}. ${item.read ? "Read" : "Unread"}`}
      accessibilityActions={[{ name: "delete", label: "Delete notification" }]}
      onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === "delete" && !deleting) onDelete(item.id); }}
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
      </Animated.View>
    </View>
  );
}

export function NotificationDrawer({
  visible,
  onClose,
}: NotificationDrawerProps) {
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(visible);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const notificationsQuery = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listMyNotifications(supabase!),
    enabled: Boolean(supabase && showModal),
    refetchInterval: showModal ? 15000 : false,
  });
  const markRead = useMutation({
    mutationFn: (ids?: string[]) => markMyNotificationsRead(supabase!, ids),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
  const removeNotification = useMutation({
    mutationFn: (id: string) => dismissMyNotification(supabase!, id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<InAppNotification[]>(["my-notifications"], current => current?.filter(item => item.id !== id));
      void queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    },
  });
  useToastFeedback({ error: removeNotification.isError ? "Could not delete notification. Try again." : notificationsQuery.isError ? "Could not load notifications. Close and reopen to retry." : markRead.isError ? "Could not mark notifications read. Try again." : "" });
  const notifications: NotificationItem[] = (notificationsQuery.data ?? []).map(
    (item) => {
      const status = item.safe_parameters.status;
      const isAppointment = item.template_key.startsWith("appointment.");
      const isAmbulance = item.template_key.startsWith("ambulance.");
      return {
        id: item.id,
        title:
          item.template_key === "appointment.check_in"
            ? "Clinic check-in confirmed"
            : item.template_key === "appointment.requested"
            ? "Appointment requested"
            : item.template_key === "appointment.auto_confirmed" ||
                item.template_key === "appointment.approve"
              ? "Appointment confirmed"
              : isAppointment
                ? "Appointment update"
                : isAmbulance
                  ? "Ambulance trip update"
                  : item.template_key.startsWith("verification.")
                    ? "Verification update"
                    : "Notification",
        message:
          item.template_key === "appointment.check_in" && typeof item.safe_parameters.booking_code === "string"
            ? `Booking ${item.safe_parameters.booking_code} - Patient checked in`
            : typeof status === "string"
            ? `Status: ${status.replaceAll("_", " ")}`
            : "You have a new update.",
        time: notificationTime(item.created_at),
        type: isAppointment ? ("appointment" as const) : ("general" as const),
        read: item.is_read,
        important: item.is_important,
        emergency: item.is_emergency,
      };
    }
  );
  const filteredNotifications = notifications.filter(item => filter === "all" || (filter === "unread" && !item.read) || (filter === "read" && item.read) || (filter === "important" && item.important) || (filter === "emergency" && item.emergency));
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
    // Mount the native drawer before starting its entrance animation.
    if (visible && !showModal) { setShowModal(true); return; }
    let active = true;
    let animation: Animated.CompositeAnimation;
    if (visible) {
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
    return () => {
      active = false;
      animation.stop();
    };
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
    <ModalSurface
      layout="custom"
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
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          <Header title="Notification" app="driver" onBackPress={onClose} />

          <View style={styles.drawerSubheader}>
            <Text style={styles.unreadCountText} numberOfLines={1}>
              {notifications.filter((n) => !n.read).length > 0
                ? `${notifications.filter((n) => !n.read).length} new notification${
                    notifications.filter((n) => !n.read).length > 1 ? "s" : ""
                  }`
                : "All caught up"}
            </Text>
            <Dropdown theme="driver" accessibilityLabel="Filter notifications" value={filter} onValueChange={setFilter}
              options={[{ label: "All", value: "all" }, { label: "Unread", value: "unread" }, { label: "Read", value: "read" }, { label: "Important", value: "important" }, { label: "Emergency", value: "emergency" }]}
              leftIcon={<Filter size={17} color={colors.driver.primary} />} containerStyle={styles.filterContainer} triggerStyle={styles.filterTrigger} valueStyle={styles.filterText} chevronSize={16} menuWidth={180} />
          </View>
          <View style={styles.hintRow}>
            {notifications.some((n) => !n.read) ? (
              <Pressable accessibilityLabel="Mark all as read" accessibilityRole="button" onPress={markAllAsRead} hitSlop={8}>
                <Text style={styles.markReadText}>Mark all read</Text>
              </Pressable>
            ) : null}
            <Text style={styles.swipeHint}>Swipe left, then tap trash to delete.</Text>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              !notificationsQuery.isLoading && !notificationsQuery.isError && filteredNotifications.length === 0 && styles.emptyList,
              { paddingBottom: Math.max(insets.bottom, 20) + 20 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {notificationsQuery.isLoading ? <Loader theme="driver" /> : null}
            {!notificationsQuery.isLoading && !notificationsQuery.isError && filteredNotifications.length === 0 ? (
              <Text style={[styles.itemMessage, styles.emptyMessage]}>{filter === "all" ? "No notifications yet." : "No notifications match this filter."}</Text>
            ) : null}
            {filteredNotifications.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                onPress={handleCardPress}
                onDelete={(id) => removeNotification.mutate(id)}
                deleting={removeNotification.isPending && removeNotification.variables === item.id}
              />
            ))}
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
    backgroundColor: colors.white,
  },
  drawerSubheader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#F8FCFB",
  },
  hintRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  swipeHint: { flex: 1, textAlign: "right", fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  filterContainer: { width: 160, flexShrink: 0 },
  filterTrigger: { width: "100%", minHeight: 40, height: 40, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10 },
  filterText: { flex: 1, fontSize: 14, lineHeight: 20, includeFontPadding: false },
  swipeRow: { borderRadius: radius.md, overflow: "hidden" },
  deleteAction: { position: "absolute", right: 0, top: 0, bottom: 0, width: 76, alignItems: "center", justifyContent: "center", backgroundColor: colors.danger },
  unreadCountText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  markReadText: {
    color: colors.driver.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
  },
  list: { flex: 1 },
  emptyList: { justifyContent: "center", alignItems: "center" },
  emptyMessage: { textAlign: "center" },
  listContent: {
    flexGrow: 1,
    padding: 12,
    gap: 10,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    minHeight: 88,
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
    backgroundColor: "#F1F4F5",
  },
  iconContainer: {
    width: 42,
    height: 42,
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
    color: colors.driver.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    flex: 1,
  },
  unreadItemTitle: {
    color: colors.driver.dark,
    fontFamily: fontFamilies.bold,
    fontWeight: "700",
  },
  itemTime: {
    color: colors.disabledText,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  itemMessage: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.driver.primary,
    position: "absolute",
    top: 10,
    right: 10,
  },
});
