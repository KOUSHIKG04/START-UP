export type ToastType = "success" | "error" | "info";

export type ToastInput = { title: string; message?: string; type?: ToastType };
