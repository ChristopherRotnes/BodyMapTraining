import { InlineNotification } from "@carbon/react";
import { Add, ArrowRight, Camera, Close } from "@carbon/icons-react";
import { StickyCta } from "./PageShell";
import { useTranslation } from "react-i18next";

export default function MuscleMapUpload({ images, dragging, sizeError, error, fileRef, dispatch, onAnalyze, onShowHome, onShowTemplatePicker, onHandleFiles }) {
  const { t } = useTranslation();
  return (
    <div className="fade-in" style={{ padding: "0 16px" }}>

      <div style={{ fontFamily: "var(--cond)", fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.02em", marginBottom: 28 }}>
        <div style={{ fontSize: 32, color: "var(--cds-text-primary)" }}>{t("muscleMap.heroLine1")}</div>
        <div style={{ fontSize: 52, color: "var(--accent)" }}>{t("muscleMap.heroLine2")}</div>
      </div>

      <p aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
        {images.length > 0 ? t("muscleMap.imageCount", { count: images.length }) : ""}
      </p>

      {images.length === 0 ? (
        <div
          role="region"
          aria-label={t("muscleMap.dropzoneLabel")}
          onDragOver={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: true }); }}
          onDragLeave={() => dispatch({ type: "SET_DRAGGING", dragging: false })}
          onDrop={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: false }); onHandleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1px solid ${dragging ? "var(--accent)" : "var(--accent-bg-30)"}`,
            background: dragging ? "var(--accent-bg-14)" : "var(--accent-bg-08)",
            borderRadius: 16,
            marginBottom: 14,
            cursor: "pointer",
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 120ms ease, border-color 120ms ease",
          }}
        >
          <div style={{ textAlign: "center", padding: "48px 20px 40px" }}>
            <div style={{
              width: 64, height: 64,
              borderRadius: "50%",
              background: "var(--accent-bg-14)",
              boxShadow: "0 0 32px var(--accent-bg-55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Camera size={28} aria-hidden="true" style={{ color: "var(--accent)" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t("muscleMap.dropzoneClick")}</p>
            <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{t("muscleMap.dropzoneDrag")}</p>
          </div>
        </div>
      ) : (
        <div
          role="region"
          aria-label={t("muscleMap.dropzoneLabel")}
          onDragOver={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: true }); }}
          onDragLeave={() => dispatch({ type: "SET_DRAGGING", dragging: false })}
          onDrop={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: false }); onHandleFiles(e.dataTransfer.files); }}
          style={{ marginBottom: 14 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {images.map((img, idx) => (
              <div key={img.id} style={{ position: "relative", overflow: "hidden", aspectRatio: "1", background: "var(--cds-layer-01)" }}>
                <img src={img.preview} alt={t("muscleMap.imageAlt", { n: idx + 1 })} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button
                  aria-label={t("muscleMap.removeImage", { n: idx + 1 })}
                  onClick={() => dispatch({ type: "REMOVE_IMAGE", id: img.id })}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    background: "var(--cds-layer-02)", border: "none",
                    color: "var(--cds-text-inverse)", width: 24, height: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0, cursor: "pointer",
                  }}>
                  <Close size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              aria-label={t("muscleMap.addMoreImages")}
              style={{
                border: `1px dashed ${dragging ? "var(--accent)" : "var(--accent-bg-30)"}`,
                background: dragging ? "var(--accent-bg-08)" : "transparent",
                borderRadius: 16,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                aspectRatio: "1", cursor: "pointer", gap: 4,
              }}>
              <Add size={20} aria-hidden="true" style={{ color: "var(--text-muted-wl)" }} />
              <span style={{ fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.5px" }}>{t("common.add")}</span>
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple
        style={{ display: "none" }}
        onChange={(e) => onHandleFiles(e.target.files)} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          onClick={onShowTemplatePicker}
          style={{
            flex: 1, padding: "10px 0",
            background: "transparent",
            border: "1px solid var(--border-subtle-wl)",
            borderRadius: "var(--r-pill)",
            color: "var(--cds-text-primary)",
            fontFamily: "var(--cds-font-sans)", fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t("muscleMap.useTemplate")}
        </button>
        <button
          onClick={() => dispatch({ type: "ANALYZE_SUCCESS", exercises: [] })}
          style={{
            flex: 1, padding: "10px 0",
            background: "transparent",
            border: "1px solid var(--border-subtle-wl)",
            borderRadius: "var(--r-pill)",
            color: "var(--cds-text-primary)",
            fontFamily: "var(--cds-font-sans)", fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t("muscleMap.manualEntry")}
        </button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {sizeError && (
          <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={sizeError} hideCloseButton style={{ marginBottom: 14 }} />
        )}
      </div>
      <div aria-live="polite" aria-atomic="true">
        {error && (
          <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={error} hideCloseButton style={{ marginBottom: 14 }} />
        )}
      </div>

      <StickyCta>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onShowHome}
            style={{
              flex: 1, padding: "12px 0",
              background: "transparent", border: "1px solid var(--border-subtle-wl)",
              borderRadius: "var(--r-pill)", color: "var(--cds-text-primary)",
              fontFamily: "var(--cds-font-sans)", fontSize: 14, cursor: "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onAnalyze}
            disabled={images.length === 0}
            style={{
              flex: 2, padding: "12px 20px",
              background: images.length === 0 ? "var(--cds-layer-01)" : "var(--accent)",
              border: "none",
              borderRadius: "var(--r-pill)",
              color: images.length === 0 ? "var(--text-muted-wl)" : "#fff",
              fontFamily: "var(--cds-font-sans)", fontWeight: 600, fontSize: 14,
              cursor: images.length === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>{t("muscleMap.analyzeBtn")}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </StickyCta>
    </div>
  );
}
