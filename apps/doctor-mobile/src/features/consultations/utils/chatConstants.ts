import type { MessageItem } from "../types/chat-screen";
export const homeThread: MessageItem[] = [
  {
    id: "1",
    sent: false,
    text: "Are you close? The patient is having severe breathing difficulty and we are ready at the door.",
    time: "9:42 AM",
  },
  {
    id: "2",
    sent: true,
    text: "Yes, I am on my way. Passing through Sriramapura main road now. The traffic is a bit heavy but we are moving fast.",
    time: "9:43 AM",
  },
  {
    id: "3",
    sent: true,
    text: "Estimated arrival is in 7 minutes. Please keep the main gate clear.",
    time: "9:43 AM",
  },
  {
    id: "4",
    sent: false,
    text: "Understood. The gate is open and the stretcher path is clear. Thank you.",
    time: "9:44 AM",
  },
];
