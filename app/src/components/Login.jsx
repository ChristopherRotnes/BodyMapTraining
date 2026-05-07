import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { Button, TextInput, InlineNotification } from "@carbon/react";
import { Email } from "@carbon/icons-react";

function getDailyQuote() {
  const now = new Date();
  const mmdd = String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  const special = {
    "01-01": "New year, new training log. Day 1 of 365.",
    "12-24": "Christmas Eve. The gym is empty — that's your advantage.",
  };
  if (special[mmdd]) return special[mmdd];
  return [
    "Sunday isn't a rest day — it's a recharge day.",
    "Monday: the week starts with you.",
    "Tuesday. No Monday dread, no Friday laziness. Just pure drive.",
    "Wednesday — the midpoint. Perfect day for a personal best.",
    "Thursday: one session today and you enter the weekend with a clear conscience.",
    "Friday! Last chance to make the week complete.",
    "Saturday — the best sessions happen when no one expects it.",
  ][now.getDay()];
}

export default function Login() {
  const { t } = useTranslation();
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
        <div style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 12 }}>
          {t("login.subtitle")}
        </div>
        <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--cds-text-secondary)", marginBottom: 32 }}>
          {getDailyQuote()}
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
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t("login.checkEmail")}</div>
            <div style={{ fontSize: 13, color: "var(--cds-text-secondary)", textAlign: "center" }}>
              {t("login.sentTo")} <strong style={{ color: "var(--cds-text-primary)" }}>{email}</strong>
            </div>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TextInput
              id="email"
              type="email"
              labelText={t("login.emailLabel")}
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && (
              <InlineNotification
                kind="error"
                title={t("login.failed")}
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
              {loading ? t("login.sending") : t("login.sendLink")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
