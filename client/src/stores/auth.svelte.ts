import { get, writable } from "svelte/store";
import { clearSessionId } from "../lib/session";

const API_BASE_URL = "http://localhost:8080";

export interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isValidating: false,
  error: null,
};

function loadPersistedState(): Partial<AuthState> {
  const stored = localStorage.getItem("chadvc-auth");
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as Partial<AuthState>;
  } catch {
    return {};
  }
}

export const authState = writable<AuthState>({
  ...initialState,
  ...loadPersistedState(),
});

authState.subscribe((state) => {
  const persisted = {
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
  };
  localStorage.setItem("chadvc-auth", JSON.stringify(persisted));
});

function setAuthError(message: string): void {
  authState.update((state) => ({ ...state, isLoading: false, error: message }));
}

export function clearAuthError(): void {
  authState.update((state) => ({ ...state, error: null }));
}

export async function register(username: string, email: string, password: string): Promise<boolean> {
  authState.update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Registration failed");
    }

    const data = (await response.json()) as AuthResponse;
    authState.update((state) => ({
      ...state,
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }));
    return true;
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : "Registration failed");
    return false;
  }
}

export async function login(email: string, password: string): Promise<boolean> {
  authState.update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Login failed");
    }

    const data = (await response.json()) as AuthResponse;
    authState.update((state) => ({
      ...state,
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }));
    return true;
  } catch (error) {
    setAuthError(error instanceof Error ? error.message : "Login failed");
    return false;
  }
}

export async function logout(): Promise<void> {
  const state = get(authState);
  authState.update((current) => ({ ...current, isLoading: true }));

  try {
    if (state.refreshToken) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: state.refreshToken }),
      });
    }
  } catch {
  } finally {
    clearSessionId();
    authState.set({ ...initialState });
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  const state = get(authState);
  if (!state.refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: state.refreshToken }),
    });

    if (!response.ok) {
      clearSessionId();
      authState.set({ ...initialState });
      return false;
    }

    const data = (await response.json()) as AuthResponse;
    authState.update((current) => ({
      ...current,
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isAuthenticated: true,
    }));
    return true;
  } catch {
    return false;
  }
}

export async function validateSession(): Promise<boolean> {
  const state = get(authState);

  if (!state.isAuthenticated || !state.refreshToken) {
    return false;
  }

  authState.update((current) => ({ ...current, isValidating: true }));

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: state.refreshToken }),
    });

    if (!response.ok) {
      clearSessionId();
      authState.set({ ...initialState });
      return false;
    }

    const data = (await response.json()) as AuthResponse;
    authState.update((current) => ({
      ...current,
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isAuthenticated: true,
      isValidating: false,
    }));
    return true;
  } catch {
    authState.update((current) => ({ ...current, isValidating: false }));
    return true;
  }
}
