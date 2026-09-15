import { validRecord } from './core.js';

export function restoreBackup(state, backup) {
  if (backup?.version !== 2 || !Array.isArray(backup.records) || backup.records.length > 30000) throw Error('Not an Advaita backup.');
  if (!backup.records.every(r => validRecord(r) && /^[a-z0-9-]+$/i.test(r.id) && /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') && (r.type !== 'task' || (Number.isFinite(r.minutes) && r.minutes > 0 && r.minutes <= 1440)))) throw Error('The backup contains invalid entries.');
  const next = structuredClone(state);
  for (const r of backup.records) if (!next.records.some(existing => existing.id === r.id)) next.records.push(structuredClone(r));
  if (typeof backup.name === 'string' && backup.name.trim()) next.name = backup.name.trim().slice(0,40);
  if (typeof backup.motion === 'boolean') next.motion = backup.motion;
  if (backup.context && !next.context) {
    next.context = {studyUnits:String(backup.context.studyUnits || '').slice(0,300),suggestions:[]};
    if (Array.isArray(backup.context.suggestions)) next.context.suggestions = backup.context.suggestions.slice(0,4).filter(s => s && typeof s.text === 'string' && typeof s.label === 'string').map(s => ({text:s.text.slice(0,200),label:s.label.slice(0,80),category:s.category === 'University' ? 'University' : 'Personal'}));
  }
  if (Array.isArray(backup.contextImports)) next.contextImports = [...new Set([...(next.contextImports || []),...backup.contextImports.filter(s => typeof s === 'string' && s.length < 100)])];
  // A transferred timer resumes paused so moving devices cannot log unseen sessions.
  const t = backup.timer;
  if (!next.timer && t && Number.isFinite(t.minutes) && t.minutes > 0 && t.minutes <= 240) {
    const remaining = t.running ? Math.ceil((t.end - Date.now()) / 1000) : t.remaining;
    if (Number.isFinite(remaining) && remaining > 0) next.timer = {text:String(t.text || '').slice(0,200),minutes:t.minutes,remaining:Math.min(t.minutes*60,remaining),running:false,end:0};
  }
  return next;
}
