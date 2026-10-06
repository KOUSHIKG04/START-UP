"use client";

import * as React from "react";
import type { IScannerControls } from "@zxing/browser";
import { useRouter } from "next/navigation";
import type { ClinicAppointment } from "@startup/contracts";
import { changePortalAppointment, redeemPortalCheckinToken } from "../server/actions";
import { Search, Calendar, ChevronDown, Plus, ScanLine } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import { toast } from "@startup/web-ui/components/ui/toast";

import type { AppointmentPeriod } from "../types/appointments";
import { defaultAppointmentPeriod, appointmentsDateFormatter } from "../utils/appointmentsConstants";
import { AppointmentsSummaryCards } from "../components/AppointmentsSummaryCards";
import { AppointmentsTable } from "../components/AppointmentsTable";

export default function AppointmentsScreen({
  appointments,
  loadError,
}: {
  appointments: ClinicAppointment[];
  loadError?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [now, setNow] = React.useState(() => Date.now());
  const [showScanner, setShowScanner] = React.useState(false);
  const [checkinToken, setCheckinToken] = React.useState("");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scannerControlsRef = React.useRef<IScannerControls | null>(null);
  const scanningRef = React.useRef(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [filterPeriod, setFilterPeriod] = React.useState<AppointmentPeriod>(
    defaultAppointmentPeriod
  );
  React.useEffect(() => {
    if (loadError) toast.add({ title: "Could not load appointments", description: loadError, type: "error" });
  }, [loadError]);
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const displayedAppointments = React.useMemo(() => {
    const today = new Date();
    
    return appointments.filter((item) => {
      const start = new Date(item.starts_at);
      const dayOffset = Math.floor(
        (Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) -
          Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
          86400000
      );

      const periodMatch =
        filterPeriod === "All" ||
        (filterPeriod === "Today" && dayOffset === 0) ||
        (filterPeriod === "Tomorrow" && dayOffset === 1) ||
        (filterPeriod === "This Week" && dayOffset >= 0 && dayOffset < 7);
      
      const statusMatch =
        statusFilter === "All" || item.status === statusFilter.toLowerCase();
      
      const needle = search.trim().toLowerCase();
      
      return (
        periodMatch &&
        statusMatch &&
        (!needle ||
          [
            item.patient_name,
            item.patient_public_code,
            item.doctor_name,
            item.service_name,
            item.public_code,
          ].some((value) => value.toLowerCase().includes(needle)))
      );
    });
  }, [appointments, filterPeriod, search, statusFilter]);

  const appointmentsSummary = React.useMemo(
    () => ({
      total: appointments.length,
      confirmed: appointments.filter((item) => item.status === "confirmed")
        .length,
      pending: appointments.filter((item) => item.status === "pending" &&
        new Date(item.starts_at).getTime() > now &&
        (item.request_expires_at === null || new Date(item.request_expires_at).getTime() > now)).length,
      cancelled: appointments.filter((item) => item.status === "cancelled")
        .length,
    }),
    [appointments, now]
  );

  const appointmentsDateLabel = appointmentsDateFormatter.format(new Date());
  const bookingDateLabel = `Today, ${appointmentsDateLabel}`;
  const pageSize = 10;
  const lastPage = Math.max(
    1,
    Math.ceil(displayedAppointments.length / pageSize)
  );
  const page = Math.min(currentPage, lastPage);
  const pageStart = (page - 1) * pageSize;
  const pageRows = displayedAppointments.slice(pageStart, pageStart + pageSize);
  const nextPages = [page + 1, page + 2].filter((value) => value <= lastPage);
  const appointmentsPagination = {
    range: displayedAppointments.length
      ? `${pageStart + 1}-${pageStart + pageRows.length}`
      : "0",
    total: displayedAppointments.length,
    currentPage: page,
    nextPages,
    lastPage,
  };

  function act(item: ClinicAppointment, action: "approve" | "reject") {
    const note =
      action === "reject"
        ? window.prompt("Reason for rejecting this appointment")
        : null;
    if (action === "reject" && !note?.trim()) return;
    startTransition(async () => {
      try {
        const result = await changePortalAppointment({
          appointmentId: item.id,
          expectedVersion: Number(item.row_version),
          action,
          note,
        });
        if (result.error) toast.add({ title: "Could not update appointment", description: result.error, type: "error" });
        else { toast.add({ title: "Appointment updated", type: "success" }); router.refresh(); }
      } catch {
        toast.add({ title: "Could not update appointment", description: "Check your connection and try again.", type: "error" });
      }
    });
  }

  const stopCamera = React.useCallback(() => {
    scanningRef.current = false;
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  function submitCheckin(token: string) {
    const value = token.trim();
    if (!value) return;
    stopCamera();
    startTransition(async () => {
      try {
        const result = await redeemPortalCheckinToken(value);
        if (result.error) toast.add({ title: "Could not check in patient", description: result.error, type: "error" });
        else {
          toast.add({ title: "Patient checked in", description: "The doctor can now call them from the queue.", type: "success" });
          setCheckinToken("");
          setShowScanner(false);
          router.refresh();
        }
      } catch {
        toast.add({ title: "Could not check in patient", description: "Check your connection and try again.", type: "error" });
      }
    });
  }

  async function startCamera() {
    if (scanningRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.add({ title: "Camera scanning unavailable", description: "Paste the QR value below.", type: "warning" });
      return;
    }
    scanningRef.current = true;
    try {
      const video = videoRef.current;
      if (!video) { stopCamera(); return; }
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (!scanningRef.current) return;
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        video,
        (result, _error, activeControls) => {
          if (result && scanningRef.current) {
            activeControls.stop();
            submitCheckin(result.getText());
          }
        }
      );
      if (!scanningRef.current) controls.stop();
      else scannerControlsRef.current = controls;
    } catch {
      stopCamera();
      toast.add({ title: "Camera access unavailable", description: "Paste the QR value below.", type: "warning" });
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 815:56) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#0f172a]">
            Appointments
          </h1>
          <p className="mt-0.5 text-[13px] text-[#475569]">
            Manage and schedule patient visits across departments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => { stopCamera(); setShowScanner((current) => !current); }}>
            <ScanLine className="size-4" /> Scan patient QR
          </Button>
          {/* Search Box */}
          <div className="flex w-56 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              type="text"
              aria-label="Search patient, doctor..."
              placeholder="Search patient, doctor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none"
            />
          </div>

          {/* Date Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Calendar className="size-4 shrink-0 text-[#475569]" />
            <span
              suppressHydrationWarning
              className="text-[13px] font-semibold whitespace-nowrap text-[#475569]"
            >
              {appointmentsDateLabel}
            </span>
          </div>

          {/* Status Dropdown */}
          <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <span className="text-[13px] text-[#0f172a]">Status:</span>
            <select
              aria-label="Filter appointment status"
              className="bg-transparent text-[13px] font-bold outline-none"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {[
                "All",
                "Pending",
                "Confirmed",
                "Rejected",
                "Cancelled",
                "Completed",
                "No_show",
                "In_consultation",
              ].map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <ChevronDown className="size-3.5 text-[#475569]" />
          </div>

          {/* New Appointment Button */}
          <Button className="flex items-center gap-1.5 rounded-lg bg-[#07595d] px-4 py-2 text-[13px] font-bold text-white shadow-xs transition-colors hover:bg-[#064e52]">
            <Plus className="size-4 stroke-[2.5]" />
            <span>New Appointment</span>
          </Button>
        </div>
      </div>

      {showScanner ? <section aria-label="Patient check-in" className="rounded-lg border border-[#e2e8f0] bg-white p-4">
        <h2 className="text-[16px] font-semibold text-[#0f172a]">Patient check-in</h2>
        <p className="mt-1 text-[13px] text-[#475569]">Scan the QR shown in the Patient App for an app-booked clinic visit.</p>
        <video ref={videoRef} muted playsInline className="mt-3 max-h-64 w-full max-w-sm rounded-lg bg-[#0f172a]" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void startCamera()} disabled={pending}>Start camera</Button>
          <input aria-label="Check-in QR value" value={checkinToken} onChange={(event) => setCheckinToken(event.target.value)} placeholder="Paste QR value if camera is unavailable" className="min-w-64 rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px]" />
          <Button type="button" onClick={() => submitCheckin(checkinToken)} disabled={pending || !checkinToken.trim()}>Check in</Button>
        </div>
      </section> : null}

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
