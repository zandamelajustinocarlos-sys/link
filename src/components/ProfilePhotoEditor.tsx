
"use client";

import { useState } from "react";
import { db } from "@/lib/supabase";

type Props = {
  name: string;
  initialPath: string | null;
};

export default function ProfilePhotoEditor({
  name,
  initialPath,
}: Props) {
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = db();

  const photoUrl = path
    ? supabase.storage
        .from("avatars")
        .getPublicUrl(path).data.publicUrl
    : null;

  async function uploadPhoto(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) return;

    setError("");
    setMessage("");

    const formats: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = formats[file.type];

    if (!extension) {
      setError("Selecciona uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("A fotografia não pode ultrapassar 2 MB.");
      return;
    }

    setBusy(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sessão não encontrada.");
      }

      const newPath =
        `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(newPath, file, {
            contentType: file.type,
            upsert: false,
          });

      if (uploadError) throw uploadError;

      const { error: saveError } =
        await supabase.rpc("set_my_avatar", {
          p_avatar_path: newPath,
        });

      if (saveError) {
        await supabase.storage
          .from("avatars")
          .remove([newPath]);

        throw saveError;
      }

      const oldPath = path;
      setPath(newPath);
      setMessage("Fotografia actualizada com sucesso.");

      if (oldPath && oldPath.startsWith(`${user.id}/`)) {
        await supabase.storage
          .from("avatars")
          .remove([oldPath]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar fotografia."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!path || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sessão não encontrada.");
      }

      const { error: saveError } =
        await supabase.rpc("set_my_avatar", {
          p_avatar_path: null,
        });

      if (saveError) throw saveError;

      const oldPath = path;
      setPath(null);

      if (oldPath.startsWith(`${user.id}/`)) {
        const { error: deleteError } =
          await supabase.storage
            .from("avatars")
            .remove([oldPath]);

        if (deleteError) {
          setMessage(
            "Fotografia removida do perfil. " +
            "O ficheiro antigo poderá necessitar de limpeza."
          );
          return;
        }
      }

      setMessage("Fotografia removida do perfil.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao remover fotografia."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-section">
      <h2>Fotografia de perfil</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "#E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
          role="img"
          aria-label={`Fotografia de ${name}`}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <svg
              width="65"
              height="65"
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <label className="btn">
            {busy
              ? "A processar..."
              : path
                ? "Substituir fotografia"
                : "Adicionar fotografia"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadPhoto}
              disabled={busy}
              style={{ display: "none" }}
            />
          </label>

          {path && (
            <button
              type="button"
              className="btn2"
              onClick={removePhoto}
              disabled={busy}
            >
              Remover fotografia
            </button>
          )}
        </div>
      </div>

      

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="ok" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
