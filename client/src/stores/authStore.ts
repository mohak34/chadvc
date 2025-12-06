import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearSessionId } from "../lib/session";

const API_BASE_URL = "http://localhost:8080";

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;

  register: (username: string, email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isValidating: false,
      error: null,

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, password }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Registration failed");
          }

          const data: AuthResponse = await response.json();
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Registration failed",
          });
          return false;
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Login failed");
          }

          const data: AuthResponse = await response.json();
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Login failed",
          });
          return false;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        set({ isLoading: true });

        try {
          if (refreshToken) {
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
          }
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          // Clear session ID
          clearSessionId();
          
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          return false;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            // Refresh token is invalid, logout
            clearSessionId();
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
            });
            return false;
          }

          const data: AuthResponse = await response.json();
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          console.error("Token refresh error:", error);
          return false;
        }
      },

      // Validate the current session on app load
      // This tries to refresh the token to ensure we have a valid session
      validateSession: async () => {
        const { refreshToken, isAuthenticated } = get();
        
        // If not authenticated, nothing to validate
        if (!isAuthenticated || !refreshToken) {
          return false;
        }

        set({ isValidating: true });

        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            // Session is invalid, clear auth state
            console.log("[Auth] Session validation failed, logging out");
            clearSessionId();
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isValidating: false,
            });
            return false;
          }

          const data: AuthResponse = await response.json();
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isValidating: false,
          });
          console.log("[Auth] Session validated successfully");
          return true;
        } catch (error) {
          console.error("[Auth] Session validation error:", error);
          // Network error - keep current state but mark as not validating
          set({ isValidating: false });
          // Return true to allow offline usage with cached tokens
          return true;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "chadvc-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
