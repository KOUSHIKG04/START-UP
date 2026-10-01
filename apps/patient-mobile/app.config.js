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
  extra: { ...expo.extra, googleMapsConfigured: Boolean(googleMapsApiKey), eas: { ...expo.extra?.eas, projectId: "df927f71-39e6-4c29-ac7d-8ae6bf85b3dc" } },
  android: {
    ...expo.android,
    package: `com.clinzo.patient${suffix}`,
    ...(googleMapsApiKey ? { config: { ...expo.android?.config, googleMaps: { apiKey: googleMapsApiKey } } } : {}),
  },
  ios: { ...expo.ios, bundleIdentifier: `com.clinzo.patient${suffix}` },
};
