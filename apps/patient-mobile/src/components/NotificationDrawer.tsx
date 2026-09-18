import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Header } from "@startup/mobile-ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "appointment" | "prescription" | "medicine" | "queue" | "general";
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "Appointment Confirmed",
    message: "Your clinic visit with Dr. Ananya Sharma is confirmed for Nov 5 at 02:30 PM.",
    time: "10m ago",
    type: "appointment",
    read: false,
  },
  {
    id: "2",
    title: "Prescription Available",
    message: "Dr. Sriram Reddy has uploaded your consultation prescription & medication notes.",
    time: "2h ago",
    type: "prescription",
    read: false,
  },
  {
    id: "3",
    title: "Medicine Reminder",
    message: "Time to take Paracetamol 650mg after lunch.",
    time: "5h ago",
    type: "medicine",
    read: true,
  },
  {
    id: "4",
    title: "Queue Update",
    message: "Token #7 is next in line at Apollo Hospitals.",
    time: "Yesterday",
    type: "queue",
    read: true,
  },
  {
    id: "5",
    title: "Welcome to Clinzo",
    message: "Easily book appointments, track home visits, and access your medical records.",
    time: "3d ago",
    type: "general",
    read: true,
  },
];

export type NotificationDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

export function NotificationDrawer({ visible, onClose }: NotificationDrawerProps) {
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(visible);
  const [notifications, setNotifications] = useState(initialNotifications);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.parallel([
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
      ]).start();
    } else {
      Animated.parallel([
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
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      }
    );
    return () => backHandler.remove();
  }, [visible, onClose]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const renderIcon = (type: NotificationItem["type"]) => {
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
  };

  const getIconBg = (type: NotificationItem["type"]) => {
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
  };

  if (!showModal) return null;

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable
            accessibilityLabel="Close notifications"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <Header
            app="patient"
            title="Notification"
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
            {notifications.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.notificationCard,
                  !item.read ? styles.unreadCard : undefined,
                  pressed ? styles.cardPressed : undefined,
                ]}
                onPress={() => {
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
                  );
                }}
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
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5, 28, 31, 0.45)",
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
