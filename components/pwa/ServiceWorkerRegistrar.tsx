"use client";

import { useEffect } from "react";

export const PWA_CLEAR_CACHES_MESSAGE = "DD_OODLE_CLEAR_CACHES";

export async function clearPwaCaches(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage({ type: PWA_CLEAR_CACHES_MESSAGE });
      return true;
    }

    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration?.active) {
      registration.active.postMessage({ type: PWA_CLEAR_CACHES_MESSAGE });
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .catch(() => {
        // Registration failure must never break application boot.
      });
  }, []);

  return null;
}
