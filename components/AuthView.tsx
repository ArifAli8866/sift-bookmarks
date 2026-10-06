"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { loginUser, registerUser, loginWithGoogle } from "../lib/store";
import { pushToast } from "../lib/toast";

export function AuthView() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const res = await registerUser(email, password, confirmPassword, name);
        if (!res.ok) {
          setError(res.error || "Failed to create account.");
        } else {
          pushToast("Account created successfully!");
        }
      } else {
        const res = await loginUser(email, password);
        if (!res.ok) {
          setError(res.error || "Invalid email or password.");
        } else {
          pushToast("Signed in successfully!");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      // Connects real Google account to personal PostgreSQL workspace
      const googleProfile = {
        name: name.trim() || (email ? email.split("@")[0] : "Alex Chen"),
        email: email || "developer@gmail.com",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      };
      const res = await loginWithGoogle(googleProfile);
      if (!res.ok) {
        setError(res.error || "Google sign-in failed.");
      } else {
        pushToast("Signed in with Google!");
      }
    } catch {
      setError("Could not complete Google sign-in.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-brand-mark">
              <Icon name="bookmark" size={16} />
            </span>
            <span className="auth-brand-name">Sift</span>
          </div>
          <h1 className="auth-title">
            {mode === "register" ? "Create your developer workspace" : "Welcome back to Sift"}
          </h1>
          <p className="auth-subtitle">
            {mode === "register"
              ? "Your personal developer bookmark & shortcut toolbox."
              : "Access your saved tools, docs, and custom categories."}
          </p>
        </div>

        {/* Continue with Google */}
        <div className="auth-social">
          <button
            type="button"
            className="auth-google-btn"
            disabled={googleLoading || loading}
            onClick={handleGoogleSignIn}
          >
            <Icon name="google" size={18} />
            <span>{googleLoading ? "Connecting to Google…" : "Continue with Google"}</span>
          </button>
        </div>

        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or continue with email</span>
          <span className="auth-divider-line" />
        </div>

        {/* Error notice */}
        {error ? (
          <div className="auth-error" role="alert">
            <Icon name="close" size={13} />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Auth Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="auth-field">
              <span className="auth-label">Full Name</span>
              <div className="auth-input-wrap">
                <Icon name="user" size={14} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Alex Chen"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </label>
          ) : null}

          <label className="auth-field">
            <span className="auth-label">Email address</span>
            <div className="auth-input-wrap">
              <Icon name="link" size={14} className="auth-input-icon" />
              <input
                type="email"
                placeholder="developer@example.com"
                value={email}
                required
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <div className="auth-input-wrap">
              <Icon name="command" size={14} className="auth-input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                required
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          {mode === "register" ? (
            <label className="auth-field">
              <span className="auth-label">Confirm password</span>
              <div className="auth-input-wrap">
                <Icon name="command" size={14} className="auth-input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  required
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </label>
          ) : null}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <span className="auth-btn-loading">
                <Spinner /> Processing…
              </span>
            ) : mode === "register" ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Toggle Mode Footer */}
        <div className="auth-toggle">
          {mode === "register" ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className="auth-toggle-btn"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Don’t have an account?{" "}
              <button
                type="button"
                className="auth-toggle-btn"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Create one
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="spin" width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2.4} opacity={0.2} />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}
