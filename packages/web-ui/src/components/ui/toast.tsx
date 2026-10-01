"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "./button";

const toast = ToastPrimitive.createToastManager();

function ToastProvider(props: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal(props: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return <ToastPrimitive.Viewport data-slot="toast-viewport" className={cn(
    "pointer-events-none fixed inset-x-4 bottom-4 z-[100] mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full",
    className,
  )} {...props} />;
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return <ToastPrimitive.Root data-slot="toast" className={cn(
    "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-ring",
    "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
    "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
    "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))] data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
    "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
    className,
  )} {...props} />;
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return <ToastPrimitive.Content data-slot="toast-content" className={cn(
    "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity data-behind:opacity-0 data-expanded:opacity-100", className,
  )} {...props} />;
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return <ToastPrimitive.Title data-slot="toast-title" className={cn("text-sm font-medium", className)} {...props} />;
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return <ToastPrimitive.Description data-slot="toast-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function ToastAction({ className, render = <Button variant="outline" size="sm" />, ...props }: ToastPrimitive.Action.Props) {
  return <ToastPrimitive.Action data-slot="toast-action" render={render} className={cn("shrink-0", className)} {...props} />;
}

function ToastClose({ className, render = <Button variant="ghost" size="icon-sm" aria-label="Close toast" />, ...props }: ToastPrimitive.Close.Props) {
  return <ToastPrimitive.Close data-slot="toast-close" aria-label="Close toast" render={render} className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)} {...props}><X aria-hidden="true" className="size-4" /></ToastPrimitive.Close>;
}

const icons = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: OctagonX,
  loading: LoaderCircle,
} as const;

function ToastIcon({ type }: { type: string | undefined }) {
  const Icon = type && type in icons ? icons[type as keyof typeof icons] : null;
  return Icon ? <Icon data-slot="toast-icon" aria-hidden="true" className={cn("size-4 shrink-0", type === "error" && "text-destructive", type === "loading" && "animate-spin")} /> : null;
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((item) => <Toast key={item.id} toast={item}>
    <ToastContent>
      <ToastIcon type={item.type} />
      <div className="flex min-w-0 flex-1 flex-col gap-1"><ToastTitle /><ToastDescription /></div>
      <ToastAction />
      <ToastClose />
    </ToastContent>
  </Toast>);
}

function Toaster({ children, toastManager = toast, ...props }: ToastPrimitive.Provider.Props) {
  return <ToastProvider toastManager={toastManager} {...props}>
    {children}
    <ToastPortal><ToastViewport><ToastList /></ToastViewport></ToastPortal>
  </ToastProvider>;
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export { Toaster, Toast, ToastAction, ToastClose, ToastContent, ToastDescription, ToastPortal, ToastProvider, ToastTitle, ToastViewport, createToastManager, toast, useToastManager };
