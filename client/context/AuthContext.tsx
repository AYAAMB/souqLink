import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/lib/query-client";

export type UserRole = "admin" | "courier" | "customer";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;

  // ✅ login now needs password
  login: (email: string, password: string, role?: UserRole) => Promise<void>;

  // ✅ register added
  register: (email: string, name: string, phone: string, password: string, role?: UserRole) => Promise<void>;

  // ✅ Added: forgot/reset password using SAME API FILE (/api/auth/login)
  // (on garde message, mais on autorise aussi otp en DEV si l'API le renvoie)
  forgotPassword: (email: string) => Promise<{ message: string; otp?: string | null; expiresInMinutes?: number }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isCourier: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@souqlink_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ petit helper: parser JSON en sécurité (si 500 HTML, ça évite crash)
  const safeJson = async (response: Response) => {
    try {
      return await response.json();
    } catch {
      return null;
    }
  };

  // ✅ Connexion
  const login = async (email: string, password: string, role: UserRole = "customer") => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
        role,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data?.error || "Echec de connexion. Veuillez réessayer.");
      }

      setUser(data);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  // ✅ Inscription
  const register = async (
    email: string,
    name: string,
    phone: string,
    password: string,
    role: UserRole = "customer"
  ) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email,
        name,
        phone,
        password,
        role,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data?.error || "Echec d'inscription. Veuillez réessayer.");
      }

      setUser(data);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Register failed:", error);
      throw error;
    }
  };

  // ✅ Mot de passe oublié (OTP) -> même endpoint /api/auth/login
  const forgotPassword = async (email: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        action: "forgot_password",
        email,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data?.error || "Impossible d'envoyer le code.");
      }

      return data as { message: string; otp?: string | null; expiresInMinutes?: number };
    } catch (error) {
      console.error("Forgot password failed:", error);
      throw error;
    }
  };

  // ✅ Réinitialiser via OTP -> même endpoint /api/auth/login
  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        action: "reset_password",
        email,
        otp,
        newPassword,
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data?.error || "Réinitialisation impossible.");
      }

      return data as { message: string };
    } catch (error) {
      console.error("Reset password failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ✅ refreshUser: recharger user depuis storage
  const refreshUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser,
    isAdmin: user?.role === "admin",
    isCourier: user?.role === "courier",
    isCustomer: user?.role === "customer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
