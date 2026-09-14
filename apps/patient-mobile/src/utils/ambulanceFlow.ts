export type AmbulanceFlowStep =
  | "booking"
  | "pickup"
  | "assigning"
  | "tracking"
  | "arrived"
  | "hospital"
  | "payment"
  | "complete";

export type AmbulanceType = {
  id: "basic" | "advanced" | "icu";
  title: string;
  description: string;
  fare: number;
  eta: string;
};

export const ambulanceTypes: AmbulanceType[] = [
  {
    id: "basic",
    title: "Basic Life Support",
    description: "Oxygen and first aid",
    fare: 500,
    eta: "8 min",
  },
  {
    id: "advanced",
    title: "Advanced Life Support",
    description: "Cardiac monitor and defibrillator",
    fare: 1200,
    eta: "10 min",
  },
  {
    id: "icu",
    title: "Mobile ICU",
    description: "Full ICU setup and specialist",
    fare: 2500,
    eta: "15 min",
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
