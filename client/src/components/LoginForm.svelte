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

  $: displayError = localError || $authState.error || "";
</script>

<div class="h-screen w-screen bg-chad-bg-darkest flex items-center justify-center p-8 overflow-hidden" style="-webkit-app-region: drag;">
  <div class="bg-chad-bg p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-chad-border" style="-webkit-app-region: no-drag;">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-chad-text-primary tracking-tight">ChadVC</h1>
      <p class="text-chad-text-muted mt-2 text-[13px]">
        {isRegister ? "Create an account to get started" : "Sign in to continue"}
      </p>
    </div>

    <form on:submit={handleSubmit} class="space-y-4">
      {#if isRegister}
        <div>
          <label for="username" class="block text-[11px] font-bold text-chad-text-muted tracking-widest uppercase mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            bind:value={username}
            placeholder="Enter username"
            class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded-md border border-chad-border focus:border-chad-border-focus focus:outline-none text-chad-text-primary placeholder-chad-text-muted text-[14px] transition-colors"
            disabled={$authState.isLoading}
          />
        </div>
      {/if}

      <div>
        <label for="email" class="block text-[11px] font-bold text-chad-text-muted tracking-widest uppercase mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="Enter email"
          class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded-md border border-chad-border focus:border-chad-border-focus focus:outline-none text-chad-text-primary placeholder-chad-text-muted text-[14px] transition-colors"
          disabled={$authState.isLoading}
        />
      </div>

      <div>
        <label for="password" class="block text-[11px] font-bold text-chad-text-muted tracking-widest uppercase mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Enter password"
          class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded-md border border-chad-border focus:border-chad-border-focus focus:outline-none text-chad-text-primary placeholder-chad-text-muted text-[14px] transition-colors"
          disabled={$authState.isLoading}
        />
      </div>

      {#if isRegister}
        <div>
          <label for="confirmPassword" class="block text-[11px] font-bold text-chad-text-muted tracking-widest uppercase mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Confirm password"
            class="w-full px-3 py-2.5 bg-chad-bg-darkest rounded-md border border-chad-border focus:border-chad-border-focus focus:outline-none text-chad-text-primary placeholder-chad-text-muted text-[14px] transition-colors"
            disabled={$authState.isLoading}
          />
        </div>
      {/if}

      {#if displayError}
        <div class="text-red-400 text-[13px] bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-md font-medium">{displayError}</div>
      {/if}

      <button
        type="submit"
        disabled={$authState.isLoading}
        class="w-full px-4 py-2.5 mt-2 bg-chad-accent hover:bg-chad-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-semibold transition-colors text-white text-[14px] shadow-sm"
      >
        {$authState.isLoading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
      </button>
    </form>

    <div class="mt-6 text-center">
      <button
        on:click={toggleMode}
        disabled={$authState.isLoading}
        class="text-chad-text-secondary hover:text-chad-text-primary text-[13px] font-medium disabled:cursor-not-allowed transition-colors"
      >
        {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
      </button>
    </div>

    <div class="mt-8 text-[11px] text-chad-text-muted text-center font-medium">
      Make sure the server is running on localhost:8080
    </div>
  </div>
</div>
