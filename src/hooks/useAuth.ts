"use client";

import { createContext, useContext } from "react";

export interface AuthUser {
  userId: string;
  nickname: string;
  pin: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (pin: string) => Promise<boolean>;
  register: (nickname: string) => Promise<AuthUser | null>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  register: async () => null,
  logout: () => {},
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}
