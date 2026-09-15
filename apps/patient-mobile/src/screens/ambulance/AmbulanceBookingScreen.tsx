import { useEffect, useState, type ReactNode } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ambulance,
  ChevronLeft,
  Clock3,
  Heart,
  Info,
  MapPin,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react-native";
import { fontFamilies, shadows } from "@startup/design-tokens";
import { useSafeAreaInsets } from "@startup/mobile-ui";
import {
  ambulanceTrip,
  ambulanceTypes,
  emergencyNumbers,
  hospitalSuggestions,
  nearbyHospitals,
  type AmbulanceFlowStep,
  type AmbulanceType,
} from "../../utils/ambulanceFlow";

const pickupMap = require("../../../assets/images/ambulance/pickup-map-a.png");
const trackingMap = require("../../../assets/images/ambulance/hospital-map.png");

type Props = {
  onBackPress: () => void;
  onComplete: () => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
};

export function AmbulanceBookingScreen({
  onBackPress,
  onComplete,
  onFullscreenChange,
}: Props) {
  const [step, setStep] = useState<AmbulanceFlowStep>("booking");
  const [destination, setDestination] = useState("");
  const [searching, setSearching] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [type, setType] = useState<AmbulanceType["id"]>("advanced");

  useEffect(() => {
    const next: [AmbulanceFlowStep, number] | undefined =
      step === "assigning"
        ? ["tracking", 2200]
        : step === "tracking"
          ? ["arrived", 7000]
          : step === "arrived"
            ? ["hospital", 7000]
            : undefined;
    if (!next) return undefined;
    const timer = setTimeout(() => setStep(next[0]), next[1]);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    onFullscreenChange?.(step === "pickup" || step === "assigning");
  }, [onFullscreenChange, step]);

  if (step === "pickup") {
    return (
      <PickupMap
        destination={destination}
        onBack={() => setStep("booking")}
        onConfirm={() => setStep("assigning")}
      />
    );
  }
  if (step === "assigning") {
    return <Assigning onBack={() => setStep("pickup")} />;
  }
  if (step === "tracking" || step === "arrived" || step === "hospital") {
    return (
      <Tracking
        stage={step}
        emergency={emergency}
        onBack={onBackPress}
        onEmergencyChange={setEmergency}
        onCancel={onComplete}
      />
    );
  }

  return (
    <View style={s.screen}>
      <Header
        title="Book Ambulance"
        subtitle="Find & book the nearest ambulance"
        onBack={onBackPress}
      />
      <ScrollView
        contentContainerStyle={s.bookingContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LocationFields
          destination={destination}
          onChange={(value) => {
            setDestination(value);
            setSearching(true);
          }}
          onFocus={() => setSearching(true)}
        />
        {searching ? (
          <Suggestions
            onSelect={(name) => {
              setDestination(name);
              setSearching(false);
            }}
          />
        ) : (
          <>
            <View style={s.emergencyRow}>
              <View style={s.emergencyPill}>
                <Text style={s.emergencyText}>Emergency</Text>
              </View>
              <Switch
                value={emergency}
                onValueChange={setEmergency}
                trackColor={{ false: "#D8E3E6", true: "#8DCFC8" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <SectionTitle>Select Nearby Hospitals</SectionTitle>
            <ScrollView
              horizontal
              contentContainerStyle={s.hospitalList}
              showsHorizontalScrollIndicator={false}
            >
              {nearbyHospitals.map((hospital, index) => (
                <Pressable
                  key={hospital.name}
                  onPress={() => setDestination(hospital.name)}
                  style={({ pressed }) => [
                    s.hospitalCard,
                    index === 1 && s.hospitalSelected,
                    pressed && s.pressed,
                  ]}
                >
                  <Text numberOfLines={1} style={s.hospitalName}>
                    {hospital.name}
                  </Text>
                  <View style={s.metaRow}>
                    <Clock3 color="#00998D" size={11} />
                    <Text style={s.meta}>~3 min</Text>
                    <MapPin color="#00998D" size={11} />
                    <Text style={s.meta}>1.2 km</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <SectionTitle>Select Ambulance Type</SectionTitle>
            <View style={s.ambulanceList}>
              {ambulanceTypes.map((item) => (
                <AmbulanceOption
                  key={item.id}
                  item={item}
                  selected={type === item.id}
                  onPress={() => setType(item.id)}
                />
              ))}
            </View>
            <ActionButton
              label="Book Ambulance Now"
              onPress={() => setStep("pickup")}
              style={s.bookButton}
            />
            <SectionTitle style={s.numbersTitle}>
              Emergency Numbers
            </SectionTitle>
            <View style={s.numberRow}>
              {emergencyNumbers.map((item) => (
                <Pressable
                  key={item.number}
                  onPress={() => void Linking.openURL(`tel:${item.number}`)}
                  style={({ pressed }) => [s.numberCard, pressed && s.pressed]}
                >
                  <Text numberOfLines={1} style={s.numberLabel}>
                    {item.label === "Fire" ? "Fire service" : item.label}
                  </Text>
                  <View style={s.numberLine}>
                    <Phone color="#008877" size={13} />
                    <Text style={s.number}>{item.number}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={s.safetyNote}>
              <ShieldCheck color="#087F78" size={17} />
              <Text style={s.safetyNoteText}>
                All ambulances are GPS-tracked & equipped with trained
                paramedics. Your safety is our priority.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Header({
  title,
  subtitle,
  centered,
  onBack,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={["#0A4A47", "#087F78"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[s.header, { paddingTop: Math.max(insets.top, 24) }]}
    >
      <Pressable onPress={onBack} hitSlop={10} style={s.back}>
        <ChevronLeft color="#FFFFFF" size={27} />
      </Pressable>
      <View style={[s.headerCopy, centered && s.headerCopyCentered]}>
        <Text style={[s.headerTitle, centered && s.centeredTitle]}>
          {title}
        </Text>
        {subtitle ? <Text style={s.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {centered ? <View style={s.headerBalance} /> : null}
    </LinearGradient>
  );
}

function LocationFields({
  destination,
  onChange,
  onFocus,
}: {
  destination: string;
  onChange: (value: string) => void;
  onFocus: () => void;
}) {
  return (
    <View style={s.locations}>
      <View style={s.locationCard}>
        <View style={s.pickupDot} />
        <Text style={s.locationText}>Current Location</Text>
        <MapPin color="#008877" size={19} />
      </View>
      <View style={s.connector} />
      <View style={s.locationCard}>
        <View style={s.dropSquare} />
        <TextInput
          value={destination}
          onChangeText={onChange}
          onFocus={onFocus}
          placeholder="Search hospital or clinic"
          placeholderTextColor="#71818F"
          style={s.destinationInput}
        />
        <Search color="#71818F" size={18} />
      </View>
    </View>
  );
}

function Suggestions({ onSelect }: { onSelect: (name: string) => void }) {
  const [favorite, setFavorite] = useState("Victoria Hospital");
  return (
    <View style={s.suggestions}>
      {hospitalSuggestions.map(([name, address], index) => (
        <Pressable
          key={name}
          onPress={() => onSelect(name)}
          style={({ pressed }) => [
            s.suggestion,
            index > 0 && s.suggestionBorder,
            pressed && s.pressed,
          ]}
        >
          <View style={s.suggestionPin}>
            <MapPin color="#009E92" size={17} />
          </View>
          <View style={s.suggestionCopy}>
            <Text style={s.suggestionName}>{name}</Text>
            <Text style={s.suggestionAddress}>{address}</Text>
          </View>
          <Pressable hitSlop={10} onPress={() => setFavorite(name)}>
            <Heart
              color={favorite === name ? "#009E92" : "#71818F"}
              size={18}
            />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

function AmbulanceOption({
  item,
  selected,
  onPress,
}: {
  item: AmbulanceType;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.ambulanceOption,
        selected && s.ambulanceSelected,
        pressed && s.pressed,
      ]}
    >
      <View style={[s.ambulanceIcon, selected && s.ambulanceIconSelected]}>
        <Ambulance color="#008877" size={27} />
      </View>
      <View style={s.ambulanceCopy}>
        <Text style={s.ambulanceName}>{item.title}</Text>
        <Text numberOfLines={1} style={s.ambulanceDescription}>
          {item.description.replace("and", "&")}
        </Text>
      </View>
      <View style={s.priceBlock}>
        <Text style={[s.price, selected && s.selectedPrice]}>₹{item.fare}</Text>
        <Text style={s.eta}>ETA {item.eta}</Text>
      </View>
    </Pressable>
  );
}

function PickupMap({
  destination,
  onBack,
  onConfirm,
}: {
  destination: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={s.screen}>
      <Header
        title="Set pickup on map"
        subtitle="Find & book the nearest ambulance"
        onBack={onBack}
      />
      <View style={s.pickupMapFrame}>
        <Image
          source={pickupMap}
          resizeMode="stretch"
          style={s.pickupMapImage}
        />
      </View>
      <View style={s.pickupPanel}>
        <Text style={s.pickupTitle}>Confirm your pickup</Text>
        <View style={s.pickupSearch}>
          <Text numberOfLines={1} style={s.pickupPlaceholder}>
            {destination || "Search hospital or clinic"}
          </Text>
          <Search color="#71818F" size={18} />
        </View>
        <TextInput
          placeholder="Add Building , gate /Floor (Optional)"
          placeholderTextColor="#71818F"
          style={s.buildingInput}
        />
        <ActionButton
          label="Confirm Your Pick up"
          onPress={onConfirm}
          style={s.confirmButton}
        />
        <Text style={s.mapCaption}>
          Map shown for illustration; GPS permission required.
        </Text>
      </View>
    </View>
  );
}

function Assigning({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.screen}>
      <Header title="Ambulance Tracking" onBack={onBack} />
      <View style={s.assigningBody}>
        <View style={s.ring1}>
          <View style={s.ring2}>
            <View style={s.ring3}>
              <Ambulance color="#008877" size={40} />
            </View>
          </View>
        </View>
        <Text style={s.assigningTitle}>Assigning the ambulance driver</Text>
        <Text style={s.assigningSubtitle}>We'll reach you soon</Text>
      </View>
    </View>
  );
}

type TrackingStage = "tracking" | "arrived" | "hospital";

function Tracking({
  stage,
  emergency,
  onBack,
  onEmergencyChange,
  onCancel,
}: {
  stage: TrackingStage;
  emergency: boolean;
  onBack: () => void;
  onEmergencyChange: (value: boolean) => void;
  onCancel: () => void;
}) {
  if (stage === "hospital") return <HospitalJourney onBack={onBack} />;
  const arrived = stage === "arrived";
  return (
    <View style={s.screen}>
      <Header title="Ambulance Tracking" onBack={onBack} />
      <ScrollView
        contentContainerStyle={s.trackingContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.trackingTitle}>
          {arrived ? "Arrived at the location" : "Ambulance on the way"}
        </Text>
        <Image source={trackingMap} resizeMode="cover" style={s.trackingMap} />
        <Text style={s.blueStatus}>
          {arrived
            ? "Reached your location"
            : "Driver is on the way, Will reach in 5 min"}
        </Text>
        <View style={s.trackEmergencyRow}>
          <View style={s.trackEmergencyPill}>
            <Text style={s.emergencyText}>Emergency</Text>
          </View>
          <Switch
            value={emergency}
            onValueChange={onEmergencyChange}
            trackColor={{ false: "#D8E3E6", true: "#8DCFC8" }}
            thumbColor="#FFFFFF"
          />
        </View>
        <PinRow />
        <DriverCard name="Driver" />
        <TripCard eta="9 min" distance="4.6 km" title="Trip Details" />
        {arrived ? <TripControls /> : null}
        <Pressable onPress={onCancel} style={s.cancelButton}>
          <Text style={s.cancelText}>Cancel Appointment</Text>
        </Pressable>
        {arrived ? <SafetyCard /> : null}
      </ScrollView>
    </View>
  );
}

function HospitalJourney({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.screen}>
      <Header title="Ambulance Tracking" onBack={onBack} centered />
      <ScrollView
        contentContainerStyle={s.hospitalContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.reachingRow}>
          <View style={s.liveDot} />
          <Text style={s.reachingTitle}>Reaching Hospital</Text>
        </View>
        <Text style={s.reachingSubtitle}>Driver is currently en route</Text>
        <View style={s.liveMapWrap}>
          <Image source={trackingMap} resizeMode="cover" style={s.liveMap} />
          <View style={s.liveBadge}>
            <View style={s.liveWhiteDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        </View>
        <TripCard eta="7 min" distance="3.2 km" title="Estimated Arrival" />
        <DriverCard name="Rajesh Kumar" />
        <TripControls />
        <SafetyCard />
      </ScrollView>
    </View>
  );
}

function PinRow() {
  return (
    <View style={s.pinRow}>
      <View style={s.pinLabelBox}>
        <Text style={s.pinLabel}>PIN</Text>
      </View>
      <View style={s.pinDigits}>
        {ambulanceTrip.pin.split("").map((digit, index) => (
          <View key={`${digit}-${index}`} style={s.pinBox}>
            <Text style={s.pinDigit}>{digit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DriverCard({ name }: { name: string }) {
  return (
    <View style={s.driverCard}>
      <View style={s.avatar}>
        <UserRound color="#FFFFFF" size={27} />
      </View>
      <View style={s.driverCopy}>
        <View style={s.driverNameRow}>
          <Text style={s.driverName}>{name}</Text>
          <Star color="#008877" size={14} />
          <Text style={s.driverRating}>4.8</Text>
        </View>
        <Text style={s.vehicle}>Ambulance - KA 01 AB 1234</Text>
      </View>
      <Pressable
        onPress={() => void Linking.openURL("tel:9876543210")}
        style={s.callButton}
      >
        <Phone color="#FFFFFF" size={19} />
      </Pressable>
    </View>
  );
}

function TripCard({
  title,
  eta,
  distance,
}: {
  title: string;
  eta: string;
  distance: string;
}) {
  return (
    <View style={s.tripCard}>
      <View style={s.tripHeader}>
        <Text style={s.tripTitle}>{title}</Text>
        <Info color="#0C2434" size={16} />
      </View>
      <View style={s.statsRow}>
        <Stat value={eta} label="ETA" />
        <View style={s.statDivider} />
        <Stat value={distance} label="Distance" />
        <View style={s.statDivider} />
        <Stat value="₹1200" label="Est. Fare" />
      </View>
      <View style={s.divider} />
      <RoutePoint color="#009E92" label="PICKUP">
        Sriramapura, Shivamogga, Karnataka
      </RoutePoint>
      <RoutePoint color="#0C2434" label="DROP-OFF">
        Manipal Hospital, Shivamogga
      </RoutePoint>
      <View style={s.divider} />
      <View style={s.serviceRow}>
        <Text style={s.serviceLabel}>Ambulance Service</Text>
        <Text style={s.serviceValue}>Advanced Life Support</Text>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function RoutePoint({
  color,
  label,
  children,
}: {
  color: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={s.routePoint}>
      <View style={[s.routeDot, { backgroundColor: color }]} />
      <View style={s.routeCopy}>
        <Text style={s.routeLabel}>{label}</Text>
        <Text numberOfLines={1} style={s.routeValue}>
          {children}
        </Text>
      </View>
    </View>
  );
}

function TripControls() {
  return (
    <View style={s.controls}>
      <Text style={s.controlsTitle}>Trip Controls</Text>
      <Pressable style={s.shareButton}>
        <Share2 color="#0C2434" size={16} />
        <Text style={s.shareText}>Share Live Location</Text>
      </Pressable>
    </View>
  );
}

function SafetyCard() {
  return (
    <View style={s.safetyCard}>
      <ShieldCheck color="#008877" size={20} />
      <View style={s.safetyCopy}>
        <Text style={s.safetyTitle}>Your safety is our priority</Text>
        <Text style={s.safetySubtitle}>Share trip status with family</Text>
      </View>
      <Share2 color="#008877" size={17} />
    </View>
  );
}

function SectionTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[s.sectionTitle, style]}>{children}</Text>;
}

function ActionButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.actionButton, style, pressed && s.pressed]}
    >
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  pressed: { opacity: 0.72 },
  header: {
    minHeight: 106,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  back: {
    width: 32,
    height: 36,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerCopy: { marginLeft: 14, gap: 4 },
  headerCopyCentered: { flex: 1, marginLeft: 0, alignItems: "center" },
  headerBalance: { width: 32 },
  headerTitle: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
  },
  centeredTitle: { fontSize: 18 },
  headerSubtitle: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  bookingContent: { paddingBottom: 118 },
  locations: { paddingHorizontal: 16, marginTop: -11, zIndex: 2 },
  locationCard: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingHorizontal: 19,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#008877",
  },
  dropSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#FF5C5C",
  },
  locationText: {
    flex: 1,
    color: "#0C2434",
    fontFamily: fontFamilies.medium,
    fontSize: 16,
  },
  destinationInput: {
    flex: 1,
    padding: 0,
    color: "#0C2434",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  },
  connector: {
    width: 2,
    height: 40,
    marginVertical: -11,
    marginLeft: 28,
    zIndex: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  emergencyRow: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginTop: 13,
  },
  emergencyPill: {
    height: 39,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "#D7E3E5",
  },
  emergencyText: {
    color: "#087F78",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 12,
    paddingHorizontal: 20,
    color: "#0C2434",
    fontFamily: fontFamilies.medium,
    fontSize: 16,
  },
  hospitalList: { gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  hospitalCard: {
    width: 125,
    height: 97,
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  hospitalSelected: { backgroundColor: "#E8F5F4" },
  hospitalName: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  meta: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 10 },
  ambulanceList: { gap: 16, paddingHorizontal: 16 },
  ambulanceOption: {
    height: 85,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  ambulanceSelected: {
    borderWidth: 0.5,
    borderColor: "rgba(8,127,120,0.2)",
    backgroundColor: "#E8F5F4",
  },
  ambulanceIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F0F9F8",
  },
  ambulanceIconSelected: { backgroundColor: "#C8EAE7" },
  ambulanceCopy: { flex: 1, minWidth: 0, gap: 3 },
  ambulanceName: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  ambulanceDescription: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  priceBlock: { alignItems: "flex-end", gap: 4 },
  price: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 15 },
  selectedPrice: { color: "#087F78" },
  eta: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 10 },
  actionButton: {
    height: 51,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#087F78",
  },
  actionText: { color: "#FFFFFF", fontFamily: fontFamilies.bold, fontSize: 15 },
  bookButton: { marginHorizontal: 14, marginTop: 35 },
  numbersTitle: { marginTop: 44 },
  numberRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18 },
  numberCard: {
    flex: 1,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#E8F5F4",
  },
  numberLabel: {
    color: "#008877",
    fontFamily: fontFamilies.semibold,
    fontSize: 9,
  },
  numberLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  number: { color: "#087F78", fontFamily: fontFamilies.bold, fontSize: 16 },
  safetyNote: {
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 15,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#E8F5F4",
  },
  safetyNoteText: {
    flex: 1,
    color: "#087F78",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  suggestions: {
    marginHorizontal: 20,
    marginTop: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 12,
  },
  suggestion: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: "#D7E3E5" },
  suggestionPin: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#E8F5F4",
  },
  suggestionCopy: { flex: 1, gap: 2 },
  suggestionName: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
  },
  suggestionAddress: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  pickupMapFrame: { width: "100%", height: 474, overflow: "hidden" },
  pickupMapImage: {
    position: "absolute",
    top: "-8%",
    left: 0,
    width: "100%",
    height: "159%",
  },
  pickupPanel: {
    flex: 1,
    minHeight: 310,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#E8F8F4",
  },
  pickupTitle: {
    marginLeft: 7,
    marginBottom: 16,
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
  },
  pickupSearch: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 21,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  pickupPlaceholder: {
    flex: 1,
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  },
  buildingInput: {
    height: 54,
    marginTop: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#0C2434",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    ...shadows.card,
  },
  confirmButton: { marginTop: 18 },
  mapCaption: {
    marginTop: 13,
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    textAlign: "center",
  },
  assigningBody: { flex: 1, alignItems: "center", paddingTop: 111 },
  ring1: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 60,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  ring2: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 45,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  ring3: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  assigningTitle: {
    marginTop: 66,
    color: "#008877",
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  assigningSubtitle: {
    marginTop: 22,
    color: "#71818F",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
  trackingContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 122,
  },
  trackingTitle: {
    marginBottom: 11,
    color: "#008877",
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  trackingMap: { width: "100%", height: 211, borderRadius: 12 },
  blueStatus: {
    marginTop: 10,
    color: "#3B82F6",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    textAlign: "center",
  },
  trackEmergencyRow: {
    height: 61,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  trackEmergencyPill: {
    minWidth: 117,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#D7E3E5",
  },
  pinRow: {
    height: 61,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 6,
  },
  pinLabelBox: {
    width: 119,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#07595D",
  },
  pinLabel: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  pinDigits: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  pinBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.19)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  pinDigit: {
    color: "#000000",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  driverCard: {
    height: 84,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 6,
    marginTop: 2,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#008877",
  },
  driverCopy: { flex: 1, marginLeft: 26 },
  driverNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  driverName: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 16 },
  driverRating: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  vehicle: {
    marginTop: 5,
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  callButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#008877",
  },
  tripCard: {
    marginHorizontal: 2,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  tripTitle: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 14 },
  statsRow: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  stat: { flex: 1, alignItems: "center", gap: 5 },
  statValue: { color: "#008877", fontFamily: fontFamilies.bold, fontSize: 18 },
  statLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  statDivider: { width: 1, height: 32, backgroundColor: "#D7E3E5" },
  divider: { height: 1, marginVertical: 8, backgroundColor: "#E3E9EA" },
  routePoint: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 9,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeCopy: { flex: 1, gap: 2 },
  routeLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  routeValue: {
    color: "#0C2434",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 9,
  },
  serviceLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  serviceValue: {
    color: "#0C2434",
    fontFamily: fontFamilies.bold,
    fontSize: 12,
  },
  controls: {
    gap: 12,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 16,
  },
  controlsTitle: {
    color: "#0C2434",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
  shareButton: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 12,
  },
  shareText: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
  },
  cancelButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  cancelText: {
    color: "rgba(0,136,119,0.8)",
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  safetyCard: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#E8F7F4",
  },
  safetyCopy: { flex: 1, gap: 2 },
  safetyTitle: {
    color: "#008877",
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
  },
  safetySubtitle: {
    color: "#008877",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  hospitalContent: {
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 122,
  },
  reachingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF3B43",
  },
  reachingTitle: {
    color: "#087F78",
    fontFamily: fontFamilies.bold,
    fontSize: 20,
  },
  reachingSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: "#008877",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
  },
  liveMapWrap: { position: "relative" },
  liveMap: { width: "100%", height: 191, borderRadius: 14 },
  liveBadge: {
    position: "absolute",
    top: 11,
    left: 12,
    height: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "#D63A32",
  },
  liveWhiteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: { color: "#FFFFFF", fontFamily: fontFamilies.bold, fontSize: 9 },
});
