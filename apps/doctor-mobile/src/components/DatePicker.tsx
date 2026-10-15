import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Calendar } from "lucide-react-native";
import { Dropdown, FadedScrollView } from "@startup/mobile-ui";
import { Heading, Label } from "./DoctorScreen";
import { palette, ui } from "./theme";

export function DatePicker({
  value,
  onChange,
  timeZone,
  disabled,
  minDate,
  label = "Select date",
}: {
  value: string;
  onChange: (day: string) => void;
  timeZone?: string;
  disabled: boolean;
  minDate?: string;
  label?: string;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const firstDay = minDate ?? today;
  const [selectedMonth, setMonth] = useState(
    value.slice(0, 7) || today.slice(0, 7)
  );
  const month =
    selectedMonth < firstDay.slice(0, 7) ? firstDay.slice(0, 7) : selectedMonth;
  const scroll = useRef<ScrollView>(null);
  const options = useMemo(() => {
    const [year, m] = today.split("-").map(Number);
    return Array.from({ length: 13 }, (_, i) => {
      const date = new Date(year, m - 1 + i, 1);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      };
    }).filter((option) => option.value >= firstDay.slice(0, 7));
  }, [today, firstDay]);
  const [year, m] = month.split("-").map(Number);
  const days = Array.from(
    { length: new Date(year, m, 0).getDate() },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`
  );
  const lastDay = new Date(`${today}T12:00:00Z`);
  lastDay.setUTCFullYear(lastDay.getUTCFullYear() + 1);
  return (
    <View style={{ gap: 12 }}>
      <View style={ui.between}>
        <Heading style={{ fontSize: 16 }}>{label}</Heading>
        <Dropdown
          theme="doctor"
          accessibilityLabel={`${label} month`}
          leftIcon={<Calendar size={18} color={palette.primary} />}
          options={options}
          value={month}
          disabled={disabled}
          containerStyle={{ width: 180, maxWidth: "65%" }}
          onValueChange={(next) => {
            setMonth(next);
            onChange(next === firstDay.slice(0, 7) ? firstDay : `${next}-01`);
          }}
        />
      </View>
      <FadedScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        onContentSizeChange={() => {
          const i = days.indexOf(value || today);
          scroll.current?.scrollTo({
            x: Math.max(0, i * 62 - 110),
            animated: false,
          });
        }}
      >
        {days.map((day, i) => {
          const selected = day === value;
          const closed =
            disabled ||
            day < firstDay ||
            day > lastDay.toISOString().slice(0, 10);
          return (
            <Pressable
              key={day}
              accessibilityRole="radio"
              accessibilityLabel={day}
              accessibilityState={{ checked: selected, disabled: closed }}
              disabled={closed}
              onPress={() => onChange(day)}
              style={{
                width: 54,
                height: 64,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: selected ? palette.dark : "#D2D2D2",
                backgroundColor: selected ? palette.dark : palette.white,
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                opacity: closed ? 0.4 : 1,
              }}
            >
              <Heading
                style={{
                  fontSize: 17,
                  color: selected ? palette.white : palette.text,
                }}
              >
                {i + 1}
              </Heading>
              <Label
                style={{
                  fontSize: 11,
                  color: selected ? palette.white : palette.muted,
                }}
              >
                {new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                })}
              </Label>
            </Pressable>
          );
        })}
      </FadedScrollView>
    </View>
  );
}
