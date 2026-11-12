
"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { db } from "@/lib/supabase";

type Listener = (online: Set<string>) => void;

const listeners = new Set<Listener>();

let channel: RealtimeChannel | null = null;
let references = 0;
let onlineUsers = new Set<string>();

let starting: Promise<void> | null = null;
let generation = 0;

function publish() {
  const snapshot = new Set(onlineUsers);

  for (const listener of listeners) {
    listener(new Set(snapshot));
  }
}

function updatePresence(
  activeChannel: RealtimeChannel
) {
  if (channel !== activeChannel) return;

  const state = activeChannel.presenceState();

  onlineUsers = new Set(Object.keys(state));

  publish();
}

/**
 * Permite acompanhar os estudantes online.
 */
export function watchPresence(
  listener: Listener
) {
  listeners.add(listener);

  listener(new Set(onlineUsers));

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Cria o canal de presença, evitando
 * inicializações concorrentes.
 */
async function connectPresence(
  currentGeneration: number
) {
  const client = db();

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (
    error ||
    !user ||
    references === 0 ||
    generation !== currentGeneration ||
    channel
  ) {
    return;
  }

  const active = client.channel("link-online", {
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
      updatePresence(active);
    }
  );

  active.on(
    "presence",
    { event: "join" },
    () => {
      updatePresence(active);
    }
  );

  active.on(
    "presence",
    { event: "leave" },
    () => {
      updatePresence(active);
    }
  );

  active.subscribe(async (status) => {
    if (
      channel !== active ||
      references === 0 ||
      generation !== currentGeneration
    ) {
      return;
    }

    if (status === "SUBSCRIBED") {
      try {
        await active.track({
          connected_at: new Date().toISOString(),
        });
      } catch (cause) {
        console.error(
          "Erro ao registar presença:",
          cause
        );
      }

      return;
    }

    if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT" ||
      status === "CLOSED"
    ) {
      onlineUsers = new Set<string>();
      publish();

      // Não criar imediatamente outro canal aqui.
      // O Supabase pode tentar recuperar a ligação.
      // A reconexão também será verificada
      // quando a janela voltar a ficar activa.
    }
  });
}

/**
 * Inicia a presença do utilizador autenticado.
 *
 * Cada componente que chamar esta função
 * deve chamar stopPresence() ao desmontar.
 */
export async function startPresence() {
  references += 1;

  if (channel) return;

  if (starting) {
    await starting;
    return;
  }

  const currentGeneration = generation;

  const task = connectPresence(currentGeneration);

  starting = task;

  try {
    await task;
  } finally {
    if (starting === task) {
      starting = null;
    }
  }
}

/**
 * Termina a presença quando já não
 * existem componentes a utilizá-la.
 */
export async function stopPresence() {
  references = Math.max(0, references - 1);

  if (references > 0) return;

  generation += 1;

  const old = channel;

  channel = null;
  onlineUsers = new Set<string>();

  publish();

  if (old) {
    try {
      await db().removeChannel(old);
    } catch (cause) {
      console.error(
        "Erro ao terminar presença:",
        cause
      );
    }
  }
}

/**
 * Verifica se o canal continua disponível
 * quando o estudante regressa à aplicação.
 */
export async function refreshPresence() {
  if (references === 0) return;

  if (channel) {
    const state = channel.state;

    if (
      state === "joined" ||
      state === "joining"
    ) {
      return;
    }

    const old = channel;

    channel = null;

    await db().removeChannel(old);
  }

  if (starting) {
    await starting;
    if (channel) return;
  }

  if (references === 0) return;

  const currentGeneration = generation;
  const task = connectPresence(currentGeneration);

  starting = task;

  try {
    await task;
  } finally {
    if (starting === task) {
      starting = null;
    }
  }
}
