"use client";

import { useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Session status handling if needed
  }, [status]);

  const handleSignIn = () => {
    void signIn();
  };

  const handleSignOut = () => {
    void signOut({ redirect: true });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 40, textAlign: "center" }}>
      {status === "unauthenticated" && (
        <>
          <h2 style={{ marginBottom: 20 }}>Welcome</h2>
          <p style={{ marginBottom: 20 }}>
            Please sign in to access the platform.
          </p>
          <button
            onClick={handleSignIn}
            style={{
              marginRight: 10,
              padding: "10px 20px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
          <button
            onClick={handleSignIn}
            style={{
              marginLeft: 10,
              padding: "10px 20px",
              background: "white",
              color: "#3b82f6",
              border: "1px solid #3b82f6",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Continue with Google
          </button>
        </>
      )}

      {status === "authenticated" && (
        <>
          <h2 style={{ marginBottom: 20 }}>Welcome Back!</h2>
          <p style={{ marginBottom: 20 }}>
            Hello, {session.user?.email || "User"}!
          </p>
          <button
            onClick={handleSignOut}
            style={{
              marginRight: 10,
              padding: "10px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
          <button
            onClick={() => {
              // Handle sign out another session
            }}
            style={{
              marginLeft: 10,
              padding: "10px 20px",
              background: "white",
              color: "#3b82f6",
              border: "1px solid #3b82f6",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Sign Out Another Session
          </button>
        </>
      )}
    </div>
  );
}