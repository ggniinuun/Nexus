import { validRecord } from './core.js';

// A private, curated snapshot is imported once. User edits and deletions survive reloads.
export function mergePersonalContext(state, context) {
  if (context?.version !== 1 || typeof context.importId !== 'string' || !Array.isArray(context.records)) return false;
  if ((state.contextImports || []).includes(context.importId)) return false;
  const records = context.records.filter(r => validRecord(r) && r.type === 'memory' && /^[a-z0-9-]+$/i.test(r.id));
  if (!records.length) return false;
  for (const r of records) {
    if (!state.records.some(existing => existing.id === r.id)) {
      state.records.push({ id: r.id, type: 'memory', text: r.text, at: r.at, date: r.at.slice(0, 10), source: String(r.source || 'Claude export').slice(0, 250), done: false });
    }
  }
  state.context = {
    suggestions: (context.suggestions || []).slice(0, 4).filter(s => typeof s.text === 'string' && typeof s.label === 'string').map(s => ({ text: s.text.slice(0, 200), label: s.label.slice(0, 80), category: s.category === 'University' ? 'University' : 'Personal' })),
    studyUnits: String(context.studyUnits || '').slice(0, 300)
  };
  state.contextImports = [...(state.contextImports || []), context.importId];
  return true;
}
