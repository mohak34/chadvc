import { useState } from "react";
import { useAuthStore } from "../stores/authStore";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const { login, register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (isRegister) {
      if (!username.trim()) {
        setLocalError("Please enter a username");
        return;
      }
      if (username.trim().length < 3) {
        setLocalError("Username must be at least 3 characters");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters");
        return;
      }

      const success = await register(username.trim(), email.trim(), password);
      if (success) {
        onLoginSuccess();
      }
    } else {
      if (!email.trim()) {
        setLocalError("Please enter your email");
        return;
      }
      if (!password) {
        setLocalError("Please enter your password");
        return;
      }

      const success = await login(email.trim(), password);
      if (success) {
        onLoginSuccess();
      }
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setLocalError("");
    clearError();
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-chad-bg-darkest flex items-center justify-center p-8">
      <div className="bg-chad-bg-dark p-8 rounded-lg shadow-2xl w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-chad-platinum">Welcome to ChadVC</h1>
          <p className="text-chad-muted mt-2 text-sm">
            {isRegister ? "Create an account to get started" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-chad-muted uppercase mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-chad-muted uppercase mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-chad-muted uppercase mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
              disabled={isLoading}
            />
          </div>

          {isRegister && (
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-chad-muted uppercase mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
                disabled={isLoading}
              />
            </div>
          )}

          {displayError && (
            <div className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-chad-lavender hover:bg-chad-lavender-light disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors text-white text-sm"
          >
            {isLoading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={toggleMode}
            disabled={isLoading}
            className="text-chad-steel hover:text-chad-steel-light text-sm disabled:cursor-not-allowed transition-colors"
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Need an account? Register"}
          </button>
        </div>

        <div className="mt-6 text-xs text-chad-muted text-center">
          Make sure the server is running on localhost:8080
        </div>
      </div>
    </div>
  );
}
