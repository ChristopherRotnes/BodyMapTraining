import { useEffect, useState } from "react";
import { Toggle, Button } from "@carbon/react";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";
import BodyPanel from "./BodyPanel";
import ChangelogModal from "./ChangelogModal";
import { useTheme } from "../theme";
import { supabase } from "../lib/supabase";
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
  const { theme, setTheme } = useTheme();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  return (
    <PageShell>
      <PageHeading>Innstillinger</PageHeading>

      <SectionLabel>Utseende</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
        <div style={cardStyle}>
          <Toggle
            id="theme-toggle"
            labelText="Mørkt tema"
            labelA="Av"
            labelB="På"
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

      <SectionLabel>Konto</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
        <div style={cardStyle}>
          <p style={{
            color: "var(--cds-text-secondary)",
            fontFamily: "var(--cds-font-sans)",
            fontSize: 14,
            margin: "0 0 16px",
          }}>
            {userEmail}
          </p>
          <Button kind="danger" size="sm" onClick={() => supabase.auth.signOut()}>
            Logg ut
          </Button>
        </div>
      </div>

      <SectionLabel>Om appen</SectionLabel>
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
            Vis endringslogg
          </Button>
        </div>
      </div>

      <SectionLabel>Kontakt</SectionLabel>
      <div style={{ padding: "0 16px 24px" }}>
        <div style={cardStyle}>
          <p style={{
            color: "var(--cds-text-secondary)",
            fontFamily: "var(--cds-font-sans)",
            fontSize: 14,
            margin: "0 0 16px",
          }}>
            Har du tilbakemeldinger eller fant en feil? Ta gjerne kontakt.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button kind="ghost" size="sm" href="mailto:kontakt@umulig.org" as="a">
              Send e-post
            </Button>
            <Button
              kind="ghost"
              size="sm"
              href="https://github.com/ChristopherRotnes/BodyMapTraining/issues"
              target="_blank"
              rel="noopener noreferrer"
              as="a"
            >
              Rapporter feil på GitHub
            </Button>
          </div>
        </div>
      </div>

      <SectionLabel>Språk</SectionLabel>
      <div style={{ padding: "0 16px 32px" }}>
        <div style={{ ...cardStyle, marginBottom: 0 }}>
          <p style={{
            color: "var(--cds-text-disabled)",
            fontFamily: "var(--cds-font-sans)",
            fontSize: 14,
            margin: 0,
          }}>
            Kommer snart
          </p>
        </div>
      </div>

      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </PageShell>
  );
}
