import {
  filterSearchDirectory,
  findSearchItem,
  getDoctorResultsSearchRoute,
} from "../utils/homeSearch";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchPublicPractices } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import { Keyboard } from "react-native";
import { router } from "expo-router";
import {
  DEFAULT_SEARCH_CITY,
  INITIAL_RECENTS,
  type SearchItem,
} from "../utils/homeSearchConstants";
import type { HomeSearchOverlayProps } from "../types/home";
export function useHomeSearch({
  visible,
  onClose,
  selectedCity = DEFAULT_SEARCH_CITY,
}: HomeSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recents, setRecents] = useState<SearchItem[]>(() => [
    ...INITIAL_RECENTS,
  ]);

  const trimmedQuery = query.trim().toLowerCase();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const doctorQuery = useQuery({
    queryKey: ["patient-search-doctors", debouncedQuery],
    queryFn: () =>
      searchPublicPractices(supabase!, { query: debouncedQuery, limit: 20 }),
    enabled: visible && Boolean(supabase) && debouncedQuery.length >= 2,
  });
  const doctorResults: SearchItem[] = [
    ...new Map(
      (doctorQuery.data ?? [])
        .filter((item) => item.doctor_name.toLowerCase().includes(trimmedQuery))
        .map((item) => [
          item.doctor_id,
          {
            id: `doctor-${item.doctor_id}`,
            title: item.doctor_name,
            type: "Doctor" as const,
          },
        ])
    ).values(),
  ];
  const searchResults = [...doctorResults, ...filterSearchDirectory(query)];

  const handleClose = () => {
    Keyboard.dismiss();
    setQuery("");
    onClose();
  };

  const handleSelectItem = (item: SearchItem) => {
    // Update recent searches
    setRecents((prev) => {
      const filtered = prev.filter(
        (r) => r.title.toLowerCase() !== item.title.toLowerCase()
      );
      return [item, ...filtered];
    });

    handleClose();
    router.push(getDoctorResultsSearchRoute(item.title));
  };

  const handleRemoveRecent = (id: string) => {
    setRecents((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAll = () => {
    setRecents([]);
  };

  const handleSubmitEditing = () => {
    if (trimmedQuery) {
      const existing = findSearchItem(trimmedQuery);
      const itemToSelect: SearchItem = existing ?? {
        id: `custom-${Date.now()}`,
        title: query.trim(),
        type: "Symptom",
      };
      handleSelectItem(itemToSelect);
    }
  };

  return {
    query,
    setQuery,
    recents,
    trimmedQuery,
    searchResults,
    handleClose,
    handleSelectItem,
    handleRemoveRecent,
    handleClearAll,
    handleSubmitEditing,
  };
}
