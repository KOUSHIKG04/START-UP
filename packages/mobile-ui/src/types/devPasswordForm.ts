export type DevPasswordFormProps = {
  title: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp?: (email: string, password: string) => Promise<boolean>;
  configurationError?: string | null;
};
