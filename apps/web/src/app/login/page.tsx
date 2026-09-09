"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await signIn("credentials", { email, password, redirect: false });
    } catch (_err) {
      setError("Sign in failed. Please check your credentials.");
    }
  };

  return (
    <div style={{ maxWidth: 400, padding: 20, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>Sign In</h2>
      {error && <p style={{ color: "red", marginBottom: 15 }}>{error}</p>}
      <form onSubmit={(e) => {
        void handleSubmit(e);
      }}>
        <div style={{ marginBottom: 15 }}>
          <label htmlFor="email" style={{ display: "block", marginBottom: 5 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="password" style={{ display: "block", marginBottom: 5 }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
        <button
          type="submit"
          style={{ width: "100%", padding: 10, background: "#3b82f6", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Sign In
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 12 }}>
        Don't have an account? <a href="#" style={{ color: "#3b82f6" }}>Sign up</a>
      </p>
    </div>
  );
}