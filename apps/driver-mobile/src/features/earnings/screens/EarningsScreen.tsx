import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ambulance } from "lucide-react-native";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
  PageHeader,
  palette,
  ui,
} from "../../../components/DriverUI";
import { useDriver } from "../../../stores/driver";
export function EarningsScreen({ history = false }: { history?: boolean }) {
  const trips = useDriver((s) => s.trips);
  const [period, setPeriod] = useState("Today");
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "This Week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "This Month") start.setDate(1);
  const filtered = trips.filter((t) => t.completedAt >= start.getTime());
  const total = filtered.reduce((sum, t) => sum + t.fare, 0);
  return (
    <View style={ui.screen}>
      <PageHeader
        title={history ? "My Trips" : "My Earnings"}
        subtitle={
          history
            ? "Your completed ambulance trips"
            : "Ambulance billing statements"
        }
      />
      <Body>
        <View
          style={{
            flexDirection: "row",
            padding: 4,
            backgroundColor: palette.soft,
            borderRadius: 12,
          }}
        >
          {["Today", "This Week", "This Month"].map((p) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: p === period }}
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                backgroundColor: p === period ? palette.primary : "transparent",
              }}
            >
              <Copy style={{ color: p === period ? "white" : palette.muted }}>
                {p}
              </Copy>
            </Pressable>
          ))}
        </View>
        {!history && (
          <>
            <Card>
              <Copy style={ui.caption}>{period.toUpperCase()} · TOTAL</Copy>
              <Copy style={{ fontSize: 32, lineHeight: 40, fontWeight: "700" }}>
                ₹{total.toLocaleString("en-IN")}
              </Copy>
            </Card>
            <Metrics
              items={[
                [`${filtered.length} completed`, "Trips"],
                ["—", "Rating"],
                [filtered.length ? "100%" : "—", "Acc. Rate"],
              ]}
            />
          </>
        )}
        <Heading>Trip History ({period})</Heading>
        {!filtered.length ? (
          <Card>
            <View style={[ui.center, { paddingVertical: 24 }]}>
              <Ambulance color={palette.primary} size={36} />
              <Heading>No completed trips yet</Heading>
              <Copy style={[ui.caption, { textAlign: "center" }]}>
                Completed trips and their earnings will appear here.
              </Copy>
            </View>
          </Card>
        ) : (
          [...filtered].reverse().map((t) => (
            <Card key={t.id}>
              <View style={ui.between}>
                <Heading>{t.patient}</Heading>
                <Copy style={ui.metricValue}>
                  ₹{t.fare.toLocaleString("en-IN")}
                </Copy>
              </View>
              <Copy style={ui.caption}>Sriramapura → Manipal Hospital</Copy>
              <View style={ui.between}>
                <Copy style={ui.caption}>
                  {t.distance} · {t.duration} · ALS
                </Copy>
                <Copy style={ui.caption}>
                  {new Date(t.completedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Copy>
              </View>
            </Card>
          ))
        )}
      </Body>
    </View>
  );
}
