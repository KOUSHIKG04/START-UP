export type OnboardingButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  disabled?: boolean;
  loading?: boolean;
};
