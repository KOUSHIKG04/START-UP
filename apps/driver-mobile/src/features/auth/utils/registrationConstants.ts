import {
  Activity,
  Ambulance,
  Baby,
  ClipboardCheck,
  Crosshair,
  FileCheck,
  FileText,
  Headphones,
  HeartPulse,
  IdCard,
  Shield,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { colors } from "@startup/design-tokens";

export const teal = colors.driver.primary;

export const documentTypes: {
  name: string;
  icon: LucideIcon;
  image?: boolean;
}[] = [
  { name: "Aadhaar Card", icon: IdCard },
  { name: "PAN Card", icon: IdCard },
  { name: "Driving licence", icon: FileText },
  { name: "Vehicle RC", icon: FileCheck },
  { name: "Insurance", icon: Shield },
  { name: "Fitness certificate", icon: ClipboardCheck },
  { name: "Ambulance Image", icon: Ambulance, image: true },
  { name: "Equipment Images", icon: HeartPulse, image: true },
];

export const registrationBenefits = [
  {
    icon: Wallet,
    title: "Fair trip earnings",
    body: "Transparent fare and incentives",
  },
  {
    icon: Crosshair,
    title: "Smart matching",
    body: "Equipment and ETA based requests",
  },
  {
    icon: Headphones,
    title: "24/7 support",
    body: "Emergency coordination team",
  },
];

export const vehicleClassOptions = [
  { id: "BLS", label: "Basic", icon: Shield },
  { id: "ALS", label: "Advanced", icon: Activity },
  { id: "NICU", label: "Neonatal", icon: Baby },
] as const;
