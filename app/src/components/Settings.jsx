import { useEffect, useState } from "react";
import { Toggle, Button, RadioButtonGroup, RadioButton } from "@carbon/react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";
import BodyPanel from "./BodyPanel";
import ChangelogModal from "./ChangelogModal";
import { useTheme } from "../theme";
import { supabase } from "../lib/supabase";
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

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
          <Button kind="danger" size="sm" onClick={() => supabase.auth.signOut()}>
            {t("settings.signOut")}
          </Button>
        </div>
      </div>

      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </PageShell>
  );
}
