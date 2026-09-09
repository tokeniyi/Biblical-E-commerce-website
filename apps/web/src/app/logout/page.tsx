"use client";

import { signOut } from "next-auth/react";

export default function LogoutPage() {
  const handleSignOut = () => {
    void signOut({ redirect: true });
  };

  return (
    <div style={{ maxWidth: 400, padding: 20, margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>Signed Out</h2>
      <p style={{ fontSize: 16, marginBottom: 20 }}>
        You have been successfully signed out.
      </p>
      <button
        onClick={handleSignOut}
        style={{
          padding: "10px 20px",
          background: "#10b981",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Return to Home
      </button>
    </div>
  );
}