import { useCallback, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useQuery } from "@tanstack/react-query";
import type { PublicPractice } from "@startup/contracts";
import { searchPublicPractices } from "@startup/data-access";
import { supabase, useMobileSession } from "../../../services/supabase";
import {
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COLLAPSE_DISTANCE,
  getHeaderAnimationStyles,
} from "../../../utils/headerConstants";
import {
  COLLAPSED_HEADER_H,
  EXPANDED_HEADER_HEIGHT,
  SEARCH_END_TOP_OFFSET,
  SEARCH_OVERLAP,
  categories,
} from "../utils/findDoctorConstants";
import type { FindDoctorScreenProps } from "../types/find-doctor";

export function useFindDoctor({
  consultationType,
  onBackPress,
}: FindDoctorScreenProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchPlaceholder, setShowSearchPlaceholder] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const recentSearchesRef = useRef<string[]>([]);
  const recentSearchVersion = useRef(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);
  const { session } = useMobileSession();
  const storageKey = session?.user.id
    ? `doctor-searches-${session.user.id}`
    : undefined;

  useEffect(() => {
    const timer = setInterval(
      () => setShowSearchPlaceholder((current) => !current),
      3000
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const version = ++recentSearchVersion.current;
    recentSearchesRef.current = [];
    setRecentSearches([]);
    if (!storageKey || Platform.OS === "web") return;
    let active = true;
    void SecureStore.getItemAsync(storageKey)
      .then((saved) => {
        if (!active || !saved || recentSearchVersion.current !== version)
          return;
        const values: unknown = JSON.parse(saved);
        if (Array.isArray(values)) {
          const recents = values
            .filter((value): value is string => typeof value === "string")
            .slice(0, 5);
          recentSearchesRef.current = recents;
          setRecentSearches(recents);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storageKey]);

  const rememberSearch = (term: string) => {
    const value = term.trim();
    if (!value) return;
    recentSearchVersion.current += 1;
    const next = [
      value,
      ...recentSearchesRef.current.filter(
        (item) => item.toLowerCase() !== value.toLowerCase()
      ),
    ].slice(0, 5);
    recentSearchesRef.current = next;
    setRecentSearches(next);
    if (storageKey && Platform.OS !== "web") {
      void SecureStore.setItemAsync(storageKey, JSON.stringify(next)).catch(
        () => {}
      );
    }
  };

  const clearRecentSearches = () => {
    recentSearchVersion.current += 1;
    recentSearchesRef.current = [];
    setRecentSearches([]);
    if (storageKey && Platform.OS !== "web") {
      void SecureStore.deleteItemAsync(storageKey).catch(() => {});
    }
  };

  const { top: topInset } = useSafeAreaInsets();
  const scrollYRef = useRef<Animated.Value | null>(null);
  if (scrollYRef.current === null) {
    scrollYRef.current = new Animated.Value(0);
  }
  const scrollY = scrollYRef.current;
  const searchEndTop = topInset + SEARCH_END_TOP_OFFSET;
  const { collapsedHeight, expandedHeaderStyle, searchStyle } =
    getHeaderAnimationStyles(scrollY, topInset, {
      expandedHeight: EXPANDED_HEADER_HEIGHT,
      searchOverlap: SEARCH_OVERLAP,
      collapsedHeight: COLLAPSED_HEADER_H,
      searchEndTop,
    });

  const handleOpenSearch = () => {
    if (isSearchActive) return;
    setIsSearchActive(true);
    Animated.timing(scrollY, {
      toValue: COLLAPSE_DISTANCE,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const handleCloseSearch = useCallback(() => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setIsSearchActive(false);
    setSearchQuery("");
    if (scrollYRef.current) {
      Animated.timing(scrollYRef.current, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  const handleBack = () => {
    if (isSearchActive) {
      handleCloseSearch();
      return;
    }
    if (onBackPress) {
      onBackPress();
      return;
    }
    router.back();
  };

  useEffect(() => {
    if (!isSearchActive) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleCloseSearch();
      return true;
    });
    return () => sub.remove();
  }, [isSearchActive, handleCloseSearch]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const doctorQuery = useQuery({
    queryKey: ["find-doctor-suggestions", debouncedQuery],
    queryFn: () =>
      searchPublicPractices(supabase!, { query: debouncedQuery, limit: 20 }),
    enabled: isSearchActive && Boolean(supabase) && debouncedQuery.length >= 2,
  });
  const doctorMatches = [
    ...new Map<string, { id: string; name: string }>(
      ((doctorQuery.data ?? []) as PublicPractice[])
        .filter((item) => item.doctor_name.toLowerCase().includes(trimmedQuery))
        .map((item): [string, { id: string; name: string }] => [
          item.doctor_id,
          { id: item.doctor_id, name: item.doctor_name },
        ])
    ).values(),
  ];
  const filteredCategories = trimmedQuery
    ? categories.filter(
        (c) =>
          c.label.toLowerCase().includes(trimmedQuery) ||
          c.key.toLowerCase().includes(trimmedQuery)
      )
    : categories;

  const searchActivePaddingTop = collapsedHeight + 8;

  return {
    refresh:
      isSearchActive && debouncedQuery.length >= 2 && supabase
        ? () => doctorQuery.refetch({ throwOnError: true })
        : undefined,
    isSearchActive,
    searchQuery,
    setSearchQuery,
    searchPlaceholder: showSearchPlaceholder
      ? "Search by symptoms or speciality"
      : "Describe what you're feeling...",
    recentSearches,
    rememberSearch,
    clearRecentSearches,
    searchInputRef,
    scrollY,
    collapsedHeight,
    expandedHeaderStyle,
    searchStyle,
    handleOpenSearch,
    handleCloseSearch,
    handleBack,
    doctorMatches,
    filteredCategories,
    searchActivePaddingTop,
  };
}
