"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { AuthContext, AuthUser } from "@/hooks/useAuth";

const STORAGE_KEY = "tusovka-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthUser;
        login(parsed.pin).then((ok) => {
          if (!ok) {
            localStorage.removeItem(STORAGE_KEY);
          }
          setIsLoading(false);
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    return { user: authUser };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = "auth-token=; path=/; max-age=0";
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
