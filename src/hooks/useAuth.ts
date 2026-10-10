"use client";

import { createContext, useContext } from "react";

export interface AuthUser {
  userId: string;
  nickname: string;
  // Известен только в текущей сессии (после логина/регистрации) — на сервер
  // и в localStorage не сохраняется.
  pin?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (pin: string) => Promise<boolean>;
  register: (nickname: string) => Promise<{ user?: AuthUser; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  register: async () => ({}),
  logout: () => {},
  refresh: async () => {},
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}
