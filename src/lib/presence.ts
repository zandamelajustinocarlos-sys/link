"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { db } from "@/lib/supabase";

type Listener = (online: Set<string>) => void;

const listeners = new Set<Listener>();

let channel: RealtimeChannel | null = null;
let references = 0;
let onlineUsers = new Set<string>();

function publish() {
  for (const listener of listeners) {
    listener(new Set(onlineUsers));
  }
}

/**
 * Permite aos componentes acompanhar
 * os estudantes que estão online.
 */
export function watchPresence(listener: Listener) {
  listeners.add(listener);

  listener(new Set(onlineUsers));

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Inicia a presença do utilizador autenticado.
 */
export async function startPresence() {
  references += 1;

  if (channel) return;

  const {
    data: { user },
  } = await db().auth.getUser();

  if (!user || references === 0 || channel) {
    return;
  }

  const active = db().channel("link-online", {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  channel = active;

  active.on(
    "presence",
    { event: "sync" },
    () => {
      const state = active.presenceState();

      onlineUsers = new Set(Object.keys(state));

      publish();
    }
  );

  active.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await active.track({
        connected_at: new Date().toISOString(),
      });
    }
  });
}

/**
 * Termina a presença quando já não
 * existem componentes a utilizá-la.
 */
export async function stopPresence() {
  references = Math.max(0, references - 1);

  if (references > 0) return;

  const old = channel;

  channel = null;
  onlineUsers = new Set<string>();

  publish();

  if (old) {
    await db().removeChannel(old);
  }
}