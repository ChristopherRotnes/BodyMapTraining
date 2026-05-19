import { useEffect, useState } from "react";
import { ArrowLeft } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import PageShell from "./PageShell";
import { useTheme, useNavHints } from "../lib/hooks";
import { supabase } from "../lib/supabase";
import { fetchDisplayName, updateDisplayName } from "../lib/db";
import i18n from "../lib/i18n";
import { version } from "../../package.json";

const LANGUAGES = [
  { id: "nb", key: "settings.languageNorwegian" },
  { id: "en", key: "settings.languageEnglish" },
  { id: "fa", key: "settings.languagePersian", dir: "rtl" },
];

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-wl)" strokeWidth="1.6"
      style={{ width: 12, height: 12, flexShrink: 0 }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function CompactToggle({ on, onChange, ariaLabel }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 999, border: 0, padding: 0,
        background: on ? "var(--accent)" : "var(--cds-border-subtle-01)",
        position: "relative", cursor: "pointer", flexShrink: 0,
        transition: "background .15s ease",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left .15s ease",
        display: "block",
      }} />
    </button>
  );
}

function GroupLabel({ children }) {
  return (
    <div style={{
      fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: ".18em",
      color: "var(--text-muted-wl)", textTransform: "uppercase",
      marginTop: 22, marginBottom: 10, paddingLeft: 2,
    }}>{children}</div>
  );
}

function RowLink({ label, value, onClick, last = false }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", width: "100%", gap: 10,
      padding: "14px 2px", background: "transparent", border: 0,
      borderBottom: last ? 0 : "1px solid var(--border-subtle-wl)",
      cursor: "pointer", textAlign: "left",
    }}>
      <div style={{
        flex: 1, fontSize: 13.5, color: "var(--cds-text-primary)",
        fontWeight: 500, fontFamily: "var(--cds-font-sans)",
      }}>{label}</div>
      {value && (
        <div style={{
          fontSize: 12.5, color: "var(--cds-text-secondary)",
          fontFamily: "var(--cds-font-sans)",
        }}>{value}</div>
      )}
      <ChevronRight />
    </button>
  );
}

function RowToggle({ label, hint, on, onChange, last = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 2px",
      borderBottom: last ? 0 : "1px solid var(--border-subtle-wl)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, color: "var(--cds-text-primary)",
          fontWeight: 500, fontFamily: "var(--cds-font-sans)",
        }}>{label}</div>
        {hint && (
          <div style={{
            fontSize: 11.5, color: "var(--text-muted-wl)",
            marginTop: 2, fontFamily: "var(--cds-font-sans)",
          }}>{hint}</div>
        )}
      </div>
      <CompactToggle on={on} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

function BackHeader({ onBack }) {
  const { t } = useTranslation();
  return (
    <button onClick={onBack} style={{
      display: "flex", alignItems: "center", gap: 6, background: "transparent",
      border: 0, cursor: "pointer", color: "var(--cds-text-secondary)",
      fontFamily: "var(--cds-font-sans)", fontSize: 13, padding: "8px 0",
      marginBottom: 20,
    }}>
      <ArrowLeft size={16} />
      {t("common.back")}
    </button>
  );
}

function SubHeading({ children }) {
  return (
    <div style={{
      fontFamily: "var(--cond)", fontSize: 22, fontWeight: 600,
      color: "var(--cds-text-primary)", letterSpacing: "-.01em", marginBottom: 24,
    }}>{children}</div>
  );
}

