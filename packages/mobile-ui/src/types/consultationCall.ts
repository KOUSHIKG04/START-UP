import type { ReactNode } from "react";

export type CallMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ConsultationCallProps = {
  theme: "patient" | "doctor";
  name: string;
  remoteVideo: ReactNode;
  localVideo: ReactNode;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  connected: boolean;
  chatAllowed: boolean;
  deviceBusy: boolean;
  sending: boolean;
  messages?: CallMessage[];
  identityId?: string;
  initialChat?: boolean;
  onSend: (body: string) => Promise<void>;
  onCamera: () => void;
  onMicrophone: () => void;
  onFlipCamera: () => void;
  onEnd: () => void;
  onBack: () => void;
};
