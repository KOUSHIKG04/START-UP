import { earningsPeriods } from "../utils/earningsConstants";
import { useDriverEarnings } from "../hooks/useDriverEarnings";
import type { EarningsScreenProps } from "../types/earnings-screen";

import { Pressable, View } from "react-native";
import { Ambulance } from "lucide-react-native";

import { Skeleton } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
  PageHeader,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";

export function EarningsScreen({ history = false }: EarningsScreenProps) {
  const { trips, period, setPeriod, filtered } = useDriverEarnings({ history });
  return (
    <View style={ui.screen}>
      <PageHeader title={history ? "My Trips" : "My Earnings"} />
      <Body>
        <View
          style={{
            flexDirection: "row",
            padding: 4,
            backgroundColor: palette.soft,
            borderRadius: 12,
          }}
        >
          {earningsPeriods.map((p) => (
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
        {trips.isLoading ? (
          <Skeleton theme="driver" height={92} radius={12} />
        ) : null}
        {!trips.isLoading && !filtered.length ? (
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
