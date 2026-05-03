import { Modal, Accordion, AccordionItem } from "@carbon/react";
import { CHANGELOG } from "../lib/changelog";

const MONTHS = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

export default function ChangelogModal({ open, onClose }) {
  const entries = CHANGELOG.slice(0, 15);
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      passiveModal
      modalHeading="Endringslogg"
      size="sm"
    >
      <Accordion>
        {entries.map((entry, i) => (
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
    </Modal>
  );
}
