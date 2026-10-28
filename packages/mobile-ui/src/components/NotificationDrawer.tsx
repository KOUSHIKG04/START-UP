import { AppText as Text } from "../primitives/AppText";
import { Loader } from "../primitives/Loader";
import { ModalSurface } from "../primitives/ModalSurface";
import { Dropdown } from "../primitives/Dropdown";
import { Header } from "./Header";
import { NotificationCard } from "./NotificationCard";
import type { NotificationDrawerProps } from "../types/notification";
import {
  createNotificationStyles,
  notificationPalette,
} from "./NotificationDrawer.styles";
import { useMobileThemeName } from "../theme/MobileThemeProvider";
import { PullToRefresh } from "../primitives/PullToRefresh";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Filter } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type {
  NotificationItem,
  NotificationDrawerProps,
} from "../types/notification";

/** Presentation only: apps own queries, mutations, notification copy and navigation. */
export function NotificationDrawer({
  visible,
  onClose,
  theme,
  notifications,
  loading = false,
  loadFailed = false,
  deletingId,
  onMarkAllRead,
  onNotificationPress,
  onDelete,
  onVisibilityChange,
  onRefresh,
}: NotificationDrawerProps) {
  const app = useMobileThemeName(theme);
  const styles = useMemo(() => createNotificationStyles(app), [app]);
  const palette = notificationPalette(app);
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(visible);
  const [filter, setFilter] = useState("all");
  const filteredNotifications = notifications.filter(
    (item) =>
      filter === "all" ||
      (filter === "unread" && !item.read) ||
      (filter === "read" && item.read) ||
      (filter === "important" && item.important) ||
      (filter === "emergency" && item.emergency)
  );
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
    if (visible && !showModal) {
      setShowModal(true);
      return;
    }
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

  useEffect(() => {
    onVisibilityChange?.(showModal);
  }, [showModal, onVisibilityChange]);

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
          <Header title="Notification" app={app} onBackPress={onClose} />

          <View style={styles.drawerSubheader}>
            <Text
              variant="label"
              style={styles.unreadCountText}
              numberOfLines={1}
            >
              {notifications.filter((n) => !n.read).length > 0
                ? `${notifications.filter((n) => !n.read).length} new notification${
                    notifications.filter((n) => !n.read).length > 1 ? "s" : ""
                  }`
                : "All caught up"}
            </Text>
            <Dropdown
              theme={app}
              accessibilityLabel="Filter notifications"
              value={filter}
              onValueChange={setFilter}
              options={[
                { label: "All", value: "all" },
                { label: "Unread", value: "unread" },
                { label: "Read", value: "read" },
                { label: "Important", value: "important" },
                { label: "Emergency", value: "emergency" },
              ]}
              leftIcon={<Filter size={17} color={palette.primary} />}
              containerStyle={styles.filterContainer}
              triggerStyle={styles.filterTrigger}
              valueStyle={styles.filterText}
              chevronSize={16}
              menuWidth={180}
            />
          </View>
          <View style={styles.hintRow}>
            {notifications.some((n) => !n.read) ? (
              <Pressable
                accessibilityLabel="Mark all as read"
                accessibilityRole="button"
                onPress={onMarkAllRead}
                hitSlop={8}
              >
                <Text variant="body" style={styles.markReadText}>
                  Mark all read
                </Text>
              </Pressable>
            ) : null}
            <Text variant="caption" style={styles.swipeHint}>
              Swipe left, then tap trash to delete.
            </Text>
          </View>

          <ScrollView
            alwaysBounceVertical={onRefresh ? true : undefined}
            refreshControl={
              onRefresh ? (
                <PullToRefresh theme={app} onRefresh={onRefresh} />
              ) : undefined
            }
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              !loading &&
                !loadFailed &&
                filteredNotifications.length === 0 &&
                styles.emptyList,
              { paddingBottom: Math.max(insets.bottom, 20) + 20 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {loading ? <Loader theme={app} /> : null}
            {!loading && !loadFailed && filteredNotifications.length === 0 ? (
              <Text
                variant="body"
                style={[styles.itemMessage, styles.emptyMessage]}
              >
                {filter === "all"
                  ? "No notifications yet."
                  : "No notifications match this filter."}
              </Text>
            ) : null}
            {filteredNotifications.map((item) => (
              <NotificationCard
                key={item.id}
                theme={app}
                item={item}
                onPress={onNotificationPress}
                onDelete={onDelete}
                deleting={deletingId === item.id}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </ModalSurface>
  );
}