export default function Settings({ onShowIntro }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [navHints, setNavHints] = useNavHints();
  const [view, setView] = useState("main"); // "main" | "profile" | "sharing"
  const [langOpen, setLangOpen] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [lang, setLang] = useState(() => localStorage.getItem("wl-lang") || "nb");
  const [displayName, setDisplayName] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [displayNameError, setDisplayNameError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
    fetchDisplayName().then(name => {
      if (name) { setDisplayName(name); setDisplayNameDraft(name); }
    }).catch(() => {});
  }, []);

  function openProfile() {
    setDisplayNameDraft(displayName);
    setDisplayNameSaved(false);
    setDisplayNameError(null);
    setView("profile");
  }

  function handleLangChange(id) {
    setLang(id);
    i18n.changeLanguage(id);
    localStorage.setItem("wl-lang", id);
    setLangOpen(false);
  }

  async function handleDisplayNameSave() {
    const trimmed = displayNameDraft.trim();
    if (!trimmed || trimmed.length > 50) return;
    setDisplayNameSaving(true);
    setDisplayNameSaved(false);
    setDisplayNameError(null);
    try {
      await updateDisplayName(trimmed);
      setDisplayName(trimmed);
      setDisplayNameDraft(trimmed);
      setDisplayNameSaved(true);
    } catch {
      setDisplayNameError(t("settings.displayNameError"));
    } finally {
      setDisplayNameSaving(false);
    }
  }

  const langLabel = t(LANGUAGES.find(l => l.id === lang)?.key ?? "settings.languageNorwegian");
  const initials = (displayName || userEmail)
    ? (displayName || userEmail).trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("")
    : "?";
  const isDirty = displayNameDraft !== displayName;

  // ── PROFILE EDITOR ─────────────────────────────────────────────────────────
  if (view === "profile") {
    return (
      <PageShell>
        <div style={{ padding: "0 16px 32px" }}>
          <BackHeader onBack={() => setView("main")} />
          <SubHeading>{t("settings.profileEditorTitle")}</SubHeading>

          <div style={{
            fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--text-muted-wl)",
            textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 6,
          }}>
            {t("settings.displayNameLabel")}
          </div>
          <input
            value={displayNameDraft}
            onChange={e => { setDisplayNameDraft(e.target.value); setDisplayNameSaved(false); }}
            maxLength={50}
            placeholder={t("settings.displayNamePlaceholder")}
            style={{
              width: "100%", padding: "10px 0 8px", boxSizing: "border-box",
              background: "transparent", border: 0,
              borderBottom: "1px solid var(--cds-border-strong-01)",
              color: "var(--cds-text-primary)", fontFamily: "var(--cds-font-sans)",
              fontSize: 16, outline: "none", marginBottom: 6,
            }}
          />
          <div style={{
            fontSize: 11.5, color: "var(--text-muted-wl)",
            fontFamily: "var(--cds-font-sans)", marginBottom: 16,
          }}>
            {t("settings.displayNameHint")}
          </div>

          {displayNameError && (
            <div style={{
              fontSize: 12, color: "var(--cds-support-error)",
              fontFamily: "var(--cds-font-sans)", marginBottom: 8,
            }}>{displayNameError}</div>
          )}
          {displayNameSaved && !isDirty && (
            <div style={{
              fontSize: 12, color: "var(--cds-support-success)",
              fontFamily: "var(--cds-font-sans)", marginBottom: 8,
            }}>{t("settings.displayNameSaved")}</div>
          )}

          <button
            onClick={handleDisplayNameSave}
            disabled={displayNameSaving || !isDirty || !displayNameDraft.trim()}
            style={{
              padding: "10px 20px", background: "var(--accent-active)", color: "#fff",
              border: 0, cursor: "pointer", fontFamily: "var(--cds-font-sans)",
              fontSize: 13, fontWeight: 500,
              opacity: (displayNameSaving || !isDirty || !displayNameDraft.trim()) ? 0.45 : 1,
              transition: "opacity .15s ease",
            }}
          >
            {displayNameSaving ? t("common.saving") : t("settings.displayNameSave")}
          </button>

          <div style={{
            marginTop: 32, paddingTop: 16,
            borderTop: "1px solid var(--border-subtle-wl)",
          }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--text-muted-wl)",
              textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 6,
            }}>
              E-post
            </div>
            <div style={{
              fontSize: 13, fontFamily: "var(--cds-font-mono)",
              color: "var(--cds-text-secondary)",
            }}>{userEmail}</div>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── SHARING SHEET ──────────────────────────────────────────────────────────
  if (view === "sharing") {
    const sections = [
      { titleKey: "settings.sharingWhatTitle", bodyKey: "settings.sharingWhatBody" },
      { titleKey: "settings.sharingWithTitle", bodyKey: "settings.sharingWithBody" },
      { titleKey: "settings.sharingWhyTitle",  bodyKey: "settings.sharingWhyBody"  },
      { titleKey: "settings.sharingContactTitle", bodyKey: "settings.sharingContactBody" },
    ];
    return (
      <PageShell>
        <div style={{ padding: "0 16px 32px" }}>
          <BackHeader onBack={() => setView("main")} />
          <SubHeading>{t("settings.sharingSheetTitle")}</SubHeading>

          {sections.map(({ titleKey, bodyKey }, i) => (
            <div key={titleKey} style={{
              marginBottom: i < sections.length - 1 ? 24 : 0,
              paddingBottom: i < sections.length - 1 ? 24 : 0,
              borderBottom: i < sections.length - 1 ? "1px solid var(--border-subtle-wl)" : 0,
            }}>
              <div style={{
                fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--text-muted-wl)",
                textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 6,
              }}>
                {t(titleKey)}
              </div>
              <div style={{
                fontSize: 13.5, color: "var(--cds-text-secondary)",
                fontFamily: "var(--cds-font-sans)", lineHeight: 1.6,
              }}>
                {t(bodyKey)}
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  // ── MAIN PAGE ──────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div style={{ padding: "0 16px 32px" }}>

        {/* IDENTITY HERO */}
        <button
          onClick={openProfile}
          style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            padding: "16px 2px 14px", background: "transparent", border: 0,
            borderBottom: "1px solid var(--border-subtle-wl)",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: "var(--accent-bg-14)", color: "var(--accent)",
            border: "1.5px solid var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--cond)", fontWeight: 600, fontSize: 22,
            letterSpacing: "-.02em",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--cond)", fontSize: 20, fontWeight: 600,
              color: "var(--cds-text-primary)", letterSpacing: "-.01em",
            }}>
              {displayName || userEmail.split("@")[0]}
            </div>
            <div style={{
              fontFamily: "var(--cds-font-mono)", fontSize: 11,
              color: "var(--text-muted-wl)", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {userEmail}
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "2px 8px", borderRadius: "var(--r-pill)",
                border: "1px solid rgba(66,190,101,.3)",
                background: "rgba(66,190,101,.12)",
                fontSize: 11, color: "#7af2a4",
                fontFamily: "var(--cds-font-sans)", fontWeight: 500,
              }}>
                Sporty Thon Senter Ski
              </span>
            </div>
          </div>
          <ChevronRight />
        </button>

        {/* PRIVACY DISCLOSURE */}
        <button
          onClick={() => setView("sharing")}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "12px 2px", background: "transparent", border: 0,
            borderBottom: "1px solid var(--border-subtle-wl)",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            flex: 1, fontSize: 11.5, color: "var(--text-muted-wl)",
            lineHeight: 1.5, fontFamily: "var(--cds-font-sans)",
          }}>
            {t("settings.privacyDisclosure")}
          </div>
          <span style={{
            fontSize: 11.5, color: "var(--cds-text-secondary)",
            whiteSpace: "nowrap", fontFamily: "var(--cds-font-sans)",
          }}>
            {t("settings.privacyDisclosureCta")}
          </span>
          <ChevronRight />
        </button>

        {/* H1 */}
        <div style={{
          fontFamily: "var(--cond)", fontSize: 22, fontWeight: 600,
          color: "var(--cds-text-primary)", letterSpacing: "-.01em",
          marginTop: 22, marginBottom: 4,
        }}>
          {t("settings.heading")}
        </div>

        {/* APPEN */}
        <GroupLabel>{t("settings.groupApp")}</GroupLabel>
        <div>
          <RowLink
            label={t("settings.language")}
            value={langLabel}
            onClick={() => setLangOpen(o => !o)}
          />
          {langOpen && (
            <div style={{ borderBottom: "1px solid var(--border-subtle-wl)" }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => handleLangChange(l.id)}
                  dir={l.dir ?? "ltr"}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "11px 8px 11px 16px",
                    background: lang === l.id ? "var(--accent-bg-08)" : "transparent",
                    border: 0, borderBottom: "1px solid var(--border-subtle-wl)",
                    cursor: "pointer", fontFamily: "var(--cds-font-sans)",
                    fontSize: 13, color: "var(--cds-text-primary)", textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${lang === l.id ? "var(--accent)" : "var(--text-muted-wl)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {lang === l.id && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "block" }} />
                    )}
                  </span>
                  <span style={{ fontWeight: lang === l.id ? 600 : 400 }}>{t(l.key)}</span>
                </button>
              ))}
            </div>
          )}
          <RowToggle
            label={t("settings.darkTheme")}
            on={theme === "g100"}
            onChange={checked => setTheme(checked ? "g100" : "g10")}
          />
          <RowToggle
            label={t("settings.navHints")}
            hint={t("settings.navHintsHint")}
            on={navHints}
            onChange={setNavHints}
            last
          />
        </div>

        {/* HJELP */}
        <GroupLabel>{t("settings.groupHelp")}</GroupLabel>
        <div>
          {onShowIntro && (
            <RowLink
              label={t("settings.showIntroGuide")}
              onClick={onShowIntro}
            />
          )}
          <RowLink
            label={t("settings.sendFeedback")}
            value={t("settings.feedbackVia")}
            onClick={() => { window.location.href = "mailto:workout@umulig.org"; }}
            last
          />
        </div>

        {/* SIGN OUT */}
        <div style={{
          marginTop: 30, paddingTop: 14,
          borderTop: "1px solid var(--border-subtle-wl)",
        }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: "transparent", border: 0, padding: "8px 2px",
              color: "#ff7a7a", fontSize: 12.5, fontFamily: "var(--cds-font-sans)",
              fontWeight: 500, cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: 3,
            }}
          >
            {t("settings.signOutFull")}
          </button>
          <div style={{
            fontSize: 11, color: "var(--text-muted-wl)",
            fontFamily: "var(--cds-font-sans)", marginTop: 4,
          }}>
            {t("settings.signOutHint")}
          </div>
        </div>

        {/* VERSION STAMP */}
        <div style={{
          fontFamily: "var(--cds-font-mono)", fontSize: 10,
          color: "var(--text-muted-wl)", letterSpacing: ".06em",
          paddingTop: 14, paddingBottom: 6,
        }}>
          Workout Lens · v{version}
        </div>

      </div>
    </PageShell>
  );
}
