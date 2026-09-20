import type { SearchItem } from "../utils/homeSearchConstants";

export type { SearchItem };

export type HomeSearchOverlayProps = {
  visible: boolean;
  onClose: () => void;
  selectedCity?: string;
};
