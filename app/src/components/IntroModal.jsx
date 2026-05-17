import { useState } from "react";
import { Modal, Button, Theme } from "@carbon/react";
import { Camera, RecentlyViewed, Analytics, EventSchedule, Notebook } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../lib/hooks";
import { PageHeading } from "./PageShell";

const SLIDES = [
  { Icon: Camera, titleKey: "intro.slide1Title", bodyKey: "intro.slide1Body" },
  { Icon: RecentlyViewed, titleKey: "intro.slide2Title", bodyKey: "intro.slide2Body" },
  { Icon: Analytics, titleKey: "intro.slide3Title", bodyKey: "intro.slide3Body" },
  { Icon: EventSchedule, titleKey: "intro.slide4Title", bodyKey: "intro.slide4Body" },
  { Icon: Notebook, titleKey: "intro.slide5Title", bodyKey: "intro.slide5Body" },
];

export default function IntroModal({ open, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);

  function dismiss() {
    localStorage.setItem("wl-intro-seen", "1");
    onClose();
  }

  const { Icon, titleKey, bodyKey } = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <Theme theme={theme === "g100" ? "g100" : "g10"}>
      <style>{`
        .intro-modal .cds--modal-container { max-width: 560px; }
        @media (max-width: 500px) {
          .intro-modal .cds--modal-container {
            max-width: 100%; width: 100%; height: 100%;
            max-height: 100%; border-radius: 0;
          }
        }
      `}</style>
      <Modal
        className="intro-modal"
        open={open}
        onRequestClose={dismiss}
        passiveModal
        modalHeading={t("intro.modalHeading")}
      >
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          minHeight: 180,
          paddingBottom: 8,
        }}>
          <Icon size={64} style={{ color: "var(--accent)", marginBottom: "var(--cds-spacing-05)" }} />
          <PageHeading style={{ fontSize: 22, marginBottom: 8 }}>{t(titleKey)}</PageHeading>
          <p style={{
            color: "var(--cds-text-secondary)",
            fontFamily: "var(--cds-font-sans)",
            fontSize: 14,
            margin: "0 auto",
            maxWidth: 400,
            lineHeight: 1.6,
          }}>
            {t(bodyKey)}
          </p>
        </div>

        <p style={{
          fontFamily: "var(--cds-font-mono)",
          fontSize: 12,
          color: "var(--cds-text-secondary)",
          textAlign: "center",
          margin: "16px 0 0",
        }}>
          {t("intro.stepIndicator", { current: step + 1, total: SLIDES.length })}
        </p>

        {isLast && (
          <p style={{
            fontFamily: "var(--cds-font-mono)",
            fontSize: 11,
            color: "var(--cds-text-secondary)",
            textAlign: "center",
            margin: "4px 0 0",
          }}>
            {t("intro.replayHint")}
          </p>
        )}

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          gap: 8,
        }}>
          <Button kind="ghost" size="sm" onClick={dismiss}>
            {t("intro.skip")}
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <Button kind="secondary" size="sm" onClick={() => setStep(s => s - 1)}>
                {t("intro.prev")}
              </Button>
            )}
            <Button kind="primary" size="sm" onClick={isLast ? dismiss : () => setStep(s => s + 1)}>
              {isLast ? t("intro.start") : t("intro.next")}
            </Button>
          </div>
        </div>
      </Modal>
    </Theme>
  );
}
