import "./global.css";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-driver-surface">
      <Text className="text-app-heading text-driver-text">Driver app</Text>
      <StatusBar style="auto" />
    </View>
  );
}
