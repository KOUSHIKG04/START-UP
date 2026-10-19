// Styling overrides preserve the established onboarding design using the shared Button.
import { styles } from "./OnboardingShell.styles";

export const onboardingButtonStyles = {
  button: styles.button,
  label: styles.buttonText,
  outline: styles.outline,
  outlineLabel: [styles.buttonText, styles.outlineText],
};
