"use client";
import { appointmentStatuses } from "../utils/appointmentsConstants";

import { useAppointments } from "../hooks/useAppointments";

import type { AppointmentsScreenProps } from "../types/appointmentsScreen";

import { Search, Calendar, ChevronDown, ScanLine } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";

import { AppointmentsSummaryCards } from "../components/AppointmentsSummaryCards";
import { AppointmentsTable } from "../components/AppointmentsTable";
import { NewAppointmentDialog } from "../components/NewAppointmentDialog";

export default function AppointmentsScreen({
  appointments,
  loadError,
}: AppointmentsScreenProps) {
  const {
    pending,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    now,
    showScanner,
    setShowScanner,
    checkinToken,
    setCheckinToken,
    videoRef,
    setCurrentPage,
    filterPeriod,
    setFilterPeriod,
    displayedAppointments,
    appointmentsSummary,
    appointmentsDateLabel,
    bookingDateLabel,
    pageRows,
    appointmentsPagination,
    act,
    stopCamera,
    submitCheckin,
    startCamera,
  } = useAppointments({ appointments, loadError });
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 815:56) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Appointments
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stopCamera();
              setShowScanner((current) => !current);
            }}
          >
            <ScanLine className="size-4" /> Scan patient QR
          </Button>
          {/* Search Box */}
          <div className="border-border bg-card flex w-56 items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              type="text"
              aria-label="Search patient, doctor..."
              placeholder="Search patient, doctor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background w-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>

          {/* Date Badge */}
          <div className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <Calendar className="text-muted-foreground size-4 shrink-0" />
            <span
              suppressHydrationWarning
              className="text-muted-foreground text-sm font-semibold whitespace-nowrap"
            >
              {appointmentsDateLabel}
            </span>
          </div>

          {/* Status Dropdown */}
          <div className="border-border bg-card flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <span className="text-foreground text-sm">Status:</span>
            <select
              aria-label="Filter appointment status"
              className="focus-visible:ring-primary focus-visible:ring-offset-background bg-transparent text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {appointmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted-foreground size-3.5" />
          </div>

          <NewAppointmentDialog
            onCreated={() => {
              setFilterPeriod("All");
              setStatusFilter("All");
              setSearch("");
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {showScanner ? (
        <section
          aria-label="Patient check-in"
          className="border-border bg-card rounded-lg border p-4"
        >
          <h2 className="text-foreground text-base font-semibold">
            Patient check-in
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Scan the QR shown in the Patient App for an app-booked clinic visit.
          </p>
          <video
            ref={videoRef}
            muted
            playsInline
            className="bg-foreground mt-3 max-h-64 w-full max-w-sm rounded-lg"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void startCamera()}
              disabled={pending}
            >
              Start camera
            </Button>
            <input
              aria-label="Check-in QR value"
              value={checkinToken}
              onChange={(event) => setCheckinToken(event.target.value)}
              placeholder="Paste QR value if camera is unavailable"
              className="border-border min-w-64 rounded-lg border px-3 py-2 text-sm"
            />
            <Button
              type="button"
              onClick={() => submitCheckin(checkinToken)}
              disabled={pending || !checkinToken.trim()}
            >
              Check in
            </Button>
          </div>
        </section>
      ) : null}

      {/* Summary Stat Cards Row */}
      <AppointmentsSummaryCards summary={appointmentsSummary} />

      {/* Recent Bookings Card & Table */}
      <AppointmentsTable
        now={now}
        pageRows={pageRows}
        pending={pending}
        onAct={act}
        pagination={appointmentsPagination}
        onPageChange={setCurrentPage}
        displayedCount={displayedAppointments.length}
        filterPeriod={filterPeriod}
        onFilterPeriodChange={setFilterPeriod}
        bookingDateLabel={bookingDateLabel}
      />
    </div>
  );
}
