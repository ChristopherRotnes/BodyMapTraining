import { useMemo } from "react";
import { toIsoDate } from "../lib/utils";
import { useTranslation } from "react-i18next";

function calHeatColor(count) {
  if (!count) return "var(--surface-card)";
  if (count <= 1) return "var(--heat-1)";
  if (count <= 3) return "var(--heat-2)";
  if (count <= 5) return "var(--heat-3)";
  if (count <= 7) return "var(--heat-4)";
  return "var(--heat-5)";
}

export default function MonthGrid({ year, month, sessionCountMap, onDayClick, selectedDate, today }) {
  const { t } = useTranslation();
  const DAY_HEADERS = [
    t("history.days.mon"),
    t("history.days.tue"),
    t("history.days.wed"),
    t("history.days.thu"),
    t("history.days.fri"),
    t("history.days.sat"),
    t("history.days.sun"),
  ];
  const todayStr = toIsoDate(today);
  const selectedStr = selectedDate ? toIsoDate(selectedDate) : null;
  const firstDOW = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = useMemo(() => {
    const c = [];
    for (let i = 0; i < firstDOW; i++) c.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      c.push(`${year}-${mm}-${dd}`);
    }
    return c;
  }, [year, month, firstDOW, daysInMonth]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{ textAlign: "center", fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 0" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`pad-${i}`} style={{ height: 40, background: "var(--surface-card)", borderRadius: 0 }} />;
          const count = sessionCountMap[dateStr] || 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const isFuture = dateStr > todayStr;
          const isInteractive = !isFuture && count > 0;
          const day = parseInt(dateStr.split("-")[2], 10);
          const cellStyle = {
            height: 40,
            borderRadius: 0,
            background: calHeatColor(count),
            border: "1px solid var(--border-subtle-wl)",
            outline: isSelected ? "3px solid var(--cds-background)" : isToday ? "1px dashed var(--cds-text-secondary)" : undefined,
            outlineOffset: isSelected ? "-3px" : "-2px",
            display: "flex", alignItems: "center", justifyContent: "center",
          };
          const daySpan = (
            <span style={{
              fontSize: 10, fontFamily: "var(--cds-font-mono)", letterSpacing: "0.06em",
              color: count > 0 ? "rgba(255,255,255,0.9)" : isFuture ? "var(--cds-text-disabled)" : "var(--cds-text-secondary)",
            }}>
              {day}
            </span>
          );
          if (isInteractive) {
            return (
              <button
                key={dateStr}
                aria-label={`${dateStr}: ${t("history.sessionCount", { count })}`}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                onClick={() => onDayClick(dateStr)}
                style={{ ...cellStyle, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
              >
                {daySpan}
              </button>
            );
          }
          return (
            <div
              key={dateStr}
              aria-current={isToday ? "date" : undefined}
              style={{ ...cellStyle, cursor: "default" }}
            >
              {daySpan}
            </div>
          );
        })}
      </div>
    </div>
  );
}
