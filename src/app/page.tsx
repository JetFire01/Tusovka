"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState<"create" | string | null>(null);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) {
      setEvents(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
            <h1 className="text-2xl font-bold text-text-primary">Tusovka</h1>
            <p className="text-sm text-text-secondary">Организатор мероприятий</p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-text-secondary">
                {user.nickname}#{user.pin}
              </span>
            )}
            <Button onClick={handleCreateClick} size="sm">
              Новый ивент
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏕</p>
            <p className="text-lg text-text-secondary mb-4">
              Пока нет ни одного ивента
            </p>
            <Button onClick={handleCreateClick}>Создать первый ивент</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-[var(--shadow-apple-lg)] transition-shadow duration-200"
                onClick={() => handleEventClick(event.id)}
              >
                <CardTitle>{event.title}</CardTitle>
                {event.description && (
                  <CardDescription>{event.description}</CardDescription>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="accent">
                    {event._count.participants} участн.
                  </Badge>
                  {event.startDate && (
                    <Badge>
                      {new Date(event.startDate).toLocaleDateString("ru-RU")}
                    </Badge>
                  )}
                  {event.blocks.map((b, i) => (
                    <Badge key={i} variant="default">
                      {BLOCK_TYPES[b.type as keyof typeof BLOCK_TYPES]?.label || b.type}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState<{ nickname: string; pin: string } | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const ok = await login(nickname, pin);
    if (ok) {
      onComplete();
    } else {
      setError("Неверный никнейм или PIN-код");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (nickname.trim().length < 2) {
      setError("Минимум 2 символа");
      return;
    }
    const user = await register(nickname.trim());
    if (user) {
      setNewUser({ nickname: user.nickname, pin: user.pin });
    } else {
      setError("Ошибка регистрации");
    }
  }

  if (newUser) {
    return (
      <Modal open={open} onClose={onClose} title="Запомните ваш PIN-код!">
        <div className="text-center">
          <p className="text-3xl font-bold text-accent mb-2">
            {newUser.nickname}#{newUser.pin}
          </p>
          <p className="text-sm text-text-secondary mb-6">
            Этот PIN-код нужен для входа. Сохраните его — он показывается только
            один раз.
          </p>
          <Button
            onClick={() => {
              setNewUser(null);
              setNickname("");
              setPin("");
              onComplete();
            }}
          >
            Я запомнил, продолжить
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "login" ? "Вход" : "Регистрация"}>
      {mode === "login" ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="Никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ваня"
            autoFocus
          />
          <Input
            label="PIN-код"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="1234"
            maxLength={4}
            inputMode="numeric"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit">Войти</Button>
          <button
            type="button"
            className="text-sm text-accent hover:underline"
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Нет аккаунта? Зарегистрироваться
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <Input
            label="Никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ваня"
            autoFocus
          />
          <p className="text-xs text-text-secondary">
            Выберите никнейм, по которому друзья смогут вас узнать. Используйте
            один и тот же никнейм всегда.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit">Зарегистрироваться</Button>
          <button
            type="button"
            className="text-sm text-accent hover:underline"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Уже есть аккаунт? Войти
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (title.trim().length < 2) {
      setError("Минимум 2 символа");
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
      setError("Ошибка создания ивента");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый ивент">
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <Input
          label="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="IX Турслёт"
          autoFocus
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Описание (необязательно)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Выезд на природу с палатками..."
            rows={3}
            className="w-full px-3.5 py-2.5 bg-surface-card border border-border rounded-[var(--radius-apple)] text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit">Создать</Button>
      </form>
    </Modal>
  );
}
