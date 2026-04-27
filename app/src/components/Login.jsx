import { useState } from "react";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#0B0B0B", card: "#141414", border: "#242424",
  accent: "#C8FF00", text: "#EEEEEE", muted: "#666",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>
        <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 32, letterSpacing: 4, color: C.accent, marginBottom: 8 }}>
          MUSKELKART
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>
          Logg inn for å fortsette
        </div>

        {sent ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Sjekk e-posten din</div>
            <div style={{ fontSize: 13, color: C.muted }}>Vi sendte en innloggingslenke til <strong style={{ color: C.text }}>{email}</strong></div>
          </div>
        ) : (
          <form onSubmit={handleMagicLink}>
            <input
              type="email"
              placeholder="din@epost.no"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%", padding: "13px 14px", marginBottom: 10,
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 14, outline: "none",
              }}
            />
            {error && (
              <div style={{ color: "#FF4444", fontSize: 13, marginBottom: 10 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: "100%", padding: 13, borderRadius: 8, border: "none",
                background: email ? C.accent : C.border,
                color: email ? "#000" : C.muted,
                fontSize: 14, fontWeight: 600, letterSpacing: "0.5px",
                cursor: email ? "pointer" : "default", transition: "all 0.2s",
              }}
            >
              {loading ? "Sender…" : "SEND INNLOGGINGSLENKE →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
