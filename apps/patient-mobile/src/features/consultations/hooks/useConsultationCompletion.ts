import type { CompletionViewProps } from "../types/visit-session";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, Monitor, Stethoscope } from "lucide-react-native";
export function useConsultationCompletion({
  appointment,
  onGoHome,
  onViewMedicines,
  onViewPrescription,
  existingRating,
  onSubmitRating,
}: CompletionViewProps) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState<number | undefined>(
    existingRating ?? undefined
  );
  const [ratingSubmitted, setRatingSubmitted] = useState(
    existingRating != null
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const submitRating = async (comment?: string) => {
    if (
      rating === undefined ||
      ratingSubmitted ||
      !onSubmitRating ||
      submitting
    )
      return;
    setSubmitting(true);
    try {
      await onSubmitRating(rating, comment);
      setRatingSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };
  const isClinic = appointment.consultationType === "Clinic Visit";
  const isHome = appointment.consultationType === "Home Visit";
  const completionCopy = isClinic
    ? "Your Clinic Visit is Completed"
    : isHome
      ? "Your Home Visit is Completed"
      : "Your online consultation is Completed";
  const HeroIcon = isClinic ? Stethoscope : isHome ? House : Monitor;

  return {
    insets,
    rating,
    setRating,
    ratingSubmitted,
    submitting,
    feedbackOpen,
    setFeedbackOpen,
    submitRating,
    isClinic,
    isHome,
    completionCopy,
    HeroIcon,
  };
}
