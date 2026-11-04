
"use client";

import { useState } from "react";

type StudentAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
};

export default function StudentAvatar({
  name,
  avatarUrl,
  size = 44,
  className = "",
}: StudentAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(
    null
  );

  const showImage = Boolean(
    avatarUrl && avatarUrl !== failedUrl
  );

  return (
    <div
      className={className}
      role="img"
      aria-label={`Fotografia de perfil de ${name}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E5E7EB",
        flexShrink: 0,
      }}
    >
      {showImage ? (
        <img
          key={avatarUrl}
          src={avatarUrl!}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailedUrl(avatarUrl!)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <svg
          width="65%"
          height="65%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
      )}
    </div>
  );
}
