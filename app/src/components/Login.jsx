import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, TextInput, InlineNotification } from "@carbon/react";
import { Email } from "@carbon/icons-react";

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
    <div style={{
      background: "var(--cds-background)",
      minHeight: "100vh",
      color: "var(--cds-text-primary)",
      fontFamily: "var(--cds-font-sans)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px" }}>
        <div style={{
          fontFamily: "var(--cds-font-sans)",
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "var(--cds-text-primary)",
          marginBottom: 8,
        }}>
          Workout Lens
        </div>
        <div style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 32 }}>
          Logg inn for å fortsette
        </div>

        {sent ? (
          <div style={{
            background: "var(--cds-layer-01)",
            border: "1px solid var(--cds-border-subtle-01)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}>
            <Email size={32} style={{ color: "var(--cds-interactive)" }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sjekk e-posten din</div>
            <div style={{ fontSize: 13, color: "var(--cds-text-secondary)", textAlign: "center" }}>
              Vi sendte en innloggingslenke til <strong style={{ color: "var(--cds-text-primary)" }}>{email}</strong>
            </div>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TextInput
              id="email"
              type="email"
              labelText="E-postadresse"
              placeholder="din@epost.no"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && (
              <InlineNotification
                kind="error"
                title="Innlogging feilet:"
                subtitle={error}
                hideCloseButton
               
              />
            )}
            <Button
              type="submit"
              kind="primary"
              disabled={loading || !email}
              style={{ width: "100%", maxWidth: "100%" }}
            >
              {loading ? "Sender…" : "Send innloggingslenke"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
