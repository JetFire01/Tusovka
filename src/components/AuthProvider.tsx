"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { AuthContext, AuthUser } from "@/hooks/useAuth";

// Раньше PIN хранился в localStorage — чистим за старыми версиями.
const LEGACY_STORAGE_KEY = "tusovka-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        setUser((prev) => ({
          userId: data.user.userId,
          nickname: data.user.nickname,
          pin: prev && prev.userId === data.user.userId ? prev.pin : undefined,
        }));
      } else {
        setUser(null);
      }
    } catch {
      // сеть недоступна — оставляем текущее состояние
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const authUser: AuthUser = {
      userId: data.userId,
      nickname: data.nickname,
      pin,
    };
    setUser(authUser);
    return true;
  }, []);

  const register = useCallback(async (nickname: string): Promise<{ user?: AuthUser; error?: string }> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || "Ошибка регистрации" };
    }

    const authUser: AuthUser = {
      userId: data.userId,
      nickname: data.nickname,
      pin: data.pin,
    };
    setUser(authUser);
    return { user: authUser };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    fetch("/api/auth/logout", { method: "POST" });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refresh, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
