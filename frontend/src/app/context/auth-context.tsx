
"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "@/app/services/auth";

import { initializeCsrf } from "@/app/services/api";

import type {
  User,
  LoginData,
  RegisterData,
} from "@/app/types/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function initializeAuth() {
      try {
        await initializeCsrf();
        await refreshUser();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();
  }, [refreshUser]);

  const login = async (data: LoginData) => {
    await initializeCsrf();
    const response = await loginUser(data);
    setUser(response.user);
  };

  const register = async (data: RegisterData) => {
    await initializeCsrf();
    const response = await registerUser(data);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
