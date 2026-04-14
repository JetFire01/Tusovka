"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLang, t } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { BLOCK_TYPES } from "@/lib/blocks";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  createdAt: string;
  _count: { participants: number };
  blocks: { type: string }[];
}

interface UserData {
  id: string;
  nickname: string;
  createdAt: string;
}

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<"events" | "users">("events");
  const [events, setEvents] = useState<EventData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState<"create" | string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) setEvents(await res.json());
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [tab, fetchUsers]);

  function handleEventClick(eventId: string) {
    if (!user) {
      setPendingAction(eventId);
      setShowAuth(true);
    } else {
      enterEvent(eventId);
    }
  }

  function handleCreateClick() {
    if (!user) {
      setPendingAction("create");
      setShowAuth(true);
    } else {
      setShowCreate(true);
    }
  }

  async function enterEvent(eventId: string) {
    await fetch(`/api/events/${eventId}/participants`, { method: "POST" });
    router.push(`/event/${eventId}/statistics`);
  }

  async function confirmDeleteEvent() {
    if (!deleteEventId || !user) return;
    setDeleteError("");
    // Verify PIN
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: deletePin }),
    });
    if (!res.ok) {
      setDeleteError(t("auth.wrongPin", lang));
      return;
    }
    await fetch(`/api/events/${deleteEventId}`, { method: "DELETE" });
    setDeleteEventId(null);
    setDeletePin("");
    fetchEvents();
  }

  function onAuthComplete() {
    setShowAuth(false);
    if (pendingAction === "create") {
      setShowCreate(true);
    } else if (pendingAction) {
      enterEvent(pendingAction);
    }
    setPendingAction(null);
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t("app.title", lang)}</h1>
            <p className="text-sm text-text-secondary">{t("app.subtitle", lang)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="px-2 py-1 text-base rounded-[8px] bg-surface text-text-secondary hover:text-text-primary transition-colors"
              title={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? "\u{263D}" : "\u{2600}"}
            </button>
            <button
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              className="px-2 py-1 text-xs font-medium rounded-[8px] bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              {lang === "ru" ? "EN" : "RU"}
            </button>
            {user && (
              <span className="text-sm text-text-secondary">
                {user.nickname}#{user.pin}
              </span>
            )}
            {tab === "events" && (
              <Button onClick={handleCreateClick} size="sm">
                {t("event.new", lang)}
              </Button>
            )}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <nav className="flex gap-1 bg-surface rounded-[var(--radius-apple)] p-1 w-fit">
            <button
              onClick={() => setTab("events")}
              className={`px-4 py-1.5 text-sm font-medium rounded-[10px] transition-all ${
                tab === "events"
                  ? "bg-surface-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t("tab.events", lang)}
            </button>
            <button
              onClick={() => setTab("users")}
              className={`px-4 py-1.5 text-sm font-medium rounded-[10px] transition-all ${
                tab === "users"
                  ? "bg-surface-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t("tab.users", lang)}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === "events" && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🏕</p>
                <p className="text-lg text-text-secondary mb-4">
                  {t("event.noEvents", lang)}
                </p>
                <Button onClick={handleCreateClick}>{t("event.createFirst", lang)}</Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {events.map((event) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-[var(--shadow-apple-lg)] transition-shadow duration-200 relative group"
                  >
                    <div onClick={() => handleEventClick(event.id)}>
                      <CardTitle>{event.title}</CardTitle>
                      {event.description && (
                        <CardDescription>{event.description}</CardDescription>
                      )}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="accent">
                          {event._count.participants} {t("event.participants", lang)}
                        </Badge>
                        {event.blocks.map((b, i) => (
                          <Badge key={i} variant="default">
                            {BLOCK_TYPES[b.type as keyof typeof BLOCK_TYPES]?.label || b.type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteEventId(event.id);
                        setDeletePin("");
                        setDeleteError("");
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-destructive hover:underline px-2 py-1"
                    >
                      {t("event.delete", lang)}
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "users" && (
          <UsersTab users={users} onUpdate={fetchUsers} />
        )}
      </main>

      {/* Delete Event Modal (PIN confirmation) */}
      <Modal
        open={!!deleteEventId}
        onClose={() => setDeleteEventId(null)}
        title={t("event.delete", lang)}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t("event.deleteConfirm", lang)}
          </p>
          <Input
            label={t("auth.pin", lang)}
            value={deletePin}
            onChange={(e) => setDeletePin(e.target.value)}
            placeholder="1234"
            maxLength={4}
            inputMode="numeric"
            autoFocus
          />
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <div className="flex gap-2">
            <Button variant="destructive" onClick={confirmDeleteEvent}>
              {t("event.delete", lang)}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteEventId(null)}>
              {t("admin.cancel", lang)}
            </Button>
          </div>
        </div>
      </Modal>

      <AuthModal
        open={showAuth}
        onClose={() => {
          setShowAuth(false);
          setPendingAction(null);
        }}
        onComplete={onAuthComplete}
      />

      <CreateEventModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(eventId) => {
          setShowCreate(false);
          router.push(`/event/${eventId}/admin`);
        }}
      />
    </div>
  );
}

function UsersTab({
  users,
  onUpdate,
}: {
  users: UserData[];
  onUpdate: () => void;
}) {
  const { lang } = useLang();
  const { user: currentUser, login } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<"nickname" | "pin">("nickname");
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");

  async function saveNickname(userId: string) {
    setError("");
    if (editValue.trim().length < 2) {
      setError(t("auth.min2chars", lang));
      return;
    }
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, nickname: editValue.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      // Re-login to refresh auth state if current user changed nickname
      if (currentUser && currentUser.userId === userId) {
        await login(currentUser.pin);
      }
      onUpdate();
    }
  }

  async function savePin(userId: string) {
    setError("");
    if (!/^\d{4}$/.test(editValue)) {
      setError("PIN: 4 " + (lang === "ru" ? "цифры" : "digits"));
      return;
    }
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPin: editValue }),
    });
    if (res.ok) {
      setEditingId(null);
      // Re-login with new PIN if current user changed their PIN
      if (currentUser && currentUser.userId === userId) {
        await login(editValue);
      }
      onUpdate();
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm(t("users.deleteConfirm", lang))) return;
    await fetch(`/api/users?userId=${userId}`, { method: "DELETE" });
    onUpdate();
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-text-secondary">{t("users.noUsers", lang)}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardTitle>{t("users.all", lang)} ({users.length})</CardTitle>
      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between py-2 px-3 rounded-[8px] hover:bg-surface transition-colors group"
          >
            {editingId === u.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={editMode === "pin" ? "1234" : ""}
                  maxLength={editMode === "pin" ? 4 : undefined}
                  inputMode={editMode === "pin" ? "numeric" : undefined}
                  className="flex-1 px-3 py-1.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      editMode === "pin" ? savePin(u.id) : saveNickname(u.id);
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    editMode === "pin" ? savePin(u.id) : saveNickname(u.id)
                  }
                >
                  {t("admin.save", lang)}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  {t("admin.cancel", lang)}
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <span className="font-medium text-sm">{u.nickname}</span>
                  <span className="text-xs text-text-tertiary ml-2">
                    {new Date(u.createdAt).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US")}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="text-xs text-accent hover:underline px-2 py-1"
                    onClick={() => {
                      setEditingId(u.id);
                      setEditMode("nickname");
                      setEditValue(u.nickname);
                      setError("");
                    }}
                  >
                    {t("users.changeNickname", lang)}
                  </button>
                  <button
                    className="text-xs text-accent hover:underline px-2 py-1"
                    onClick={() => {
                      setEditingId(u.id);
                      setEditMode("pin");
                      setEditValue("");
                      setError("");
                    }}
                  >
                    {t("users.changePin", lang)}
                  </button>
                  <button
                    className="text-xs text-destructive hover:underline px-2 py-1"
                    onClick={() => deleteUser(u.id)}
                  >
                    {t("users.deleteUser", lang)}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {error && <p className="text-xs text-destructive px-3">{error}</p>}
      </div>
    </Card>
  );
}

