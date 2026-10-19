import type { TriggerPosition } from "../types/dropdown";
import { MENU_GAP } from "./dropdownConstants";
export function calculateMenuPosition({
  triggerPosition,
  menuHeight,
  menuWidth,
  windowWidth,
  windowHeight,
}: {
  triggerPosition?: TriggerPosition;
  menuHeight: number;
  menuWidth?: number;
  windowWidth: number;
  windowHeight: number;
}) {
  if (!triggerPosition) return { menuTop: 0, menuLeft: 12, targetWidth: 160 };

  const shouldOpenAbove =
    triggerPosition.y + triggerPosition.height + MENU_GAP + menuHeight >
    windowHeight;
  const menuTop = shouldOpenAbove
    ? Math.max(MENU_GAP, triggerPosition.y - menuHeight - MENU_GAP)
    : triggerPosition.y + triggerPosition.height + MENU_GAP;
  const targetWidth = menuWidth ?? Math.max(triggerPosition.width, 160);
  const idealLeft =
    triggerPosition.x + triggerPosition.width / 2 > windowWidth / 2
      ? triggerPosition.x + triggerPosition.width - targetWidth
      : triggerPosition.x;
  const maxLeft = Math.max(12, windowWidth - targetWidth - 12);
  const menuLeft = Math.max(12, Math.min(idealLeft, maxLeft));

  return { menuTop, menuLeft, targetWidth };
}
