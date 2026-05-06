import { useEffect, useState } from "react";
import { Toggle, Button, RadioButtonGroup, RadioButton, Tag, TextInput, InlineNotification } from "@carbon/react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";
import BodyPanel from "./BodyPanel";
import ChangelogModal from "./ChangelogModal";
import { useTheme } from "../theme";
import { supabase } from "../lib/supabase";
import { fetchDisplayName, updateDisplayName } from "../lib/db";
import i18n from "../lib/i18n";
import { version } from "../../package.json";

const PREVIEW_PRIMARY = ["chest", "quads", "lats"];
const PREVIEW_SECONDARY = ["shoulders_front", "hamstrings", "triceps"];

const cardStyle = {
  background: "var(--cds-layer-01)",
  border: "1px solid var(--cds-border-subtle-01)",
  borderRadius: "var(--r-card)",
  padding: 16,
  marginBottom: 16,
};

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [changelogOpen, setChangelogOpen] = useState(false);
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

      <SectionLabel>{t("settings.language")}</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
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

      <SectionLabel>{t("settings.appearance")}</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
        <div style={cardStyle}>
          <Toggle
            id="theme-toggle"
            labelText={t("settings.darkTheme")}
            labelA={t("settings.darkThemeOff")}
            labelB={t("settings.darkThemeOn")}
            toggled={theme === "g100"}
            onToggle={(checked) => setTheme(checked ? "g100" : "g10")}
          />
        </div>
        <BodyPanel
          primary={PREVIEW_PRIMARY}
          secondary={PREVIEW_SECONDARY}
          marginBottom={0}
        />
      </div>

      <SectionLabel>{t("settings.myGym")}</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
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

      <SectionLabel>{t("settings.contact")}</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
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
            <Button kind="ghost" size="sm" href="mailto:kontakt@umulig.org">
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

      <SectionLabel>{t("settings.about")}</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
        <div style={cardStyle}>
          <p style={{
            color: "var(--cds-text-secondary)",
            fontFamily: "var(--cds-font-mono)",
            fontSize: 13,
            margin: "0 0 12px",
            letterSpacing: "0.06em",
          }}>
            v{version}
          </p>
          <Button kind="ghost" size="sm" onClick={() => setChangelogOpen(true)}>
            {t("settings.changelog")}
          </Button>
        </div>
      </div>

      <SectionLabel>{t("settings.account")}</SectionLabel>
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

      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </PageShell>
  );
}