function AuthModal({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { login, register } = useAuth();
  const { lang } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState<{ nickname: string; pin: string } | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const ok = await login(pin);
    if (ok) onComplete();
    else setError(t("auth.wrongPin", lang));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nickname.trim().length < 2) {
      setError(t("auth.min2chars", lang));
      return;
    }
    const result = await register(nickname.trim());
    if (result.user) setNewUser({ nickname: result.user.nickname, pin: result.user.pin });
    else setError(result.error || t("auth.registerError", lang));
  }

  if (newUser) {
    return (
      <Modal open={open} onClose={onClose} title={t("auth.rememberPin", lang)}>
        <div className="text-center">
          <p className="text-3xl font-bold text-accent mb-2">
            {newUser.nickname}#{newUser.pin}
          </p>
          <p className="text-sm text-text-secondary mb-6">
            {t("auth.pinShownOnce", lang)}
          </p>
          <Button
            onClick={() => {
              setNewUser(null);
              setNickname("");
              setPin("");
              onComplete();
            }}
          >
            {t("auth.remembered", lang)}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "login" ? t("auth.login", lang) : t("auth.register", lang)}>
      {mode === "login" ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label={t("auth.pin", lang)}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="1234"
            maxLength={4}
            inputMode="numeric"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit">{t("auth.enter", lang)}</Button>
          <button
            type="button"
            className="text-sm text-accent hover:underline"
            onClick={() => { setMode("register"); setError(""); }}
          >
            {t("auth.noAccount", lang)}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <Input
            label={t("auth.nickname", lang)}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Иван Пупкин"
            autoFocus
          />
          <p className="text-xs text-text-secondary">
            {t("auth.chooseNickname", lang)} {t("auth.pinAutoGenerated", lang)}
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit">{t("auth.registerBtn", lang)}</Button>
          <button
            type="button"
            className="text-sm text-accent hover:underline"
            onClick={() => { setMode("login"); setError(""); }}
          >
            {t("auth.hasAccount", lang)}
          </button>
        </form>
      )}
    </Modal>
  );
}

function CreateEventModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (eventId: string) => void;
}) {
  const { lang } = useLang();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (title.trim().length < 2) {
      setError(t("auth.min2chars", lang));
      return;
    }
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
      }),
    });
    if (res.ok) {
      const event = await res.json();
      setTitle("");
      setDescription("");
      onCreated(event.id);
    } else {
      setError(t("event.createError", lang));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("event.newEvent", lang)}>
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <Input
          label={t("event.title", lang)}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="IX Турслёт"
          autoFocus
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            {t("event.description", lang)}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="..."
            rows={3}
            className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit">{t("event.create", lang)}</Button>
      </form>
    </Modal>
  );
}
