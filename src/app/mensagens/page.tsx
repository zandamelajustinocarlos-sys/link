
"use client";

import {
  useEffect,
  useState,
  useCallback,
  type FormEvent,
} from "react";

import Nav from "@/components/Nav";
import Guard from "@/components/Guard";
import PresenceStatus from "@/components/PresenceStatus";
import StudentAvatar from "@/components/StudentAvatar";
import { db } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  course: string | null;
  study_year: number | null;
};

type Room = {
  id: string;
  type: string;
  name: string | null;
};

type Msg = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function Mensagens() {
  const [mobileView, setMobileView] =
    useState<"list" | "chat">("list");

  const [me, setMe] = useState("");
  const [friends, setFriends] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [room, setRoom] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Dados dos remetentes das mensagens de grupo.
  const [senders, setSenders] = useState<
    Record<string, Student>
  >({});

  const load = useCallback(async () => {
    const s = db();

    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) return;

    setMe(user.id);

    const [connectionsResult, roomsResult] =
      await Promise.all([
        s.from("connections")
          .select("*")
          .eq("status", "accepted"),

        s.from("conversations")
          .select("id,type,name")
          .order("created_at", {
            ascending: false,
          }),
      ]);

    if (connectionsResult.error) {
      setError(connectionsResult.error.message);
    }

    if (roomsResult.error) {
      setError(roomsResult.error.message);
    }

    setRooms(roomsResult.data || []);

    const ids = [
      ...new Set(
        (connectionsResult.data || [])
          .filter(
            (connection) =>
              connection.requester_id === user.id ||
              connection.addressee_id === user.id
          )
          .map((connection) =>
            connection.requester_id === user.id
              ? connection.addressee_id
              : connection.requester_id
          )
      ),
    ];

    if (ids.length > 0) {
      const result = await s
        .from("students")
        .select("id,full_name,course,study_year")
        .in("id", ids);

      if (result.error) {
        setError(result.error.message);
      }

      setFriends(result.data || []);
    } else {
      setFriends([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Acompanhar mensagens da conversa seleccionada.
  useEffect(() => {
    if (!room) {
      setMsgs([]);
      return;
    }

    let active = true;

    async function refresh() {
      const { data, error } = await db()
        .from("messages")
        .select(
          "id,sender_id,content,created_at"
        )
        .eq("conversation_id", room)
        .order("created_at");

      if (!active) return;

      if (error) {
        setError(error.message);
        return;
      }

      setMsgs(data || []);
    }

    void refresh();

    const channel = db()
      .channel("room-" + room)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + room,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void db().removeChannel(channel);
    };
  }, [room]);

  const activeRoom = rooms.find(
    (conversation) => conversation.id === room
  );

  const isGroup = activeRoom?.type === "group";

  // Carregar os nomes dos remetentes nas conversas de grupo.
  useEffect(() => {
    if (!isGroup || msgs.length === 0) {
      return;
    }

    let active = true;

    async function loadSenders() {
      const ids = [
        ...new Set(
          msgs
            .map((message) => message.sender_id)
            .filter((id) => id !== me)
        ),
      ];

      if (ids.length === 0) return;

      const { data, error } = await db()
        .from("students")
        .select("id,full_name,course,study_year")
        .in("id", ids);

      if (!active) return;

      if (error) {
        setError(error.message);
        return;
      }

      const map: Record<string, Student> = {};

      for (const student of data || []) {
        map[student.id] = student;
      }

      setSenders(map);
    }

    void loadSenders();

    return () => {
      active = false;
    };
  }, [isGroup, msgs, me]);

  // Iniciar conversa individual.
  async function direct(friendId: string) {
    setError("");

    const { data, error } = await db().rpc(
      "create_direct_conversation",
      {
        other_student: friendId,
      }
    );

    if (error) {
      setError(error.message);
      return;
    }

    await load();

    setRoom(data as string);
    setMobileView("chat");
  }

  // Criar grupo.
  async function group() {
    if (!groupName.trim() || selected.length === 0) {
      return;
    }

    setError("");

    const { data, error } = await db().rpc(
      "create_group_conversation",
      {
        group_name: groupName.trim(),
        member_ids: selected,
      }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setGroupName("");
    setSelected([]);

    await load();

    setRoom(data as string);
    setMobileView("chat");
  }

  // Enviar mensagem.
  async function send(e: FormEvent) {
    e.preventDefault();

    if (!text.trim() || !room) {
      return;
    }

    const value = text.trim();

    setText("");
    setError("");

    const { error } = await db()
      .from("messages")
      .insert({
        conversation_id: room,
        sender_id: me,
        content: value,
      });

    if (error) {
      setError(error.message);
      setText(value);
      return;
    }

    const { data } = await db()
      .from("messages")
      .select(
        "id,sender_id,content,created_at"
      )
      .eq("conversation_id", room)
      .order("created_at");

    setMsgs(data || []);
  }

  function getSenderName(senderId: string) {
    if (senderId === me) return "Tu";

    const sender = senders[senderId];

    if (sender) {
      return sender.full_name;
    }

    const friend = friends.find(
      (student) => student.id === senderId
    );

    return friend?.full_name || "Estudante";
  }

  return (
    <Guard>
      <main className="shell">
        <Nav />

        <h1>Mensagens</h1>

        <p className="muted">
          Conversas privadas e em grupo · Apenas conexões aceites
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {/* Abas para telemóvel */}
        <div
          className="chat-mobile-tabs"
          aria-label="Navegação das mensagens"
        >
          <button
            type="button"
            className={
              mobileView === "list" ? "active" : ""
            }
            onClick={() => setMobileView("list")}
          >
            Conversas
          </button>

          <button
            type="button"
            className={
              mobileView === "chat" ? "active" : ""
            }
            onClick={() => setMobileView("chat")}
            disabled={!room}
          >
            Chat
          </button>
        </div>

        <div
          className={`grid chat-layout mobile-${mobileView}`}
        >
          {/* Lista de contactos e grupos */}
          <aside className="card chat-sidebar">
            <h3>Iniciar conversa</h3>

            {friends.map((friend) => (
              <button
                key={friend.id}
                className="item"
                style={{
                  width: "100%",
                  border: 0,
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
                onClick={() => direct(friend.id)}
              >
                <StudentAvatar
                  name={friend.full_name}
                  size={46}
                />

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {friend.full_name}
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    <PresenceStatus
                      studentId={friend.id}
                    />
                  </div>

                  <small className="muted">
                    {friend.course ||
                      "Curso não informado"}
                    {" · "}
                    {friend.study_year
                      ? `${friend.study_year}.º ano`
                      : "Ano não informado"}
                  </small>
                </div>
              </button>
            ))}

            {!friends.length && (
              <p className="muted">
                Primeiro estabelece conexões.
              </p>
            )}

            <h3>Novo grupo</h3>

            <input
              className="field"
              placeholder="Nome do grupo"
              value={groupName}
              onChange={(e) =>
                setGroupName(e.target.value)
              }
            />

            {friends.map((friend) => (
              <label
                key={friend.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(friend.id)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, friend.id]
                        : current.filter(
                            (id) => id !== friend.id
                          )
                    )
                  }
                />

                <StudentAvatar
                  name={friend.full_name}
                  size={30}
                />

                <span>{friend.full_name}</span>
              </label>
            ))}

            <button
              className="btn2"
              onClick={group}
              disabled={
                !groupName.trim() ||
                !selected.length
              }
            >
              Criar grupo
            </button>

            <h3 style={{ marginTop: 25 }}>
              Conversas
            </h3>

            {rooms.map((conversation) => (
              <button
                key={conversation.id}
                className="item"
                style={{
                  width: "100%",
                  border:
                    room === conversation.id
                      ? "2px solid #FFB547"
                      : 0,
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
                onClick={() => {
                  setRoom(conversation.id);
                  setMobileView("chat");
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    minWidth: 42,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      conversation.type === "group"
                        ? "#DCFCE7"
                        : "#FFE4DB",
                    color: "#1E293B",
                    fontSize: 19,
                  }}
                >
                  {conversation.type === "group"
                    ? "👥"
                    : "💬"}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {conversation.name ||
                      "Conversa privada"}
                  </div>

                  <small className="muted">
                    {conversation.type === "group"
                      ? "Grupo"
                      : "Conversa individual"}
                  </small>
                </div>
              </button>
            ))}
          </aside>

          {/* Área de mensagens */}
          <section
            className="card chat-panel"
            style={{
              minHeight: 490,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="chat-heading">
              <button
                type="button"
                className="chat-back"
                onClick={() =>
                  setMobileView("list")
                }
              >
                ← Conversas
              </button>

              <h3>
                {room
                  ? activeRoom?.name ||
                    "Conversa privada"
                  : "Selecciona uma conversa"}
              </h3>
            </div>

            {/* Histórico de mensagens */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: 8,
              }}
            >
              {msgs.map((message) => {
                const isMine =
                  message.sender_id === me;

                const senderName = getSenderName(
                  message.sender_id
                );

                return (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: isMine
                        ? "flex-end"
                        : "flex-start",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {/* Avatar apenas nos grupos */}
                    {isGroup && !isMine && (
                      <StudentAvatar
                        name={senderName}
                        size={30}
                      />
                    )}

                    <div
                      className={
                        "bubble " +
                        (isMine ? "mine" : "")
                      }
                      style={{
                        maxWidth: "78%",
                        minWidth: 0,
                      }}
                    >
                      <small className="muted">
                        {isMine
                          ? "Tu"
                          : isGroup
                            ? senderName
                            : "Estudante"}

                        {" · "}

                        {new Date(
                          message.created_at
                        ).toLocaleTimeString(
                          "pt-MZ",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </small>

                      <div
                        style={{
                          overflowWrap: "anywhere",
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulário de envio */}
            <form
              onSubmit={send}
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <input
                className="field"
                style={{
                  margin: 0,
                  minWidth: 0,
                  flex: 1,
                }}
                disabled={!room}
                value={text}
                onChange={(e) =>
                  setText(e.target.value)
                }
                placeholder="Escreve uma mensagem..."
                maxLength={4000}
              />

              <button
                className="btn"
                disabled={
                  !room ||
                  !text.trim()
                }
              >
                Enviar
              </button>
            </form>
          </section>
        </div>
      </main>
    </Guard>
  );
}
