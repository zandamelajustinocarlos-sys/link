
"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { createPortal } from "react-dom";

type Props = {
  name: string;
  avatarUrl?: string | null;
  profileHref?: string;
  size?: number;
};

export default function ProfilePhotoViewer({
  name,
  avatarUrl,
  profileHref,
  size = 72,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const previousFocus = document.activeElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }

      if (event.key === "Tab") {
        const modal = closeRef.current?.closest(
          '[role="dialog"]'
        );

        const focusable = modal?.querySelectorAll<
          HTMLButtonElement | HTMLAnchorElement
        >('button:not(:disabled), a[href]');

        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    closeRef.current?.focus();

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      } else {
        triggerRef.current?.focus();
      }
    };
  }, [open]);

  const hasImage = Boolean(
    avatarUrl && !imageFailed
  );

  function Avatar({
    large = false,
  }: {
    large?: boolean;
  }) {
    const dimensions = large
      ? "min(72vw, 340px)"
      : `${size}px`;

    return (
      <div
        style={{
          width: dimensions,
          height: dimensions,
          maxWidth: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#E5E7EB",
          flexShrink: 0,
        }}
      >
        {hasImage ? (
          <img
            src={avatarUrl!}
            alt=""
            onError={() => setImageFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <svg
            width="62%"
            height="62%"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.7"
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar fotografia de ${name}`}
        title="Ver fotografia"
        style={{
          padding: 0,
          border: 0,
          background: "transparent",
          borderRadius: "50%",
          cursor: "zoom-in",
          display: "inline-flex",
          flexShrink: 0,
        }}
      >
        <Avatar />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(10, 17, 30, 0.96)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              overflowY: "auto",
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={{
                width: "100%",
                maxWidth: 540,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 22,
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 27,
                    fontWeight: 800,
                    fontStyle: "italic",
                  }}
                >
                  link
                  <span style={{ color: "#FF796F" }}>
                    .
                  </span>
                </span>

                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar fotografia"
                  style={{
                    width: 44,
                    height: 44,
                    border: 0,
                    borderRadius: "50%",
                    background: "#334155",
                    color: "white",
                    fontSize: 25,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <Avatar large />

              <div style={{ textAlign: "center" }}>
                <h2
                  id={titleId}
                  style={{
                    color: "#FFFFFF",
                    margin: "0 0 6px",
                  }}
                >
                  {name}
                </h2>

                <p
                  style={{
                    color: "#CBD5E1",
                    margin: 0,
                  }}
                >
                  {hasImage
                    ? "Fotografia de perfil"
                    : "Avatar padrão"}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {profileHref && (
                  <Link
                    href={profileHref}
                    onClick={() => setOpen(false)}
                    className="btn"
                  >
                    Ver perfil
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    minHeight: 44,
                    padding: "10px 18px",
                    border: 0,
                    borderRadius: 12,
                    background: "#334155",
                    color: "#FFFFFF",
                    fontWeight: 700,
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
