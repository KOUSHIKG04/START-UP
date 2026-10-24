"use client";

import type { AppointmentsScreenProps } from "../types/appointmentsScreen";
import * as React from "react";
import type { IScannerControls } from "@zxing/browser";
import { useRouter } from "next/navigation";
import type { ClinicAppointment } from "@startup/contracts";
import { appointmentRecoveryView } from "@startup/contracts";
import {
  changePortalAppointment,
  redeemPortalCheckinToken,
} from "../server/actions";
import { toast } from "@startup/web-ui/components/ui/toast";
import type { AppointmentPeriod } from "../types/appointments";
import {
  defaultAppointmentPeriod,
  appointmentsDateFormatter,
} from "../utils/appointmentsConstants";

export function useAppointments({
  appointments,
  loadError,
}: AppointmentsScreenProps) {
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
    if (loadError)
      toast.add({
        title: "Could not load appointments",
        description: loadError,
        type: "error",
      });
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
        statusFilter === "All" ||
        item.status === statusFilter.toLowerCase() ||
        appointmentRecoveryView(item, now).staffStatus === statusFilter;

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
  }, [appointments, filterPeriod, search, statusFilter, now]);

  const appointmentsSummary = React.useMemo(
    () => ({
      total: appointments.length,
      confirmed: appointments.filter((item) => item.status === "confirmed")
        .length,
      pending: appointments.filter(
        (item) =>
          item.status === "pending" &&
          new Date(item.starts_at).getTime() > now &&
          (item.request_expires_at === null ||
            new Date(item.request_expires_at).getTime() > now)
      ).length,
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

  function act(
    item: ClinicAppointment,
    action:
      | "approve"
      | "reject"
      | "check_in"
      | "call"
      | "hold"
      | "resume"
      | "no_show"
      | "cancel"
  ) {
    const note =
      action === "reject" || action === "hold"
        ? window.prompt(
            action === "hold"
              ? "Reason for holding this patient"
              : "Reason for rejecting this appointment"
          )
        : null;
    if ((action === "reject" || action === "hold") && !note?.trim()) return;
    startTransition(async () => {
      try {
        const result = await changePortalAppointment({
          appointmentId: item.id,
          expectedVersion: Number(item.row_version),
          action,
          note,
        });
        if (result.error)
          toast.add({
            title: "Could not update appointment",
            description: result.error,
            type: "error",
          });
        else {
          toast.add({ title: "Appointment updated", type: "success" });
          router.refresh();
        }
      } catch {
        toast.add({
          title: "Could not update appointment",
          description: "Check your connection and try again.",
          type: "error",
        });
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
        if (result.error)
          toast.add({
            title: "Could not check in patient",
            description: result.error,
            type: "error",
          });
        else {
          toast.add({
            title: "Patient checked in",
            description: "The doctor can now call them from the queue.",
            type: "success",
          });
          setCheckinToken("");
          setShowScanner(false);
          router.refresh();
        }
      } catch {
        toast.add({
          title: "Could not check in patient",
          description: "Check your connection and try again.",
          type: "error",
        });
      }
    });
  }

  async function startCamera() {
    if (scanningRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.add({
        title: "Camera scanning unavailable",
        description: "Paste the QR value below.",
        type: "warning",
      });
      return;
    }
    scanningRef.current = true;
    try {
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
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
      toast.add({
        title: "Camera access unavailable",
        description: "Paste the QR value below.",
        type: "warning",
      });
    }
  }

  return {
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
  };
}
