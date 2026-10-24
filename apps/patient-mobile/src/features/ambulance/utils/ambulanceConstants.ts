import type { AmbulanceFlowStep, AmbulanceType } from "../types/ambulance";

export type { AmbulanceFlowStep, AmbulanceType } from "../types/ambulance";

export const ambulanceTypes: AmbulanceType[] = [
  {
    id: "basic",
    title: "Basic Life Support",
    description: "Oxygen and first aid",
    fare: null,
    eta: null,
  },
  {
    id: "advanced",
    title: "Advanced Life Support",
    description: "Cardiac monitor and defibrillator",
    fare: null,
    eta: null,
  },
  {
    id: "icu",
    title: "Neonatal ICU",
    description: "Neonatal intensive care transport",
    fare: null,
    eta: null,
  },
];

export const nearbyHospitals = [
  { name: "Apollo Hospital", distance: "1.2 km", eta: "3 min" },
  { name: "Fortis Hospital", distance: "2.4 km", eta: "6 min" },
  { name: "Manipal Hospital", distance: "3.1 km", eta: "8 min" },
] as const;

export const hospitalSuggestions = [
  ["Apollo Hospital", "Bannerghatta Road, Bengaluru"],
  ["Fortis Hospital", "Cunningham Road, Bengaluru"],
  ["Manipal Hospital", "HAL Airport Road, Bengaluru"],
  ["Victoria Hospital", "Fort, Bengaluru"],
  ["NIMHANS", "Hosur Road, Bengaluru"],
  ["Jayadeva Hospital", "Bannerghatta Road, Bengaluru"],
  ["St. John’s Hospital", "Koramangala, Bengaluru"],
] as const;

export const emergencyNumbers = [
  { label: "Emergency", number: "112" },
  { label: "Ambulance", number: "108" },
  { label: "Fire", number: "101" },
  { label: "Police", number: "100" },
] as const;

export const ambulanceTrip = {
  driver: "Ramesh Kumar",
  rating: "4.8",
  vehicle: "KA 01 AB 1234",
  pickup: "Sriramapura, Shivamogga, Karnataka",
  dropoff: "Manipal Hospital, Shivamogga",
  service: "Advanced Life Support",
  eta: "9 min",
  distance: "4.6 km",
  fare: 1200,
  pin: "1547",
} as const;

export const pickupMapImage = require("../../../../assets/images/ambulance/pickup-map-a.png");

export const trackingMapImage = require("../../../../assets/images/ambulance/hospital-map.png");

export const ASSIGNING_DELAY_MS = 2200;

export const TRACKING_STAGE_DELAY_MS = 7000;

export const HOSPITAL_ARRIVED_DELAY_MS = 6000;
