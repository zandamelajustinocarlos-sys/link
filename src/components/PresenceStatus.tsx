"use client";

import { useEffect, useState } from "react";
import { watchPresence } from "@/lib/presence";

export default function PresenceStatus({
  studentId,
}: {
  studentId: string;
}) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    return watchPresence((users) => {
      setOnline(users.has(studentId));
    });
  }, [studentId]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        color: online ? "#16805D" : "#64748B",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: online
            ? "#24B889"
            : "#94A3B8",
        }}
      />

      {online ? "Online" : "Offline"}
    </span>
  );
}