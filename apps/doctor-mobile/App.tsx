import "./global.css";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-doctor-surface">
      <Text className="text-app-heading text-doctor-text">Doctor app</Text>
      <StatusBar style="auto" />
    </View>
  );
}
