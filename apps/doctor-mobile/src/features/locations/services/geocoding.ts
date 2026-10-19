import { Platform } from "react-native";
import * as Location from "expo-location";

export async function canGeocodeAddress() {
  if (Platform.OS !== "android") return true;
  const permission = await Location.requestForegroundPermissionsAsync();
  return permission.granted;
}
