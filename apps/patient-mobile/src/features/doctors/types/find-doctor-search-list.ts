import { type ImageSourcePropType } from "react-native";

export interface CategoryItem {
  key: string;
  label: string;
  image: ImageSourcePropType;
  imageScale?: number;
}

export type FindDoctorSearchListProps = {
  filteredCategories: readonly CategoryItem[];
  doctorMatches: readonly { id: string; name: string }[];
  searchQuery: string;
  recentSearches: readonly string[];
  onSelectSymptom: (symptom: string) => void;
  onSelectRecent: (term: string) => void;
  onClearRecentSearches: () => void;
  onSelectCategory: (categoryKey: string, categoryLabel: string) => void;
  onSelectDoctor: (doctorName: string) => void;
  onSearchAnyway: (query: string) => void;
};
