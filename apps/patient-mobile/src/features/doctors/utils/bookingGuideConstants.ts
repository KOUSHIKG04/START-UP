export const steps = [
  {
    image: require("../../../../assets/images/booking-guide/find-care.png"),
    imageScale: 1,
    title: "Find the care you need",
    description:
      "Search by symptom or specialty. Choose clinic, online or home care from the Home screen.",
    note: "Available services depend on the doctor’s practice.",
  },
  {
    image: require("../../../../assets/images/booking-guide/choose-doctor.png"),
    imageScale: 1.04,
    title: "Choose your doctor",
    description:
      "Explore verified doctors and compare their qualifications, specialties and consultation fees.",
    note: "Open a doctor’s profile to learn more before booking.",
  },
  {
    image: require("../../../../assets/images/booking-guide/choose-slot.png"),
    imageScale: 0.92,
    title: "Pick a date and time",
    description:
      "Choose yourself or a family member, select an available slot, and enter your reason for the visit.",
    note: "Only times published by the doctor can be booked.",
  },
  {
    image: require("../../../../assets/images/booking-guide/booking-status.png"),
    imageScale: 0.92,
    title: "Check your booking status",
    description:
      "Submit your booking. It may confirm immediately or need approval. Follow its status in My Bookings.",
    note: "For app-booked clinic visits, show your QR when you arrive.",
  },
] as const;
