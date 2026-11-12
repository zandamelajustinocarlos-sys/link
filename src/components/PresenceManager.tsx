
"use client";

import { useEffect } from "react";

import {
  startPresence,
  stopPresence,
  refreshPresence,
} from "@/lib/presence";

export default function PresenceManager() {
  useEffect(() => {
    void startPresence();

    function handleFocus() {
      void refreshPresence();
    }

    function handleVisibility() {
      if (
        document.visibilityState === "visible"
      ) {
        void refreshPresence();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      void stopPresence();
    };
  }, []);

  return null;
}
