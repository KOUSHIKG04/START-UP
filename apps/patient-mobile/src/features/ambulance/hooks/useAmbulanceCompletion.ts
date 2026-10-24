import type { AmbulanceCompletionProps } from "../types/ambulance-completion";
import { useState } from "react";
import { useToastFeedback } from "@startup/mobile-ui";

export function useAmbulanceCompletion({
  onGoHome,
  booking,
  onSubmitRating,
}: AmbulanceCompletionProps) {
  const [rating, setRating] = useState<number>();
  const [ratingSubmitted, setRatingSubmitted] = useState(
    booking.review_rating !== null
  );
  const [ratingPending, setRatingPending] = useState(false);
  const [ratingError, setRatingError] = useState("");
  useToastFeedback({ error: ratingError });

  const handleRatingSubmit = async () => {
    if (rating === undefined || ratingSubmitted) return;
    setRatingPending(true);
    setRatingError("");
    try {
      await onSubmitRating(rating + 1);
      setRatingSubmitted(true);
    } catch (cause) {
      setRatingError(
        cause instanceof Error ? cause.message : "Could not submit rating."
      );
    } finally {
      setRatingPending(false);
    }
  };

  return {
    rating,
    setRating,
    ratingSubmitted,
    ratingPending,
    handleRatingSubmit,
  };
}
