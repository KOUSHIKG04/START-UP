import type { ImageSourcePropType } from "react-native";
import type { Href } from "expo-router";
import type { ConsultationType } from "../types/appointment";
import { SEARCH_HEIGHT } from "./headerConstants";

export const EXPANDED_HEADER_HEIGHT = 147;
export const SEARCH_OVERLAP = 24;
export const COLLAPSED_HEADER_H = 74; // gives comfortable ~19px padding below search bar
export const SEARCH_END_TOP_OFFSET = 11;
export const CONTENT_TOP =
  EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP + SEARCH_HEIGHT + 14;

export const symptoms = [
  "Fever",
  "Cough",
  "Headache",
  "Cold",
  "Stomach pain",
  // "Back pain",
  "Skin rash",
  "Breathing issue",
] as const;

export function getDoctorResultsRoute(
  symptom: string,
  consultationType: ConsultationType
) {
  return {
    pathname: "/doctor-results",
    params: { symptom, consultationType },
  } as unknown as Href;
}

export type DoctorCategory = {
  key: string;
  label: string;
  image: ImageSourcePropType;
  imageScale?: number;
};

export const categories: readonly DoctorCategory[] = [
  {
    key: "cold_cough",
    label: "Cold &\nCough",
    image: require("../../assets/clinzo-symptom-icons/cold-and-cough.png"),
    imageScale: 1.05,
  },
  {
    key: "headache",
    label: "Headache &\nMigraine",
    image: require("../../assets/clinzo-symptom-icons/headache.png"),
    imageScale: 1.05,
  },
  {
    key: "fever",
    label: "Fever",
    image: require("../../assets/clinzo-symptom-icons/fever.png"),
    imageScale: 1.2,
  },
  {
    key: "vision",
    label: "Eyes &\nVision",
    image: require("../../assets/clinzo-symptom-icons/eye-care.png"),
  },
  {
    key: "dental",
    label: "Dental\nCare",
    image: require("../../assets/clinzo-symptom-icons/Dental.png"),
  },
  {
    key: "heart",
    label: "Heart",
    image: require("../../assets/clinzo-symptom-icons/Heart.png"),
  },
  {
    key: "lungs",
    label: "Breathing &\nLungs",
    image: require("../../assets/clinzo-symptom-icons/lungs.png"),
  },
  {
    key: "digestion",
    label: "Stomach &\nDigestion",
    image: require("../../assets/clinzo-symptom-icons/Stomach.png"),
  },
  {
    key: "stomach_pain",
    label: "Stomach\nPain",
    image: require("../../assets/clinzo-symptom-icons/stomach-pain.png"),
  },
  {
    key: "bones",
    label: "Bones, Joints\n& Muscles",
    image: require("../../assets/clinzo-symptom-icons/Knee.png"),
  },
  {
    key: "spine",
    label: "Spine & Back\nCare",
    image: require("../../assets/clinzo-symptom-icons/Spine.png"),
  },
  {
    key: "brain",
    label: "Brain & Nervous\nSystem",
    image: require("../../assets/clinzo-symptom-icons/neuro.png"),
  },
  {
    key: "skin",
    label: "Skin & Hair",
    image: require("../../assets/clinzo-symptom-icons/skin.png"),
  },
  {
    key: "women",
    label: "Women's\nHealth",
    image: require("../../assets/clinzo-symptom-icons/women-health.png"),
  },
  {
    key: "men",
    label: "sexual\nHealth",
    image: require("../../assets/clinzo-symptom-icons/sexcual-wellness.png"),
  },
  {
    key: "mental",
    label: "Mental\nHealth",
    image: require("../../assets/clinzo-symptom-icons/mental-health.png"),
  },
  {
    key: "ent",
    label: "Ear, Nose &\nThroat",
    image: require("../../assets/clinzo-symptom-icons/sinusitis.png"),
    imageScale: 1.1,
  },
  {
    key: "diabetes",
    label: "Diabetes &\nHormones",
    image: require("../../assets/clinzo-symptom-icons/Diabeties.png"),
  },
  {
    key: "kidney",
    label: "Kidney &\nUrinary",
    image: require("../../assets/clinzo-symptom-icons/Kidney.png"),
  },
  {
    key: "kidney_stone",
    label: "Kidney\nStones",
    image: require("../../assets/clinzo-symptom-icons/kidney-stone.png"),
  },
  {
    key: "gallstones",
    label: "Gall\nStones",
    image: require("../../assets/clinzo-symptom-icons/gallstones.png"),
  },
  {
    key: "children",
    label: "Children's\nHealth",
    image: require("../../assets/clinzo-symptom-icons/Children.png"),
  },
  {
    key: "constipation",
    label: "Constipation\n& Bowel",
    image: require("../../assets/clinzo-symptom-icons/constipation.png"),
  },
  {
    key: "piles",
    label: "Piles &\nHemorrhoids",
    image: require("../../assets/clinzo-symptom-icons/piles-hemorrhoids.png"),
  },
  {
    key: "fissure_fistula",
    label: "Fissure &\nFistula",
    image: require("../../assets/clinzo-symptom-icons/anal-fissure-fistula.png"),
  },
  {
    key: "hernia",
    label: "Hernia\nCare",
    image: require("../../assets/clinzo-symptom-icons/hernia.png"),
  },
  {
    key: "appendicitis",
    label: "Appendicitis",
    image: require("../../assets/clinzo-symptom-icons/appendicitis.png"),
  },
  {
    key: "varicose_veins",
    label: "Varicose\nVeins",
    image: require("../../assets/clinzo-symptom-icons/varicose-veins.png"),
  },
  {
    key: "general_surgery",
    label: "General\nSurgery",
    image: require("../../assets/clinzo-symptom-icons/general-surgery.png"),
  },
  {
    key: "allergies",
    label: "Allergies &\nImmune",
    image: require("../../assets/clinzo-symptom-icons/allergy-immune.png"),
    imageScale: 1.25,
  },
  {
    key: "cancer",
    label: "Cancer\nCare",
    image: require("../../assets/clinzo-symptom-icons/cancer.png"),
  },
  {
    key: "ayurveda",
    label: "Ayurveda",
    image: require("../../assets/clinzo-symptom-icons/ayurveda.png"),
  },
  {
    key: "vertigo",
    label: "Vertigo &\nBalance",
    image: require("../../assets/clinzo-symptom-icons/vertigo.png"),
  },
  {
    key: "circumcision",
    label: "Circumcision",
    image: require("../../assets/clinzo-symptom-icons/circumcision.png"),
  },
  {
    key: "covid",
    label: "Covid & Viral\nCare",
    image: require("../../assets/clinzo-symptom-icons/covid.png"),
  },
  {
    key: "blood_test",
    label: "Blood Test &\nDiagnostics",
    image: require("../../assets/clinzo-symptom-icons/Blood-test.png"),
  },
];
