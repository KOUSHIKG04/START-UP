import {
  Activity,
  Baby,
  Bean,
  Bone,
  Brain,
  Droplets,
  Ear,
  Eye,
  HeartPulse,
  Mars,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Venus,
  Wind,
  type LucideIcon,
} from "lucide-react-native";

export const symptoms = [
  "Chest pain",
  "Headache",
  "Fever",
  "Back pain",
  "Skin rash",
  "Stomach pain",
  "Anxiety",
  "Dizziness",
] as const;

type DoctorCategory = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export const categories: DoctorCategory[] = [
  { key: "common", label: "Common\nIllness", icon: Stethoscope },
  { key: "vision", label: "Eyes &\nVision", icon: Eye },
  { key: "heart", label: "Heart", icon: HeartPulse },
  { key: "lungs", label: "Breathing &\nLungs", icon: Wind },
  { key: "digestion", label: "Stomach &\nDigestion", icon: Activity },
  { key: "bones", label: "Bones, Joints\n& Muscles", icon: Bone },
  { key: "brain", label: "Brain & Nervous\nSystem", icon: Brain },
  { key: "skin", label: "Skin & Hair", icon: Sparkles },
  { key: "women", label: "Women's\nHealth", icon: Venus },
  { key: "men", label: "Men's\nHealth", icon: Mars },
  { key: "mental", label: "Mental\nHealth", icon: Brain },
  { key: "ent", label: "Ear, Nose &\nThroat", icon: Ear },
  { key: "diabetes", label: "Diabetes &\nHormones", icon: Droplets },
  { key: "kidney", label: "Kidney &\nUrinary", icon: Bean },
  { key: "allergies", label: "Allergies &\nImmune", icon: ShieldCheck },
  { key: "children", label: "Children's\nHealth", icon: Baby },
];
