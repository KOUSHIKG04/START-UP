export type DevEmailAuthFormProps = {
  confirmationPending: boolean;
  onBackToSignIn: () => void;
  emailMode: "signin" | "signup";
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  busy: boolean;
  onSubmit: () => void;
  onSwitchEmailMode: () => void;
};
