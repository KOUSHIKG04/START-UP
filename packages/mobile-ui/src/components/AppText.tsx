import { Text, type TextProps } from "react-native";
import { cn } from "cn";

const variantClassNames = {
  title: "text-app-title text-content",
  heading: "text-app-heading text-content",
  body: "text-app-body text-content",
  caption: "text-app-caption text-content-secondary",
} as const;

export type AppTextProps = TextProps & {
  variant?: "title" | "heading" | "body" | "caption";
  className?: string;
};

export function AppText({
  variant = "body",
  style,
  className,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      className={cn(variantClassNames[variant], className)}
      style={style}
    />
  );
}
