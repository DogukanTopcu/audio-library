"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api, { setAccessToken } from "./api";

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = useCallback(async () => {
    try {
      const storedRefresh = localStorage.getItem("refreshToken");
      if (!storedRefresh) {
        setIsLoading(false);
        return;
      }

      const { data } = await api.post("/auth/refresh", {
        refreshToken: storedRefresh,
      });
      const token = data.data?.accessToken || data.accessToken;
      setAccessToken(token);

      const { data: profileData } = await api.get("/auth/me");
      setUser(profileData.data || profileData);
    } catch {
      setAccessToken(null);
      localStorage.removeItem("refreshToken");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    const result = data.data || data;
    setAccessToken(result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    setUser(result.user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Ignore errors on logout
    }
    setAccessToken(null);
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
