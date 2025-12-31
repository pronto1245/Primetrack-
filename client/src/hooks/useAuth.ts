import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  username: string;
  role: string;
  email: string;
  twoFactorSetupCompleted?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        // Redirect to 2FA setup if user never configured it
        if (data.twoFactorSetupCompleted === false && !window.location.pathname.includes("/setup-2fa")) {
          setLocation("/setup-2fa");
        }
      }
    } catch (error) {
      console.error("Auth check failed");
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        queryClient.clear();
        setUser(data);
        setLocation(`/dashboard/${data.role}`);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    queryClient.clear();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setLocation("/login");
  };

  return { user, loading, login, logout, checkAuth };
}
