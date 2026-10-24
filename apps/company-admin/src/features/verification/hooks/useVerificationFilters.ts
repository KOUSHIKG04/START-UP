"use client";

import type { VerificationFiltersProps } from "../types/verification-filters";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function useVerificationFilters({
  initialType,
  initialStatus,
  initialQuery,
}: VerificationFiltersProps) {
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

  return { type, setType, status, setStatus, query, setQuery, submit };
}
