import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  CheckCheck,
  ChevronLeft,
  ClipboardList,
  Clock3,
  FileText,
  House,
  Info,
  MapPin,
  Mic,
  Monitor,
  Paperclip,
  Phone,
  PhoneOff,
  QrCode,
  Send,
  ShieldCheck,
  Smile,
  Stethoscope,
  UserRound,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import {
  Button,
  Card,
  FadedScrollView,
  Header,
  Input,
  SafeAreaView,
} from "@startup/mobile-ui";
import AppointmentDetailsCard from "@/features/appointments/components/AppointmentDetailsCard";
import FeedbackBottomSheet from "@/features/consultations/components/FeedbackBottomSheet";
import type { Appointment, VisitSessionMode } from "@/types/appointment";
import type { PatientScreenProps } from "@/types/screen";

type VisitSessionScreenProps = PatientScreenProps & {
  appointment: Appointment;
  mode: VisitSessionMode;
  onGoHome: () => void;
  onViewMedicines: () => void;
  onViewPrescription: () => void;
};

export function VisitSessionScreen({
  appointment,
  mode,
  onBackPress,
  onGoHome,
  onViewMedicines,
  onViewPrescription,
}: VisitSessionScreenProps) {
  const [completed, setCompleted] = useState(false);

  if (completed) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <CompletionView
          appointment={appointment}
          onGoHome={onGoHome}
          onViewMedicines={onViewMedicines}
          onViewPrescription={onViewPrescription}
        />
      </SafeAreaView>
    );
  }

  if (mode === "online-chat" || mode === "online-video") {
    return (
      <View style={styles.screen}>
        <OnlineVisitFlow
          appointment={appointment}
          initialChat={mode === "online-chat"}
          onBackPress={onBackPress}
          onComplete={() => setCompleted(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title={getTitle(mode)} app="patient" onBackPress={onBackPress} />
      {mode === "clinic-check-in" ? (
        <ClinicVisitFlow
          appointment={appointment}
          onComplete={() => setCompleted(true)}
        />
      ) : (
        <HomeVisitFlow
          appointment={appointment}
          onComplete={() => setCompleted(true)}
        />
      )}
    </View>
  );
}

function getTitle(mode: VisitSessionMode) {
  if (mode === "clinic-check-in") return "Hospital Visit";
  if (mode === "home-tracking") return "Home Visit";
  return mode === "online-chat" ? "Secure Care Chat" : "Video Consultation";
}

function ClinicVisitFlow({
  appointment,
  onComplete,
}: {
  appointment: Appointment;
  onComplete: () => void;
}) {
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <FadedScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScheduleSummary appointment={appointment} />
      {checkedIn ? (
        <QueueStatus onComplete={onComplete} />
      ) : (
        <>
          <Card
            borderRadius={radius.md}
            gap={12}
            padding={20}
            style={styles.centeredCard}
          >
            <View style={styles.qrSurface}>
              <QrCode
                color={colors.patient.text}
                size={112}
                strokeWidth={1.5}
              />
            </View>
            <Text style={styles.checkInCode}>BK12454OPY</Text>
            <Text style={styles.centeredDescription}>
              Show this check-in code at reception to mark your attendance.
            </Text>
          </Card>
          <Card borderRadius={radius.md} gap={12} padding={16}>
            <View style={styles.locationRow}>
              <MapPin color={colors.patient.primaryDark} size={21} />
              <View style={styles.flexCopy}>
                <Text style={styles.cardTitle}>{appointment.hospital}</Text>
                <Text style={styles.secondaryText}>{appointment.location}</Text>
              </View>
            </View>
            <Button
              label="I’ve checked in"
              onPress={() => setCheckedIn(true)}
            />
          </Card>
        </>
      )}
    </FadedScrollView>
  );
}

function QueueStatus({ onComplete }: { onComplete: () => void }) {
  return (
    <Card
      borderRadius={radius.lg}
      gap={20}
      padding={20}
      style={styles.centeredCard}
    >
      <View style={styles.queueHeading}>
        <Text style={styles.queueTitle}>You are in queue</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <View style={styles.queueNumberSurface}>
        <Text style={styles.secondaryText}>Your queue number</Text>
        <Text style={styles.queueNumber}>#7</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressValue} />
      </View>
      <View style={styles.waitCopy}>
        <Text style={styles.secondaryText}>Estimated wait time</Text>
        <Text style={styles.waitTime}>~37 min</Text>
      </View>
      <Text style={styles.secondaryText}>6 people are ahead of you</Text>
      <Button
        label="Preview completed visit"
        onPress={onComplete}
        style={styles.fullWidthButton}
      />
    </Card>
  );
}

function HomeVisitFlow({
  appointment,
  onComplete,
}: {
  appointment: Appointment;
  onComplete: () => void;
}) {
  return (
    <FadedScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScheduleSummary appointment={appointment} />
      <View style={styles.infoBanner}>
        <CarFront color={colors.patient.primaryDark} size={21} />
        <Text style={styles.infoText}>Doctor is on the way to your home</Text>
      </View>
      <Card
        borderRadius={radius.md}
        gap={16}
        padding={18}
        style={styles.centeredCard}
      >
        <Text style={styles.cardTitle}>OTP verification</Text>
        <View style={styles.otpRow}>
          {["4", "8", "2", "6"].map((digit, index) => (
            <View key={`${digit}-${index}`} style={styles.otpCell}>
              <Text style={styles.otpText}>{digit}</Text>
            </View>
          ))}
        </View>
        <View style={styles.otpNotice}>
          <Info color={colors.patient.primaryDark} size={20} />
          <Text style={styles.infoText}>
            Share this OTP when the doctor arrives.
          </Text>
        </View>
      </Card>
      <AppointmentDetailsCard appointment={appointment} />
      <Button label="Mark visit complete" onPress={onComplete} />
    </FadedScrollView>
  );
}

function OnlineVisitFlow({
  appointment,
  initialChat,
  onBackPress,
  onComplete,
}: {
  appointment: Appointment;
  initialChat: boolean;
  onBackPress: () => void;
  onComplete: () => void;
}) {
  const [showChat, setShowChat] = useState(initialChat);
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const sendMessage = () => {
    const nextMessage = message.trim();
    if (!nextMessage) return;
    setSentMessages((current) => [...current, nextMessage]);
    setMessage("");
  };

  if (!showChat) {
    return (
      <VideoCallView
        appointment={appointment}
        cameraOff={cameraOff}
        muted={muted}
        onBackPress={onBackPress}
        onCameraPress={() => setCameraOff((current) => !current)}
        onEnd={onComplete}
        onMutePress={() => setMuted((current) => !current)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.chatScreen}
    >
      <LinearGradient
        colors={["#0A4A47", "#087F78"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.chatHeader}
      >
        <SafeAreaView edges={["top"]} style={styles.chatHeaderSafeArea}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBackPress}
            style={styles.headerIconButton}
          >
            <ChevronLeft color={colors.white} size={28} />
          </Pressable>
          <Text numberOfLines={1} style={styles.chatHeaderTitle}>
            {appointment.doctorName}
          </Text>
          <Pressable
            accessibilityLabel="Start video consultation"
            accessibilityRole="button"
            onPress={() => setShowChat(false)}
            style={styles.callTrigger}
          >
            <Phone
              color={colors.patient.primaryDark}
              size={19}
              fill={colors.patient.primaryDark}
            />
          </Pressable>
        </SafeAreaView>
      </LinearGradient>

      <FadedScrollView
        contentContainerStyle={styles.chatThread}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.chatDay}>TODAY · SECURE CONSULTATION</Text>
        <ChatBubble
          received
          text="Hello, please tell me how you are feeling today."
          time="10:12 AM"
        />
        <ChatBubble
          text="I still have fever and body pain since yesterday."
          time="10:13 AM"
        />
        <ChatBubble
          received
          text="I understand. Have you taken the prescribed medicine and checked your temperature?"
          time="10:14 AM"
        />
        {sentMessages.map((sentMessage, index) => (
          <ChatBubble
            key={`${sentMessage}-${index}`}
            text={sentMessage}
            time="now"
          />
        ))}
      </FadedScrollView>

      <View style={styles.chatInputArea}>
        <View style={styles.quickReplies}>
          {["Feeling better", "Still unwell", "Start video call"].map(
            (reply) => (
              <Pressable
                key={reply}
                onPress={() =>
                  reply === "Start video call"
                    ? setShowChat(false)
                    : setMessage(reply)
                }
                style={styles.quickReply}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </Pressable>
            )
          )}
        </View>
        <View style={styles.composerRow}>
          <View style={styles.composerField}>
            <Paperclip color={colors.patient.textSecondary} size={18} />
            <Input
              accessibilityLabel="Chat message"
              containerStyle={styles.composerInputContainer}
              placeholder="Type a message..."
              value={message}
              onChangeText={setMessage}
              style={styles.composerInput}
            />
            <Mic color={colors.patient.textSecondary} size={19} />
            <Smile color={colors.patient.textSecondary} size={19} />
          </View>
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            disabled={!message.trim()}
            onPress={sendMessage}
            style={({ pressed }) => [
              styles.sendTrigger,
              !message.trim() ? styles.sendDisabled : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <Send color={colors.white} size={20} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({
  received = false,
  text,
  time,
}: {
  received?: boolean;
  text: string;
  time: string;
}) {
  return (
    <View
      style={[
        styles.chatBubbleRow,
        received ? styles.receivedRow : styles.sentRow,
      ]}
    >
      <View
        style={[
          styles.chatBubble,
          received ? styles.receivedBubble : styles.sentBubble,
        ]}
      >
        <Text style={styles.chatMessage}>{text}</Text>
        <View style={styles.chatMessageMeta}>
          <Text style={styles.chatTime}>{time}</Text>
          {!received ? (
            <CheckCheck color={colors.patient.accent} size={14} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function VideoCallView({
  appointment,
  cameraOff,
  muted,
  onBackPress,
  onCameraPress,
  onEnd,
  onMutePress,
}: {
  appointment: Appointment;
  cameraOff: boolean;
  muted: boolean;
  onBackPress: () => void;
  onCameraPress: () => void;
  onEnd: () => void;
  onMutePress: () => void;
}) {
  return (
    <View style={styles.videoCallScreen}>
      <SafeAreaView edges={["top"]} style={styles.videoSafeArea}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={onBackPress}
          style={styles.videoBackButton}
        >
          <ChevronLeft color={colors.patient.primaryDark} size={28} />
        </Pressable>
        <View style={styles.remoteVideoPlaceholder}>
          <UserRound
            color={colors.patient.primary}
            size={38}
            strokeWidth={1.6}
          />
          <Text style={styles.videoDoctorName}>{appointment.doctorName}</Text>
        </View>
        <View style={styles.localVideoPreview}>
          <UserRound color={colors.white} size={29} />
        </View>
        <View style={styles.videoControls}>
          <VideoControl
            accessibilityLabel={cameraOff ? "Turn camera on" : "Switch camera"}
            onPress={onCameraPress}
          >
            <Camera color={colors.white} size={25} />
          </VideoControl>
          <VideoControl
            accessibilityLabel={muted ? "Unmute" : "Mute"}
            onPress={onMutePress}
          >
            <Mic color={colors.white} size={27} />
          </VideoControl>
          <VideoControl
            accessibilityLabel="End consultation"
            danger
            onPress={onEnd}
          >
            <PhoneOff color={colors.white} size={25} fill={colors.white} />
          </VideoControl>
        </View>
      </SafeAreaView>
    </View>
  );
}

function VideoControl({
  accessibilityLabel,
  children,
  danger = false,
  onPress,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.videoControl,
        danger ? styles.videoEndControl : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      {children}
    </Pressable>
  );
}

type CompletionActions = {
  onGoHome: () => void;
  onViewMedicines: () => void;
  onViewPrescription: () => void;
};

const experienceRatings = [
  { emoji: "😞", label: "Very poor" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😊", label: "Great" },
  { emoji: "😍", label: "Excellent" },
] as const;

function CompletionView({
  appointment,
  onGoHome,
  onViewMedicines,
  onViewPrescription,
}: { appointment: Appointment } & CompletionActions) {
  const [rating, setRating] = useState<number>();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const isClinic = appointment.consultationType === "Clinic Visit";
  const isHome = appointment.consultationType === "Home Visit";
  const completionCopy = isClinic
    ? "Your Clinic Visit is Completed"
    : isHome
      ? "Your Home Visit is Completed"
      : "Your online consultation is Completed";
  const HeroIcon = isClinic ? Stethoscope : isHome ? House : Monitor;

  return (
    <FadedScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.completionHero}>
        <View style={styles.completionHaloOuter}>
          <View style={styles.completionHaloInner}>
            <View style={styles.completionIcon}>
              <HeroIcon color={colors.white} size={50} strokeWidth={1.8} />
            </View>
            <View style={styles.completionCheckBadge}>
              <CheckCircle2 color={colors.white} size={32} strokeWidth={2.5} />
            </View>
          </View>
        </View>
        <Text style={styles.thankYouTitle}>Thank you!</Text>
        <Text style={styles.completedTitle}>{completionCopy}</Text>
        <Text style={styles.centeredDescription}>
          {appointment.doctorName} has completed your consultation.
        </Text>
      </View>

      {!isClinic ? <ConsultationSummary appointment={appointment} /> : null}

      {isClinic ? (
        <View style={styles.completionActionsRow}>
          <Button
            label="Order Medicine"
            onPress={onViewMedicines}
            style={styles.completionSecondaryAction}
            variant="secondary"
          />
          <Button
            label="View Prescription"
            onPress={onViewPrescription}
            style={styles.completionSecondaryAction}
            variant="secondary"
          />
        </View>
      ) : isHome ? (
        <View style={styles.wellnessBanner}>
          <View style={styles.wellnessIcon}>
            <ShieldCheck color={colors.white} size={20} />
          </View>
          <Text style={styles.infoText}>
            We hope you are feeling better.{"\n"}Take care and stay healthy!
          </Text>
        </View>
      ) : (
        <View style={styles.recordsBanner}>
          <FileText color={colors.patient.primaryDark} size={23} />
          <Text style={styles.infoText}>
            Prescription and consultation notes have been sent to your email and
            are available in records.
          </Text>
        </View>
      )}

      <Card borderRadius={radius.md} gap={12} padding={16}>
        <Text style={styles.feedbackTitle}>How was your experience?</Text>
        <Text style={styles.feedbackDescription}>
          Your feedback helps us improve
        </Text>
        <View style={styles.ratingRow}>
          {experienceRatings.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: rating === index }}
              onPress={() => setRating(index)}
              style={({ pressed }) => [
                styles.ratingButton,
                rating === index ? styles.selectedRating : undefined,
                pressed ? styles.pressed : undefined,
              ]}
            >
              <Text style={styles.ratingEmoji}>{item.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Button
        label="Go to Home"
        onPress={onGoHome}
        style={styles.completionMainAction}
      />
      <Button
        label="Share Detailed Feedback"
        onPress={() => setFeedbackOpen(true)}
        style={styles.completionMainAction}
        variant="outline"
      />
      <FeedbackBottomSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </FadedScrollView>
  );
}

function ConsultationSummary({ appointment }: { appointment: Appointment }) {
  return (
    <Card borderRadius={radius.md} gap={0} padding={0}>
      <View style={styles.summaryHeading}>
        <ClipboardList color={colors.patient.primaryDark} size={20} />
        <Text style={styles.cardTitle}>Consultation Summary</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <UserRound color={colors.patient.primaryDark} size={18} />
          <Text style={styles.secondaryText}>Doctor</Text>
        </View>
        <Text style={styles.summaryValue}>{appointment.doctorName}</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <CalendarDays color={colors.patient.primaryDark} size={18} />
          <Text style={styles.secondaryText}>Date & Time</Text>
        </View>
        <Text style={styles.summaryValue}>
          {appointment.date}, {appointment.time.split(" – ")[0]}
        </Text>
      </View>
    </Card>
  );
}

function ScheduleSummary({ appointment }: { appointment: Appointment }) {
  return (
    <Card borderRadius={radius.md} gap={9} padding={16}>
      <Text style={styles.cardTitle}>{appointment.doctorName}</Text>
      <View style={styles.scheduleRow}>
        <Clock3 color={colors.patient.primaryDark} size={18} />
        <Text style={styles.scheduleLabel}>Time</Text>
        <Text style={styles.scheduleValue}>{appointment.time}</Text>
      </View>
      <View style={styles.scheduleRow}>
        <CalendarDays color={colors.patient.primaryDark} size={18} />
        <Text style={styles.scheduleLabel}>Date</Text>
        <Text style={styles.scheduleValue}>{appointment.date}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  centeredCard: { alignItems: "center" },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  centeredDescription: {
    maxWidth: 250,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  scheduleLabel: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
  },
  scheduleValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  qrSurface: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  checkInCode: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  flexCopy: { flex: 1, gap: 2 },
  queueHeading: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  queueTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: "700",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.patient.surface,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#20BE89" },
  liveText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: "700",
  },
  queueNumberSurface: { alignItems: "center", gap: 4 },
  queueNumber: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    fontWeight: "700",
  },
  progressTrack: {
    width: "100%",
    height: 10,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: colors.patient.surface,
  },
  progressValue: {
    width: "72%",
    height: "100%",
    borderRadius: 5,
    backgroundColor: colors.patient.primaryDark,
  },
  waitCopy: { alignItems: "center", gap: 3 },
  waitTime: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 25,
    fontWeight: "700",
  },
  fullWidthButton: { width: "100%", minHeight: 48 },
  infoBanner: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: "#CCE9E6",
  },
  infoText: {
    flex: 1,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  otpRow: { flexDirection: "row", gap: 12 },
  otpCell: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  otpText: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700",
  },
  otpNotice: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  thankYouTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    fontWeight: "700",
  },
  completionHero: {
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    paddingBottom: 4,
  },
  completionHaloOuter: {
    width: 178,
    height: 178,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderRadius: 89,
    backgroundColor: "#E1F7F4",
  },
  completionHaloInner: {
    width: 142,
    height: 142,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 71,
    backgroundColor: "#C8EDE9",
  },
  completionCheckBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    borderRadius: 23,
    backgroundColor: colors.patient.accent,
  },
  completionIcon: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 52,
    backgroundColor: colors.patient.primaryDark,
  },
  completedTitle: {
    color: colors.patient.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  ratingButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 24,
    backgroundColor: colors.white,
  },
  selectedRating: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: "#E8F8F4",
  },
  ratingEmoji: { fontSize: 27, lineHeight: 34 },
  completionActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  completionSecondaryAction: { flex: 1, minHeight: 48 },
  completionMainAction: { minHeight: 50 },
  summaryHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 14,
  },
  summaryRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
  },
  summaryLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryValue: {
    maxWidth: "62%",
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "right",
  },
  wellnessBanner: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  wellnessIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.patient.primaryDark,
  },
  recordsBanner: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: "#E8F8F4",
  },
  feedbackTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  feedbackDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    textAlign: "center",
  },
  pressed: { opacity: 0.72 },
  chatScreen: { flex: 1, backgroundColor: colors.white },
  chatHeader: { minHeight: 106 },
  chatHeaderSafeArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderTitle: {
    flex: 1,
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
  },
  callTrigger: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  chatThread: { gap: 16, padding: 16, paddingBottom: 26 },
  chatDay: {
    marginVertical: 4,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  chatBubbleRow: { width: "100%", flexDirection: "row" },
  receivedRow: { justifyContent: "flex-start" },
  sentRow: { justifyContent: "flex-end" },
  chatBubble: { maxWidth: "78%", gap: 4, padding: 12 },
  receivedBubble: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 4,
    backgroundColor: "#EAF8F7",
  },
  sentBubble: {
    borderWidth: 1,
    borderColor: "#E5EFF0",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 4,
    backgroundColor: colors.white,
  },
  chatMessage: {
    color: "#173B4A",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  chatMessageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  chatTime: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  chatInputArea: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.white,
  },
  quickReplies: { flexDirection: "row", gap: 7 },
  quickReply: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E5EFF0",
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  quickReplyText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  composerField: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5EFF0",
    borderRadius: 24,
    backgroundColor: colors.white,
  },
  composerInputContainer: { flex: 1, maxWidth: undefined },
  composerInput: {
    minHeight: 44,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  sendTrigger: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#36B37E",
  },
  sendDisabled: { opacity: 0.45 },
  videoCallScreen: { flex: 1, backgroundColor: "#C8EDE9" },
  videoSafeArea: { flex: 1 },
  videoBackButton: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  videoDoctorName: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
  },
  localVideoPreview: {
    position: "absolute",
    right: 30,
    bottom: 150,
    width: 101,
    height: 131,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: colors.patient.accent,
  },
  videoControls: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  videoControl: {
    width: 58,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.patient.primaryDark,
  },
  videoEndControl: {
    backgroundColor: colors.danger,
  },
});
