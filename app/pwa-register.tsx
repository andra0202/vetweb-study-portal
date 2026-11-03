"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The website stays fully usable if a browser blocks service workers.
      });
    }
  }, []);

  return null;
}
