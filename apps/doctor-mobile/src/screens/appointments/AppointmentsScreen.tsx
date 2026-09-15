import { useState } from "react";
import { ScrollView, View, Pressable } from "react-native";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { appointments, demoDate, modeLabels } from "../../data/demo";
import { PatientCard } from "../../components/PatientCard";
import {
  Choice,
  DoctorScreen,
  Heading,
  IconButton,
  Label,
  palette,
  Panel,
  ui,
} from "../../components/DoctorScreen";
import type { VisitMode } from "../../types/doctor";
export function AppointmentsScreen() {
  const [date, setDate] = useState(demoDate);
  const [week, setWeek] = useState(0);
  const [filter, setFilter] = useState<"all" | VisitMode>("all");
  const days = Array.from({ length: 7 }, (_, index) => {
    const value = new Date(2026, 7, 2 + week * 7 + index);
    return {
      key: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
      day: value.getDate(),
      label: value.toLocaleDateString("en-US", { weekday: "short" }),
      month: value.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    };
  });
  const visible = appointments.filter(
    (a) =>
      a.date === date &&
      (filter === "all" || a.mode === filter) &&
      a.id !== "online-akash"
  );
  return (
    <DoctorScreen title="Appointment">
      <View style={ui.between}>
        <Heading style={{ fontSize: 18 }}>{days[0].month}</Heading>
        <View style={ui.row}>
          <IconButton
            label="Previous week"
            onPress={() => {
              setWeek(week - 1);
              setDate("");
            }}
          >
            <ChevronLeft size={20} color={palette.primary} />
          </IconButton>
          <IconButton
            label="Return to demo date, 5 August"
            onPress={() => {
              setWeek(0);
              setDate(demoDate);
            }}
          >
            <Calendar size={20} color={palette.primary} />
          </IconButton>
          <IconButton
            label="Next week"
            onPress={() => {
              setWeek(week + 1);
              setDate("");
            }}
          >
            <ChevronRight size={20} color={palette.primary} />
          </IconButton>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {days.map((day) => (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityLabel={`${day.day} ${day.month}`}
            accessibilityState={{ selected: date === day.key }}
            onPress={() => setDate(day.key)}
            style={{
              width: 46,
              height: 64,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: date === day.key ? palette.dark : "#F0F2F5",
            }}
          >
            <Heading
              style={{
                fontSize: 19,
                color: date === day.key ? "white" : palette.text,
              }}
            >
              {day.day}
            </Heading>
            <Label
              style={{
                fontSize: 11,
                color: date === day.key ? "white" : palette.muted,
              }}
            >
              {day.label}
            </Label>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[ui.wrap, { justifyContent: "center", gap: 6 }]}>
        {(["all", "clinic", "online", "home"] as const).map((mode) => (
          <Choice
            key={mode}
            label={mode === "all" ? "All" : modeLabels[mode]}
            selected={filter === mode}
            onPress={() => setFilter(mode)}
          />
        ))}
      </View>
      {visible.map((appointment) => (
        <PatientCard key={appointment.id} appointment={appointment} />
      ))}
      {!visible.length && (
        <Panel>
          <Heading>{date ? "No appointments" : "Select a day"}</Heading>
          <Label muted>
            {date
              ? "No appointments match this day and visit type."
              : "Choose a date above to see appointments."}
          </Label>
        </Panel>
      )}
      {filter === "home" && week === 0 && date !== "2026-08-06" && (
        <Choice
          label="View home visit on 6 August"
          selected={false}
          onPress={() => setDate("2026-08-06")}
        />
      )}
    </DoctorScreen>
  );
}
