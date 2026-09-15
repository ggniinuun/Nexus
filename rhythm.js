import { dayKey } from './core.js';

export function latestEnergy(records, date = dayKey()) {
  return records.filter(r => r.type === 'checkin' && r.date === date && ['low','steady','high'].includes(r.energy)).sort((a,b) => b.at.localeCompare(a.at))[0]?.energy || 'steady';
}
export const focusMinutes = energy => ({ low: 15, steady: 25, high: 45 }[energy] || 25);
export function clockMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time || '')) return null;
  const [h,m] = time.split(':').map(Number);
  return h < 24 && m < 60 ? h * 60 + m : null;
}
export const clockLabel = minute => `${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(minute % 60).padStart(2,'0')}`;

// Find free intervals in local clock time, including overnight blocks from yesterday.
export function findSlots(records, { date, from, until, minutes, gap = 15, now = new Date() }) {
  let cursor = clockMinutes(from);
  const finish = clockMinutes(until);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || cursor === null || finish === null || finish <= cursor || !Number.isFinite(minutes) || minutes < 1 || minutes > 240 || !Number.isFinite(gap) || gap < 0 || gap > 60) return [];
  if (date < dayKey(now)) return [];
  if (date === dayKey(now)) cursor = Math.max(cursor, Math.ceil((now.getHours() * 60 + now.getMinutes() + (now.getSeconds() ? 1 : 0)) / 5) * 5);
  const busy = records.filter(r => r.type === 'task' && clockMinutes(r.time) !== null && r.minutes > 0).map(r => {
    const offset = Math.round((Date.parse(r.date) - Date.parse(date)) / 86400000) * 1440;
    const start = offset + clockMinutes(r.time);
    return { start: start - gap, end: start + Number(r.minutes) + gap };
  }).filter(r => r.end > cursor && r.start < finish).sort((a,b) => a.start - b.start);
  const free = [];
  for (const b of busy) {
    if (cursor < b.start) free.push([cursor, Math.min(finish, b.start)]);
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < finish) free.push([cursor, finish]);
  const slots = [];
  for (const [start,end] of free) {
    for (let at = start; at + minutes <= end && slots.length < 3; at += minutes + gap) slots.push({ date, time: clockLabel(at), end: clockLabel(at + minutes), minutes });
  }
  return slots;
}
