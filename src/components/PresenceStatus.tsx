
"use client";

import { useEffect, useState } from "react";
import { watchPresence } from "@/lib/presence";

type PresenceStatusProps = {
  studentId: string;
  showLabel?: boolean;
  size?: "sm" | "md";
};

export default function PresenceStatus({
  studentId,
  showLabel = true,
  size = "md",
}: PresenceStatusProps) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setOnline(false);
      return;
    }

    const unsubscribe = watchPresence((users) => {
      setOnline(users.has(studentId));
    });

    return () => {
      unsubscribe();
    };
  }, [studentId]);

  const dotSize = size === "sm" ? 7 : 8;

  return (
    <span
      className={`link-presence ${
        online ? "is-online" : "is-offline"
      }`}
      title={online ? "Online" : "Offline"}
      aria-label={
        online
          ? "Estudante online"
          : "Estudante offline"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: size === "sm" ? 12 : 13,
        fontWeight: 500,
        color: online ? "#16805D" : "#64748B",
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: dotSize,
          height: dotSize,
          minWidth: dotSize,
          borderRadius: "50%",
          backgroundColor: online
            ? "#24B889"
            : "#94A3B8",
          boxShadow: online
            ? "0 0 0 3px rgba(36,184,137,0.12)"
            : "none",
          transition:
            "background-color 180ms ease",
        }}
      />

      {showLabel && (
        <span>
          {online ? "Online" : "Offline"}
        </span>
      )}
    </span>
  );
}
