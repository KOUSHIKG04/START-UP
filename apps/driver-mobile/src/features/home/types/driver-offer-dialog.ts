import type { useDriverHome } from "../hooks/useDriverHome";
export type DriverOfferDialogProps = Pick<
  ReturnType<typeof useDriverHome>,
  "offer" | "remaining" | "busy" | "responding" | "respond"
>;
