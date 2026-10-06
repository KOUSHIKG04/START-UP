import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ambulance } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { listMyDriverTrips } from "@startup/data-access";
import { useToastFeedback } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
  PageHeader,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
export function EarningsScreen({ history = false }: { history?: boolean }) {
  const { profile } = useMobileSession();
  
  const trips = useQuery({
    queryKey: ["my-driver-trips", profile?.driver?.id],
    queryFn: () => listMyDriverTrips(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
    refetchInterval: 15000,
  });
  useToastFeedback({ error: trips.isError ? "Could not load trip history." : "" });
  
  const [period, setPeriod] = useState("Today");
  
  const now = new Date();
  
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (period === "This Week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  
  if (period === "This Month") start.setDate(1);
  const filtered =
    trips.data?.filter(
      (t) =>
        t.status === "completed" &&
        t.completed_at &&
        new Date(t.completed_at).getTime() >= start.getTime()
    ) ?? [];
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
                —
              </Copy>
            </Card>
            <Metrics
              items={[
                [`${filtered.length} completed`, "Trips"],
                ["—", "Rating"],
                ["—", "Acc. Rate"],
              ]}
            />
          </>
        )}
        <Heading>Trip History ({period})</Heading>
        {trips.isLoading ? <Copy>Loading trips…</Copy> : null}
        {!filtered.length ? (
          <Card>
            <View style={[ui.center, { paddingVertical: 24 }]}>
              <Ambulance color={palette.primary} size={36} />
              <Heading>No completed trips yet</Heading>
              <Copy style={[ui.caption, { textAlign: "center" }]}>
                Completed trips will appear here. Billing is not connected yet.
              </Copy>
            </View>
          </Card>
        ) : (
          [...filtered].reverse().map((t) => (
            <Card key={t.id}>
              <View style={ui.between}>
                <Heading>{t.patient_name_snapshot ?? "Patient"}</Heading>
                <Copy style={ui.metricValue}>—</Copy>
              </View>
              <Copy style={ui.caption}>
                {t.pickup_address ?? "Pickup"} →{" "}
                {t.destination_address ?? "Destination"}
              </Copy>
              <View style={ui.between}>
                <Copy style={ui.caption}>
                  {t.public_code} · {t.status.replaceAll("_", " ")}
                </Copy>
                <Copy style={ui.caption}>
                  {new Date(t.completed_at!).toLocaleTimeString([], {
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
