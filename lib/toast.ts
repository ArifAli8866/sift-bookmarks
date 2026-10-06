"use client";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  text: string;
  action?: ToastAction;
  leaving?: boolean;
}

let seq = 0;
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<number, number>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function getToasts(): Toast[] {
  return toasts;
}

export function dismissToast(id: number, immediate = false) {
  const timer = timers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  if (immediate) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
    return;
  }
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  const drop = window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 170);
  timers.set(id, drop);
}

export function pushToast(text: string, options: { action?: ToastAction; ttl?: number } = {}) {
  const id = ++seq;
  toasts = [...toasts, { id, text, action: options.action }].slice(-3);
  emit();
  const timer = window.setTimeout(() => dismissToast(id), options.ttl ?? 4600);
  timers.set(id, timer);
  return id;
}
