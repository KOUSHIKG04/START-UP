"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
}: {
  initialType: string;
  initialStatus: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [query, setQuery] = useState(initialQuery);
  
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (type !== "all") params.set("type", type);

    if (status !== "all") params.set("status", status);
    
    if (query.trim()) params.set("q", query.trim());
    
    router.push(`/verification${params.size ? `?${params}` : ""}`);
  }
  
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
