export const selectedPracticeQueryKey = (doctorId: string | undefined) =>
  ["selected-doctor-practice", doctorId] as const;
