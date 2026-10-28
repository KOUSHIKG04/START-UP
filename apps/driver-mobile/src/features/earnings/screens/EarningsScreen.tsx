import { earningsPeriods } from "../utils/earningsConstants";
import { useDriverEarnings } from "../hooks/useDriverEarnings";
import type { EarningsScreenProps } from "../types/earnings-screen";

import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ambulance } from "lucide-react-native";

import {
  Button,
  Skeleton,
  PaymentSummary,
  PaymentRow,
  PaymentReference,
  PaymentDivider,
} from "@startup/mobile-ui";
import { appointmentMoney, payoutStatusLabel } from "@startup/contracts";
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
  const {
    refresh,
    trips,
    period,
    setPeriod,
    filtered,
    payouts,
    payoutEntries,
  } = useDriverEarnings({ history });
  return (
    <View style={ui.screen}>
      <PageHeader title={history ? "My Trips" : "My Earnings"} />
      <Body onRefresh={refresh}>
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
            <Heading>Provider payments</Heading>
            <Copy style={ui.caption}>
              Payments are made to the linked legal recipient, which may be your
              ambulance operator. Amounts below are from the loaded records.
            </Copy>
            {payouts.isLoading ? (
              <Skeleton theme="driver" height={92} radius={12} />
            ) : null}
            {payouts.isError ? (
              <Button
                theme="driver"
                label="Retry payment records"
                variant="outline"
                onPress={() => void payouts.refetch()}
              />
            ) : null}
            {!payouts.isLoading && !payouts.isError && !payoutEntries.length ? (
              <Copy>No payment records for this period yet.</Copy>
            ) : null}
            {payoutEntries.map((entry) => (
              <PaymentSummary
                key={entry.id}
                title={entry.recipient_name ?? "Recipient setup pending"}
                theme="driver"
                testMode={entry.mode === "test"}
                amountLabel="Provider share"
                amount={
                  entry.provider_minor === null
                    ? "Not configured"
                    : appointmentMoney(entry.provider_minor)
                }
                status={payoutStatusLabel(entry)}
              >
                <Copy>Booking {entry.resource_id.slice(-8)}</Copy>
                <PaymentRow
                  label="Collected"
                  value={appointmentMoney(entry.gross_minor)}
                />
                <PaymentRow
                  label="Refunded"
                  value={appointmentMoney(entry.refunded_minor)}
                />
                <PaymentDivider />
                <PaymentRow
                  label="Company fee"
                  value={
                    entry.company_minor === null
                      ? "Not configured"
                      : appointmentMoney(entry.company_minor)
                  }
                />
                {entry.method !== "gateway" ? (
                  <PaymentRow
                    label="Company fee due"
                    value={
                      entry.cash_due_minor === null
                        ? "Not configured"
                        : appointmentMoney(entry.cash_due_minor)
                    }
                  />
                ) : null}
                {entry.transfer_id ? (
                  <PaymentReference
                    label="Transfer reference"
                    value={entry.transfer_id}
                  />
                ) : null}
              </PaymentSummary>
            ))}
            {payouts.hasNextPage ? (
              <Button
                theme="driver"
                label="Load older payment records"
                variant="outline"
                loading={payouts.isFetchingNextPage}
                onPress={() => void payouts.fetchNextPage()}
              />
            ) : null}
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
                Completed trips will appear here.
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
              <Button
                theme="driver"
                label="View fare & payment"
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: "/trip-payment/[id]",
                    params: { id: t.booking_id },
                  })
                }
              />
            </Card>
          ))
        )}
      </Body>
    </View>
  );
}
