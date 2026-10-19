"use client";
import { useVerificationFilters } from "../hooks/useVerificationFilters";

import type { VerificationFiltersProps } from "../types/verification-filters";

import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@startup/web-ui/components/ui/select";

export function VerificationFilters({
  initialType,
  initialStatus,
  initialQuery,
}: VerificationFiltersProps) {
  const { type, setType, status, setStatus, query, setQuery, submit } =
    useVerificationFilters({ initialType, initialStatus, initialQuery });
  return (
    <form
      onSubmit={submit}
      className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_180px_190px_auto]"
    >
      <Input
        aria-label="Search by name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name"
      />
      <Select value={type} onValueChange={setType}>
        <SelectTrigger aria-label="Entity type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="doctor">Doctors</SelectItem>
          <SelectItem value="facility">Hospitals & clinics</SelectItem>
          <SelectItem value="driver">Ambulance drivers</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="under_review">Under review</SelectItem>
          <SelectItem value="needs_resubmission">Needs resubmission</SelectItem>
          <SelectItem value="verified">Verified</SelectItem>
        </SelectContent>
      </Select>
      <Button>Filter</Button>
    </form>
  );
}
