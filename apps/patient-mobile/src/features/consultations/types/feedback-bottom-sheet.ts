export type FeedbackBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
};
