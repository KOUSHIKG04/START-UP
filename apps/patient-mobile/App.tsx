import "./global.css";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Screen, Header, BottomNavBar, type NavItem } from "@startup/mobile-ui";
import { Home, Calendar, FileText, User } from "lucide-react-native";

const patientNavItems: NavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "appointments", label: "Appointments", icon: Calendar },
  { key: "records", label: "Records", icon: FileText },
  { key: "profile", label: "Profile", icon: User },
];

const patientScreenTitles: Record<string, string> = {
  appointments: "Appointments",
  records: "Records",
  profile: "Profile",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const screenTitle = patientScreenTitles[activeTab];

  return (
    <Screen
      edges={screenTitle ? [] : ["top"]}
      className="bg-patient-background p-0"
    >
      {screenTitle ? (
        <Header
          title={screenTitle}
          app="patient"
          onBackPress={() => setActiveTab("home")}
        />
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-lg pt-3xl pb-bottom-nav-clearance"
      />

      <BottomNavBar
        items={patientNavItems}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key)}
        showSOS
        onSOSPress={() => {
          setActiveTab("sos");
        }}
      />

      <StatusBar style={screenTitle ? "light" : "dark"} />
    </Screen>
  );
}
