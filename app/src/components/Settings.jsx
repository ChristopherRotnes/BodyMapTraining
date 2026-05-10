import { useEffect, useState } from "react";
import { Toggle, Button, RadioButtonGroup, RadioButton, Tag, TextInput, InlineNotification, Accordion, AccordionItem } from "@carbon/react";
import { ChevronDown, ChevronUp } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, PageHeading, useNavHints } from "./PageShell";
import BodyPanel from "./BodyPanel";
import { useTheme } from "../theme";
import { supabase } from "../lib/supabase";
import { fetchDisplayName, updateDisplayName } from "../lib/db";
import i18n from "../lib/i18n";
import { version } from "../../package.json";
import { CHANGELOG } from "../lib/changelog";

const PREVIEW_PRIMARY = ["chest", "quads", "lats"];
const PREVIEW_SECONDARY = ["shoulders_front", "hamstrings", "triceps"];

const cardStyle = {
  background: "var(--cds-layer-01)",
  border: "1px solid var(--cds-border-subtle-01)",
  borderRadius: "var(--r-card)",
  padding: 16,
  marginBottom: 16,
};

const MONTHS = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

function CollapsibleSection({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          borderInlineStart: "3px solid var(--accent)",
          cursor: "pointer",
          fontFamily: "var(--cds-font-mono)",
          fontSize: 12,
          fontWeight: 400,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--cds-text-secondary)",
          paddingInlineStart: 13,
          paddingTop: 8,
          paddingBottom: 8,
          paddingRight: 8,
          margin: "16px 16px 0",
          width: "calc(100% - 32px)",
        }}
      >
        {label}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && children}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [navHints, setNavHints] = useNavHints();
  const [userEmail, setUserEmail] = useState("");
  const [lang, setLang] = useState(() => localStorage.getItem("wl-lang") || "nb");
  const [displayName, setDisplayName] = useState("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [displayNameError, setDisplayNameError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
    fetchDisplayName().then(name => { if (name) setDisplayName(name); }).catch(() => {});
  }, []);

  async function handleDisplayNameSave() {
    setDisplayNameSaving(true);
    setDisplayNameSaved(false);
    setDisplayNameError(null);
    try {
      await updateDisplayName(displayName);
      setDisplayNameSaved(true);
    } catch {
      setDisplayNameError(t("settings.displayNameError"));
    } finally {
      setDisplayNameSaving(false);
    }
  }

  function handleLangChange(val) {
    setLang(val);
    i18n.changeLanguage(val);
    localStorage.setItem("wl-lang", val);
  }

  return (
    <PageShell>
      <PageHeading>{t("settings.heading")}</PageHeading>

      <CollapsibleSection label={t("settings.language")}>
        <div style={{ padding: "12px 16px 24px" }}>
          <div style={cardStyle}>
            <RadioButtonGroup
              name="language-selector"
              valueSelected={lang}
              onChange={handleLangChange}
              legendText=""
              orientation="vertical"
            >
              <RadioButton labelText={t("settings.languageNorwegian")} value="nb" id="lang-nb" />
              <RadioButton labelText={t("settings.languageEnglish")} value="en" id="lang-en" />
              <RadioButton labelText={t("settings.languagePersian")} value="fa" id="lang-fa" />
            </RadioButtonGroup>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection label={t("settings.appearance")}>
        <div style={{ padding: "12px 16px 24px" }}>
          <div style={cardStyle}>
            <Toggle
              id="theme-toggle"
              labelText={t("settings.darkTheme")}
              labelA={t("settings.darkThemeOff")}
              labelB={t("settings.darkThemeOn")}
              toggled={theme === "g100"}
              onToggle={(checked) => setTheme(checked ? "g100" : "g10")}
            />
            <div style={{ marginTop: 16 }}>
              <Toggle
                id="nav-hints-toggle"
                labelText={t("settings.navHints")}
                labelA={t("settings.darkThemeOff")}
                labelB={t("settings.darkThemeOn")}
                toggled={navHints}
                onToggle={setNavHints}
              />
            </div>
          </div>
          <BodyPanel
            primary={PREVIEW_PRIMARY}
            secondary={PREVIEW_SECONDARY}
            marginBottom={0}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection label={t("settings.myGym")}>
        <div style={{ padding: "12px 16px 24px" }}>
          <div style={cardStyle}>
            <Tag type="green" size="md" style={{ marginBottom: 8 }}>
              {t("settings.myGymMembership")}
            </Tag>
            <p style={{
              color: "var(--cds-text-secondary)",
              fontFamily: "var(--cds-font-sans)",
              fontSize: 13,
              margin: 0,
            }}>
              {t("settings.myGymFutureHint")}
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection label={t("settings.contact")}>
        <div style={{ padding: "12px 16px 24px" }}>
          <div style={cardStyle}>
            <p style={{
              color: "var(--cds-text-secondary)",
              fontFamily: "var(--cds-font-sans)",
              fontSize: 14,
              margin: "0 0 16px",
            }}>
              {t("settings.contactBody")}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button kind="ghost" size="sm" href="mailto:workout@umulig.org">
                {t("settings.sendEmail")}
              </Button>
              <Button
                kind="ghost"
                size="sm"
                href="https://github.com/ChristopherRotnes/BodyMapTraining/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("settings.reportGithub")}
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection label={t("settings.about")}>
        <div style={{ padding: "12px 16px 8px" }}>
          <p style={{
            color: "var(--cds-text-secondary)",
            fontFamily: "var(--cds-font-mono)",
            fontSize: 13,
            margin: "0 0 12px",
            letterSpacing: "0.06em",
          }}>
            v{version}
          </p>
          <Accordion>
            {CHANGELOG.slice(0, 15).map((entry, i) => (
              <AccordionItem
                key={entry.version}
                title={`v${entry.version} — ${formatDate(entry.date)}`}
                open={i === 0}
              >
                <ul style={{
                  margin: "0 0 8px",
                  paddingLeft: 20,
                  color: "var(--cds-text-secondary)",
                  fontFamily: "var(--cds-font-sans)",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}>
                  {entry.items.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </CollapsibleSection>

      <SectionLabel style={{ marginTop: 24 }}>{t("settings.account")}</SectionLabel>
      <div style={{ padding: "0 16px 32px" }}>
        <div style={{ ...cardStyle, marginBottom: 0 }}>
          <p style={{
            color: "var(--cds-text-secondary)",
            fontFamily: "var(--cds-font-sans)",
            fontSize: 14,
            margin: "0 0 16px",
          }}>
            {userEmail}
          </p>
          <p style={{
            color: "var(--cds-text-secondary)",
            fontFamily: "var(--cds-font-sans)",
            fontSize: 13,
            margin: "0 0 16px",
            lineHeight: 1.5,
          }}>
            {t("settings.dataSharingNote")}
          </p>
          <div style={{ marginBottom: 16 }}>
            <TextInput
              id="display-name"
              labelText={t("settings.displayNameLabel")}
              placeholder={t("settings.displayNamePlaceholder")}
              value={displayName}
              maxLength={50}
              onChange={e => { setDisplayName(e.target.value); setDisplayNameSaved(false); }}
            />
            {displayNameSaved && (
              <p style={{ fontSize: 12, color: "var(--cds-support-success)", marginTop: 4, fontFamily: "var(--cds-font-sans)" }}>
                {t("settings.displayNameSaved")}
              </p>
            )}
            {displayNameError && (
              <InlineNotification kind="error" title={displayNameError} hideCloseButton style={{ marginTop: 8 }} />
            )}
            <Button
              kind="secondary"
              size="sm"
              onClick={handleDisplayNameSave}
              disabled={displayNameSaving}
              style={{ marginTop: 8 }}
            >
              {displayNameSaving ? t("common.saving") : t("settings.displayNameSave")}
            </Button>
          </div>
          <Button kind="danger" size="sm" onClick={() => supabase.auth.signOut()}>
            {t("settings.signOut")}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
