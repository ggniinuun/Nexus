export const STORAGE_KEY = 'advaita.v2';
export const types = { thought: 'Thought', task: 'Plan', meal: 'Meal', training: 'Movement', metric: 'Measurement', memory: 'Memory', goal: 'Goal', focus: 'Focus', routine: 'Routine', checkin: 'Check-in' };
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return dayKey(d); }
export function freshState() { return { version: 2, name: 'Eyal', motion: !matchMedia('(prefers-reduced-motion: reduce)').matches, records: [], timer: null }; }
export function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.records)) return freshState();
    return { ...freshState(), ...parsed, name: String(parsed.name).slice(0, 40), records: parsed.records.filter(validRecord) };
  } catch { return freshState(); }
}
export function validRecord(r) { return r && typeof r.id === 'string' && Object.hasOwn(types, r.type) && typeof r.text === 'string' && r.text.length <= 12000 && Number.isFinite(Date.parse(r.at)); }
export function persist(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function record(type, text, extra = {}) { return { id: crypto.randomUUID(), type, text: text.trim(), at: new Date().toISOString(), date: dayKey(), done: false, ...extra }; }
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function classify(text) {
  if (/\b(remind|need to|todo|to-do|schedule|due|tomorrow|plan to)\b/i.test(text)) return 'task';
  if (/\b(ate|had for|breakfast|lunch|dinner|snack|meal)\b/i.test(text)) return 'meal';
  if (/\b(trained|walked|ran|workout|finished a run|gym session)\b/i.test(text)) return 'training';
  if (/\b(remember that|i prefer|i love|i hate|remember this)\b/i.test(text)) return 'memory';
  return 'thought';
}
export function parsePlan(text) {
  const match = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  let time = '';
  if (match && +match[1] >= 1 && +match[1] <= 12 && +(match[2] || 0) < 60) time = `${String((+match[1] % 12) + (match[3].toLowerCase() === 'pm' ? 12 : 0)).padStart(2, '0')}:${match[2] || '00'}`;
  const minutes = text.match(/\b(\d{1,3})\s*(?:min|minutes)\b/i);
  return { date: /\btomorrow\b/i.test(text) ? tomorrow() : dayKey(), time, minutes: minutes ? Math.min(240, +minutes[1]) : 25, category: /\b(shift|roster)\b/i.test(text) ? 'Work' : /\b(uni|study|assignment|lecture|exam)\b/i.test(text) ? 'University' : 'Personal' };
}
// Import text only. Export URLs, credentials and attachment metadata are never followed.
export function memoryCandidates(data) {
  const found = new Set(); let visited = 0;
  function visit(value, key = '', depth = 0) {
    if (++visited > 60000 || depth > 24 || found.size >= 200) return;
    if (typeof value === 'string' && /^(text|memory|memories|content|summary|human_memory|title)$/i.test(key)) {
      const text = value.trim();
      if (text.length >= 8 && text.length <= 12000 && !/^https?:\/\//i.test(text)) found.add(text);
    } else if (Array.isArray(value)) value.forEach(v => visit(v, key, depth + 1));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => visit(v, k, depth + 1));
  }
  visit(data);
  return [...found];
}
