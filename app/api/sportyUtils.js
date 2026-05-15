// Strip quoted annotations like “SVART TRØYE” — handles straight and curly double quotes
export function normalizeName(name) {
  return name.replace(/\s*["“”][^"“”]+["“”]\s*/g, '').trim();
}
