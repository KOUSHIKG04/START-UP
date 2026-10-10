const { expo } = require("./app.json");

const variant = process.env.APP_VARIANT ?? "development";

if (!["development", "preview", "production"].includes(variant)) {
  throw new Error(`Unsupported APP_VARIANT: ${variant}`);
}

const suffix =
  variant === "production"
    ? ""
    : variant === "development"
      ? ".dev"
      : ".preview";

const label =
  variant === "production"
    ? ""
    : variant === "development"
      ? " (Dev)"
      : " (Preview)";

const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

module.exports = {
  ...expo,
  owner: "koushig07",
  name: `${expo.name}${label}`,
  scheme: `${expo.scheme}${suffix.replace(".", "-")}`,
  extra: {
    ...expo.extra,
    googleMapsConfigured: Boolean(googleMapsApiKey),
    eas: {
      ...expo.extra?.eas,
      projectId: "97f47d14-9a62-4e14-b149-088cf17fafe8",
    },
  },
  android: {
    ...expo.android,
    package: `com.clinzo.doctor${suffix}`,
    ...(googleMapsApiKey ? { config: { ...expo.android?.config, googleMaps: { apiKey: googleMapsApiKey } } } : {}),
  },
  ios: { ...expo.ios, bundleIdentifier: `com.clinzo.doctor${suffix}` },
};
