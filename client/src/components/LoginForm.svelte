<script lang="ts">
  import { authState, clearAuthError, login, register } from "../stores/auth.svelte";

  export let onLoginSuccess: () => void = () => {};

  let isRegister = false;
  let username = "";
  let email = "";
  let password = "";
  let confirmPassword = "";
  let localError = "";
  let displayError = "";

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    localError = "";
    clearAuthError();

    if (isRegister) {
      if (!username.trim()) {
        localError = "Please enter a username";
        return;
      }
      if (username.trim().length < 3) {
        localError = "Username must be at least 3 characters";
        return;
      }
      if (password !== confirmPassword) {
        localError = "Passwords do not match";
        return;
      }
      if (password.length < 6) {
        localError = "Password must be at least 6 characters";
        return;
      }

      const isSuccess = await register(username.trim(), email.trim(), password);
      if (isSuccess) {
        onLoginSuccess();
      }
      return;
    }

    if (!email.trim()) {
      localError = "Please enter your email";
      return;
    }
    if (!password) {
      localError = "Please enter your password";
      return;
    }

    const isSuccess = await login(email.trim(), password);
    if (isSuccess) {
      onLoginSuccess();
    }
  }

  function toggleMode(): void {
    isRegister = !isRegister;
    localError = "";
    clearAuthError();
  }

  $: displayError = localError || $authState.error;
</script>

<div class="min-h-screen bg-chad-bg-darkest flex items-center justify-center p-8">
  <div class="bg-chad-bg-dark p-8 rounded-lg shadow-2xl w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-chad-platinum">Welcome to ChadVC</h1>
      <p class="text-chad-muted mt-2 text-sm">
        {isRegister ? "Create an account to get started" : "Sign in to continue"}
      </p>
    </div>

    <form on:submit={handleSubmit} class="space-y-4">
      {#if isRegister}
        <div>
          <label for="username" class="block text-xs font-medium text-chad-muted uppercase mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            bind:value={username}
            placeholder="Enter username"
            class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
            disabled={$authState.isLoading}
          />
        </div>
      {/if}

      <div>
        <label for="email" class="block text-xs font-medium text-chad-muted uppercase mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="Enter email"
          class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
          disabled={$authState.isLoading}
        />
      </div>

      <div>
        <label for="password" class="block text-xs font-medium text-chad-muted uppercase mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Enter password"
          class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
          disabled={$authState.isLoading}
        />
      </div>

      {#if isRegister}
        <div>
          <label for="confirmPassword" class="block text-xs font-medium text-chad-muted uppercase mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Confirm password"
            class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded border-none focus:ring-2 focus:ring-chad-lavender focus:outline-none text-chad-platinum placeholder-chad-muted text-sm"
            disabled={$authState.isLoading}
          />
        </div>
      {/if}

      {#if displayError}
        <div class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded">{displayError}</div>
      {/if}

      <button
        type="submit"
        disabled={$authState.isLoading}
        class="w-full px-4 py-2.5 bg-chad-lavender hover:bg-chad-lavender-light disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors text-white text-sm"
      >
        {$authState.isLoading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
      </button>
    </form>

    <div class="mt-4 text-center">
      <button
        on:click={toggleMode}
        disabled={$authState.isLoading}
        class="text-chad-steel hover:text-chad-steel-light text-sm disabled:cursor-not-allowed transition-colors"
      >
        {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
      </button>
    </div>

    <div class="mt-6 text-xs text-chad-muted text-center">
      Make sure the server is running on localhost:8080
    </div>
  </div>
</div>
