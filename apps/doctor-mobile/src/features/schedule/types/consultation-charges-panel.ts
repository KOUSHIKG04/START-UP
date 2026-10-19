export type ConsultationChargesPanelProps = {
  mode: "clinic" | "online" | "home";
  draft: {
    onlineFee: string;
    clinicFee: string;
    homeFee: string;
  };
  onUpdate: (
    changes: Partial<{ onlineFee: string; clinicFee: string; homeFee: string }>
  ) => void;
};
