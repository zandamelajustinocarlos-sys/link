
"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Guard from "@/components/Guard";
import StudentAvatar from "@/components/StudentAvatar";
import PresenceStatus from "@/components/PresenceStatus";
import LinkIcon from "@/components/LinkIcon";
import { db } from "@/lib/supabase";
type Student = {
  id: string;
  full_name: string;
  course: string | null;
  study_year: number | null;
};
type Connection = {
  requester_id: string;
  addressee_id: string;
  status: string;
};
type Room = {
  id: string;
  type: string;
  name: string | null;
};
type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
};
type Conversation = Room & {
  lastMessage: Msg;
  title: string;
  otherStudentId: string | null;
};
type ReceiptStatus = "sent" | "delivered" | "read";
type SyncResult = {
  unread?: Record<string, number>;
  statuses?: Record<string, ReceiptStatus>;
  hidden?: string[];
};
function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("pt-MZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("pt-MZ", {
    day: "2-digit",
    month: "2-digit",
  });
}
export default function Mensagens() {
  const [me, setMe] = useState("");
  const [friends, setFriends] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allMessages, setAllMessages] = useState<Msg[]>([]);
  const [senders, setSenders] = useState<
    Record<string, Student>
  >({});
  const [room, setRoom] = useState("");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] =
    useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [mobileView, setMobileView] =
    useState<"list" | "chat">("list");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unread, setUnread] = useState<
    Record<string, number>
  >({});
  const [receipts, setReceipts] = useState<
    Record<string, ReceiptStatus>
  >({});
  const [hiddenRooms, setHiddenRooms] =
    useState<string[]>([]);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef("");
  const meRef = useRef("");
  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const s = db();
        const {
          data: { user },
          error: authError,
        } = await s.auth.getUser();
        if (authError || !user) {
          setError("Sessão não encontrada.");
          return;
        }
        setMe(user.id);
        meRef.current = user.id;
        const [connectionsResult, roomsResult] =
          await Promise.all([
            s.from("connections")
              .select(
                "requester_id,addressee_id,status"
              )
              .eq("status", "accepted"),
            s.from("conversations")
              .select("id,type,name"),
          ]);
        if (connectionsResult.error) {
          throw connectionsResult.error;
        }
        if (roomsResult.error) {
          throw roomsResult.error;
        }
        const connections =
          (connectionsResult.data || []) as Connection[];
        const visibleConnections = connections.filter(
          (connection) =>
            connection.requester_id === user.id ||
            connection.addressee_id === user.id
        );
        const friendIds = [
          ...new Set(
            visibleConnections.map((connection) =>
              connection.requester_id === user.id
                ? connection.addressee_id
                : connection.requester_id
            )
          ),
        ];
        const availableRooms =
          (roomsResult.data || []) as Room[];
        setRooms(availableRooms);
        const sync = await s.rpc(
          "link_sync_receipts",
          {
            p_room: roomRef.current || null,
          }
        );
        if (sync.error) throw sync.error;
        const result =
          sync.data as SyncResult | null;
        setUnread(result?.unread || {});
        setReceipts(result?.statuses || {});
        setHiddenRooms(result?.hidden || []);
        const messagesResult = availableRooms.length
          ? await s
              .from("messages")
              .select(
                "id,conversation_id,sender_id,content,created_at,edited_at"
              )
              .in(
                "conversation_id",
                availableRooms.map((item) => item.id)
              )
              .order("created_at", {
                ascending: false,
              })
              .limit(1000)
          : {
              data: [] as Msg[],
              error: null,
            };
        if (messagesResult.error) {
          throw messagesResult.error;
        }
        const messages =
          (messagesResult.data || []) as Msg[];
        setAllMessages(messages);
        const studentIds = [
          ...new Set([
            ...friendIds,
            ...messages.map((item) => item.sender_id),
          ]),
        ].filter((id) => id !== user.id);
        if (studentIds.length > 0) {
          const studentsResult = await s
            .from("students")
            .select(
              "id,full_name,course,study_year"
            )
            .in("id", studentIds);
          if (studentsResult.error) {
            throw studentsResult.error;
          }
          const students =
            (studentsResult.data || []) as Student[];
          setFriends(
            students.filter((student) =>
              friendIds.includes(student.id)
            )
          );
          const studentMap: Record<string, Student> =
            {};
          students.forEach((student) => {
            studentMap[student.id] = student;
          });
          setSenders(studentMap);
        } else {
          setFriends([]);
          setSenders({});
        }
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar as conversas."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );
  useEffect(() => {
    void load(true);
  }, [load]);
  useEffect(() => {
    const channel = db()
      .channel("link-messages-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" &&
            payload.new &&
            "sender_id" in payload.new &&
            payload.new.sender_id !== meRef.current
          ) {
            setNotice("Recebeste uma nova mensagem.");
          }
          void load();
        }
      )
      .subscribe();
    function refreshOnFocus() {
      void load();
    }
    window.addEventListener(
      "focus",
      refreshOnFocus
    );
    const poll = window.setInterval(() => {
      void load();
    }, 12000);
    return () => {
      window.removeEventListener(
        "focus",
        refreshOnFocus
      );
      window.clearInterval(poll);
      void db().removeChannel(channel);
    };
  }, [load]);
  const conversations = useMemo(() => {
    const latest = new Map<string, Msg>();
    for (const message of allMessages) {
      const previous = latest.get(
        message.conversation_id
      );
      if (
        !previous ||
        new Date(message.created_at).getTime() >
          new Date(previous.created_at).getTime()
      ) {
        latest.set(
          message.conversation_id,
          message
        );
      }
    }
    const result: Conversation[] = [];
    for (const item of rooms) {
      const lastMessage = latest.get(item.id);
      if (
        !lastMessage ||
        hiddenRooms.includes(item.id)
      ) {
        continue;
      }
      const otherStudentId =
        item.type === "group"
          ? null
          : allMessages
              .filter(
                (message) =>
                  message.conversation_id === item.id &&
                  message.sender_id !== me
              )
              .map((message) => message.sender_id)[0] ||
            null;
      const otherStudent = otherStudentId
        ? senders[otherStudentId]
        : null;
      result.push({
        ...item,
        lastMessage,
        otherStudentId,
        title:
          item.type === "group"
            ? item.name || "Grupo sem nome"
            : otherStudent?.full_name ||
              item.name ||
              "Conversa privada",
      });
    }
    return result.sort(
      (a, b) =>
        new Date(
          b.lastMessage.created_at
        ).getTime() -
        new Date(
          a.lastMessage.created_at
        ).getTime()
    );
  }, [
    rooms,
    allMessages,
    senders,
    me,
    hiddenRooms,
  ]);
  const filteredConversations =
    conversations.filter((item) =>
      `${item.title} ${item.lastMessage.content}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  const activeRoom = rooms.find(
    (item) => item.id === room
  );
  const activeConversation = conversations.find(
    (item) => item.id === room
  );
  const isGroup = activeRoom?.type === "group";
  const msgs = useMemo(
    () =>
      allMessages
        .filter(
          (message) =>
            message.conversation_id === room
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        ),
    [allMessages, room]
  );
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [msgs.length, room]);
  const filteredFriends = friends.filter(
    (friend) =>
      `${friend.full_name} ${friend.course || ""}`
        .toLowerCase()
        .includes(contactSearch.toLowerCase())
  );
  useEffect(() => {
    function handleBrowserBack() {
      if (window.matchMedia("(max-width: 760px)").matches) {
        setMobileView("list");
      }
    }
    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, []);
  function openRoom(id: string) {
    if (
      window.matchMedia("(max-width: 760px)").matches &&
      mobileView !== "chat"
    ) {
      window.history.pushState({ linkChat: true }, "", window.location.href);
    }
    roomRef.current = id;
    setRoom(id);
    setMobileView("chat");
    setComposerOpen(false);
    setNotice("");
    setError("");
    void load();
  }
  function openComposer() {
    setComposerMode("direct");
    setContactSearch("");
    setSelected([]);
    setGroupName("");
    setComposerOpen(true);
  }
  async function direct(friendId: string) {
    if (
      !friends.some(
        (friend) => friend.id === friendId
      )
    ) {
      setError(
        "Só podes conversar com conexões aceites."
      );
      return;
    }
    setCreating(true);
    setError("");
    try {
      const { data, error: rpcError } =
        await db().rpc(
          "create_direct_conversation",
          {
            other_student: friendId,
          }
        );
      if (rpcError) throw rpcError;
      const id = data as string;
      await load();
      openRoom(id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível iniciar a conversa."
      );
    } finally {
      setCreating(false);
    }
  }
  async function group() {
    if (!groupName.trim() || !selected.length) {
      return;
    }
    if (
      selected.some(
        (id) =>
          !friends.some(
            (friend) => friend.id === id
          )
      )
    ) {
      setError(
        "Os participantes devem ter conexões aceites."
      );
      return;
    }
    setCreating(true);
    setError("");
    try {
      const { data, error: rpcError } =
        await db().rpc(
          "create_group_conversation",
          {
            group_name: groupName.trim(),
            member_ids: selected,
          }
        );
      if (rpcError) throw rpcError;
      setGroupName("");
      setSelected([]);
      await load();
      openRoom(data as string);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar o grupo."
      );
    } finally {
      setCreating(false);
    }
  }
  async function saveEdit() {
    if (
      !editingId ||
      !text.trim() ||
      savingEdit
    ) {
      return;
    }
    setSavingEdit(true);
    try {
      const { error: rpcError } =
        await db().rpc(
          "link_edit_message",
          {
            p_message: editingId,
            p_content: text.trim(),
          }
        );
      if (rpcError) throw rpcError;
      setEditingId(null);
      setText("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível editar."
      );
    } finally {
      setSavingEdit(false);
    }
  }
  async function hideConversation() {
    if (!room) return;
    const confirmed = window.confirm(
      "Eliminar esta conversa da tua lista? " +
      "As mensagens continuarão disponíveis " +
      "aos outros participantes."
    );
    if (!confirmed) return;
    const { error: rpcError } =
      await db().rpc(
        "link_hide_conversation",
        {
          p_room: room,
        }
      );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    roomRef.current = "";
    setRoom("");
    setMobileView("list");
    await load();
  }
  async function send(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (editingId) {
      await saveEdit();
      return;
    }
    const content = text.trim();
    if (
      !content ||
      !room ||
      !me ||
      sending
    ) {
      return;
    }
    setSending(true);
    setError("");
    try {
      const { error: insertError } =
        await db()
          .from("messages")
          .insert({
            conversation_id: room,
            sender_id: me,
            content,
          });
      if (insertError) throw insertError;
      setText("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível enviar a mensagem."
      );
    } finally {
      setSending(false);
    }
  }
  function getSenderName(id: string) {
    if (id === me) return "Tu";
    return (
      senders[id]?.full_name ||
      "Estudante"
    );
  }
  return (
    <Guard>
      <main className="shell link-messages-page">
        <Nav />
        <div className="link-messages-heading">
          <div>
            <h1>Mensagens</h1>
            <p>
              Conversa e colabora com as tuas conexões.
            </p>
          </div>
        </div>
        {notice && (
          <div
            className="link-chat-notice"
            role="status"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}
        {error && (
          <div
            className="link-chat-error"
            role="alert"
          >
            {error}
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}
        <div
          className={`link-chat-layout mobile-${mobileView}`}
        >
          <aside className="link-chat-list">
            <div className="link-chat-list-header">
              <h2>Conversas</h2>
              <button
                type="button"
                className="link-new-chat"
                onClick={openComposer}
                aria-label="Nova conversa"
                title="Nova conversa"
              >
                <LinkIcon
                  name="plus"
                  size={23}
                />
              </button>
            </div>
            <div className="link-chat-search">
              <LinkIcon
                name="search"
                size={19}
              />
              <input
                type="search"
                placeholder="Pesquisar conversas"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                aria-label="Pesquisar conversas"
              />
            </div>
            <div className="link-chat-conversations">
              {loading ? (
                <p className="link-chat-empty">
                  A carregar conversas...
                </p>
              ) : filteredConversations.length === 0 ? (
                <div className="link-chat-empty">
                  <LinkIcon
                    name="messages"
                    size={32}
                  />
                  <p>
                    {search
                      ? "Nenhuma conversa encontrada."
                      : "Ainda não tens conversas iniciadas."}
                  </p>
                  {!search && (
                    <button
                      type="button"
                      className="btn2"
                      onClick={openComposer}
                    >
                      Nova conversa
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map(
                  (conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`link-chat-row ${
                        room === conversation.id
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() =>
                        openRoom(conversation.id)
                      }
                    >
                      {conversation.type === "group" ? (
                        <span className="link-chat-group-avatar">
                          <LinkIcon
                            name="users"
                            size={23}
                          />
                        </span>
                      ) : (
                        <StudentAvatar
                          name={conversation.title}
                          size={46}
                        />
                      )}
                      <span className="link-chat-row-main">
                        <span className="link-chat-row-top">
                          <strong>
                            {conversation.title}
                          </strong>
                          <time>
                            {formatTime(
                              conversation.lastMessage
                                .created_at
                            )}
                          </time>
                        </span>
                        <span className="link-chat-row-bottom">
                          <span
                            className={`link-chat-preview ${
                              unread[conversation.id]
                                ? "has-unread"
                                : ""
                            }`}
                          >
                            {conversation.lastMessage
                              .sender_id === me
                              ? "Tu: "
                              : ""}
                            {
                              conversation.lastMessage
                                .content
                            }
                          </span>
                          {(unread[conversation.id] || 0) >
                            0 && (
                            <span
                              className="link-chat-unread-badge"
                              aria-label={`${
                                unread[conversation.id]
                              } mensagens não lidas`}
                            >
                              {unread[conversation.id] > 99
                                ? "99+"
                                : unread[conversation.id]}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                )
              )}
            </div>
          </aside>
          <section className="link-chat-panel">
            {!room ? (
              <div className="link-chat-placeholder">
                <span className="link-chat-placeholder-icon">
                  <LinkIcon
                    name="messages"
                    size={44}
                  />
                </span>
                <h2>
                  As tuas conversas, num só lugar.
                </h2>
                <p>
                  Selecciona uma conversa ou inicia
                  uma nova com um estudante conectado.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={openComposer}
                >
                  Nova conversa
                </button>
              </div>
            ) : (
              <>
                <header className="link-chat-panel-header">
                  {isGroup ? (
                    <span className="link-chat-group-avatar">
                      <LinkIcon
                        name="users"
                        size={21}
                      />
                    </span>
                  ) : (
                    <StudentAvatar
                      name={
                        activeConversation?.title ||
                        "Estudante"
                      }
                      size={40}
                    />
                  )}
                  <div className="link-chat-contact">
                    <strong>
                      {activeConversation?.title ||
                        activeRoom?.name ||
                        (isGroup
                          ? "Grupo"
                          : "Conversa privada")}
                    </strong>
                    {isGroup ? (
                      <small>Conversa em grupo</small>
                    ) : activeConversation?.otherStudentId ? (
                      <PresenceStatus
                        studentId={
                          activeConversation.otherStudentId
                        }
                      />
                    ) : (
                      <small>
                        Conversa individual
                      </small>
                    )}
                  </div>
                  {!isGroup &&
                    activeConversation?.otherStudentId && (
                      <Link
                        href={`/estudantes/${activeConversation.otherStudentId}`}
                        className="link-chat-profile-link"
                      >
                        Ver perfil
                      </Link>
                    )}
                  <button
                    type="button"
                    className="link-chat-delete"
                    onClick={() =>
                      void hideConversation()
                    }
                    title="Eliminar da minha lista"
                  >
                    Eliminar
                  </button>
                </header>
                <div className="link-chat-messages">
                  {msgs.length === 0 && (
                    <div className="link-chat-start">
                      <p>Início da conversa.</p>
                      <small>
                        Envia uma mensagem para começar.
                      </small>
                    </div>
                  )}
                  {msgs.map((message) => {
                    const mine =
                      message.sender_id === me;
                    const canEdit =
                      mine &&
                      Date.now() -
                        new Date(
                          message.created_at
                        ).getTime() <=
                        15 * 60 * 1000;
                    const status =
                      receipts[message.id] ||
                      "sent";
                    return (
                      <div
                        key={message.id}
                        className={`link-message-row ${
                          mine ? "mine-row" : ""
                        }`}
                      >
                        {isGroup && !mine && (
                          <StudentAvatar
                            name={getSenderName(
                              message.sender_id
                            )}
                            size={28}
                          />
                        )}
                        <div
                          className={`link-message-bubble ${
                            mine
                              ? "sent"
                              : "received"
                          }`}
                        >
                          {isGroup && !mine && (
                            <strong className="link-message-sender">
                              {getSenderName(
                                message.sender_id
                              )}
                            </strong>
                          )}
                          <p>{message.content}</p>
                          <div className="link-message-meta">
                            {message.edited_at && (
                              <small>Editada ·</small>
                            )}
                            <time>
                              {formatTime(
                                message.created_at
                              )}
                            </time>
                            {mine && (
                              <span
                                className={`link-message-receipt ${
                                  status === "read"
                                    ? "is-read"
                                    : ""
                                }`}
                                title={
                                  status === "read"
                                    ? "Lida"
                                    : status === "delivered"
                                      ? "Entregue"
                                      : "Enviada"
                                }
                              >
                                {status === "sent"
                                  ? "✓"
                                  : "✓✓"}
                              </span>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              className="link-message-edit"
                              onClick={() => {
                                setEditingId(message.id);
                                setText(message.content);
                              }}
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                {editingId && (
                  <button
                    type="button"
                    className="link-edit-cancel"
                    onClick={() => {
                      setEditingId(null);
                      setText("");
                    }}
                  >
                    Cancelar edição
                  </button>
                )}
                <form
                  className="link-chat-compose"
                  onSubmit={send}
                >
                  <input
                    type="text"
                    value={text}
                    onChange={(event) =>
                      setText(event.target.value)
                    }
                    placeholder={
                      editingId
                        ? "Editar mensagem..."
                        : "Escreve uma mensagem..."
                    }
                    maxLength={4000}
                    aria-label="Escrever mensagem"
                  />
                  <button
                    type="submit"
                    disabled={
                      !text.trim() ||
                      sending ||
                      savingEdit
                    }
                    aria-label={
                      editingId
                        ? "Guardar edição"
                        : "Enviar mensagem"
                    }
                  >
                    <LinkIcon
                      name="messages"
                      size={21}
                    />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
        {composerOpen && (
          <div
            className="link-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget
              ) {
                setComposerOpen(false);
              }
            }}
          >
            <section
              className="link-chat-composer-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-chat-title"
            >
              <div className="link-chat-modal-heading">
                <h2 id="new-chat-title">
                  Nova conversa
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setComposerOpen(false)
                  }
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
              <div className="link-chat-modal-tabs">
                <button
                  type="button"
                  className={
                    composerMode === "direct"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setComposerMode("direct")
                  }
                >
                  Individual
                </button>
                <button
                  type="button"
                  className={
                    composerMode === "group"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setComposerMode("group")
                  }
                >
                  Novo grupo
                </button>
              </div>
              {composerMode === "group" && (
                <input
                  className="field"
                  placeholder="Nome do grupo"
                  value={groupName}
                  onChange={(event) =>
                    setGroupName(event.target.value)
                  }
                  maxLength={100}
                />
              )}
              <div className="link-chat-search modal-search">
                <LinkIcon
                  name="search"
                  size={19}
                />
                <input
                  type="search"
                  placeholder="Pesquisar conexões aceites"
                  value={contactSearch}
                  onChange={(event) =>
                    setContactSearch(
                      event.target.value
                    )
                  }
                />
              </div>
              <div className="link-chat-contact-list">
                {filteredFriends.length === 0 ? (
                  <p className="link-chat-empty">
                    Não existem conexões aceites
                    disponíveis.
                  </p>
                ) : (
                  filteredFriends.map((friend) => (
                    <button
                      type="button"
                      key={friend.id}
                      className="link-chat-contact-row"
                      disabled={creating}
                      onClick={() => {
                        if (
                          composerMode === "direct"
                        ) {
                          void direct(friend.id);
                          return;
                        }
                        setSelected((current) =>
                          current.includes(friend.id)
                            ? current.filter(
                                (id) =>
                                  id !== friend.id
                              )
                            : [
                                ...current,
                                friend.id,
                              ]
                        );
                      }}
                    >
                      <StudentAvatar
                        name={friend.full_name}
                        size={42}
                      />
                      <span>
                        <strong>
                          {friend.full_name}
                        </strong>
                        <small>
                          {friend.course ||
                            "Curso não informado"}
                        </small>
                      </span>
                      {composerMode === "group" && (
                        <input
                          type="checkbox"
                          checked={selected.includes(
                            friend.id
                          )}
                          readOnly
                          tabIndex={-1}
                          aria-label={`Seleccionar ${friend.full_name}`}
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
              {composerMode === "group" && (
                <button
                  type="button"
                  className="btn link-create-group"
                  onClick={() => void group()}
                  disabled={
                    creating ||
                    !groupName.trim() ||
                    selected.length === 0
                  }
                >
                  {creating
                    ? "A criar..."
                    : `Criar grupo (${selected.length})`}
                </button>
              )}
              <p className="link-chat-modal-note">
                Apenas estudantes com conexões
                aceites podem trocar mensagens.
              </p>
            </section>
          </div>
        )}
      </main>
    </Guard>
  );
}
