import { load, persist, record, dayKey, tomorrow, types, escapeHTML as esc, classify, parsePlan, memoryCandidates } from './core.js';
import { mergePersonalContext } from './personal-context.js';
import { createRhythmUI } from './rhythm-ui.js';
import { latestEnergy, focusMinutes } from './rhythm.js';
import { restoreBackup } from './backup.js';

const $ = selector => document.querySelector(selector);
const state = load();
const rhythmUI = createRhythmUI({state, open, commit, close, captures});
const sheet = $('#sheet');
const icon = name => `<i data-lucide="${name}"></i>`;
const icons = () => window.lucide?.createIcons();
const typeIcons = { thought: 'sparkles', memory: 'fingerprint', task: 'move-up-right', meal: 'utensils', training: 'activity', metric: 'heart-pulse', goal: 'flag', focus: 'scan-line', routine: 'repeat-2' };
typeIcons.checkin = 'battery-medium';
let sculpture, captureType = 'thought', draft = '', editingId = null, toastTimeout, undoAction, currentSheet = '', selectedMinutes = 25, importTexts = [];

function commit(message) {
  try { persist(state); }
  catch { toast('Storage is full or unavailable. Export your data before leaving.'); render(); return false; }
  render(); sculpture?.pulse(); if (message) toast(message); return true;
}
function toast(message, undo) {
  clearTimeout(toastTimeout); undoAction = undo;
  $('#toast').innerHTML = `${esc(message)}${undo ? '<button data-action="undo">Undo</button>' : ''}`;
  $('#toast').classList.add('show');
  toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 5000);
}
function todayTasks() { return state.records.filter(r => r.type === 'task' && (r.date === dayKey() || (r.date < dayKey() && !r.done))).sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99')); }
function stamp(r) { return new Date(r.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); }
function render() {
  const now = new Date();
  $('#headerDate').textContent = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#dayLabel').textContent = `${now.toLocaleDateString('en-AU', { weekday: 'long' }).toUpperCase()} / ${now.getDate()}`;
  $('#greetingName').textContent = `YOUR WORLD, ${state.name.toUpperCase()}`;
  $('#avatar').textContent = state.name[0]?.toUpperCase() || 'A';
  const tasks = todayTasks();
  const done = tasks.filter(r => r.done).length;
  $('#dayProgress').textContent = tasks.length ? `${done} of ${tasks.length} things, done` : 'A fresh page';
  $('#progressFill').style.width = `${tasks.length ? done / tasks.length * 100 : 0}%`;
  $('#agenda').innerHTML = tasks.length ? tasks.map(r => `<article class="agenda-item ${r.done ? 'done' : ''}"><span class="agenda-time">${r.date < dayKey() && !r.done ? 'Earlier' : esc(r.time || 'Anytime')}</span><button class="task-open" data-edit="${r.id}" aria-label="Edit ${esc(r.text)}"><h3>${esc(r.text)}</h3><p>${esc(r.category || 'Personal')} / ${r.minutes || 25} min</p></button><button class="check" data-complete="${r.id}" title="${r.done ? 'Reopen' : 'Complete'}" aria-label="${r.done ? 'Reopen' : 'Complete'} ${esc(r.text)}">${r.done ? icon('check') : ''}</button></article>`).join('') : `<div class="empty-day"><p>Nothing pulling at you yet.<br>What deserves a little space today?</p><span class="suggested-label">A POSSIBLE START</span><button class="suggestion" data-suggest="Make progress on one assignment"><span>One good study block</span>${icon('plus')}</button><button class="suggestion" data-suggest="Get outside for a walk"><span>A moment outside</span>${icon('plus')}</button></div>`;
  if (!tasks.length && state.context?.suggestions?.length) {
    document.querySelectorAll('#agenda .suggestion').forEach(button => button.remove());
    $('#agenda .empty-day').insertAdjacentHTML('beforeend', state.context.suggestions.map(s => `<button class="suggestion" data-suggest="${esc(s.text)}" data-category="${esc(s.category)}"><span>${esc(s.label)}</span>${icon('plus')}</button>`).join(''));
  }
  const mind = state.records.filter(r => ['thought', 'memory'].includes(r.type));
  const body = state.records.filter(r => ['meal', 'training', 'metric', 'checkin'].includes(r.type) && r.date === dayKey());
  $('#mindCount').textContent = mind.length ? `${mind.length} ${mind.length === 1 ? 'thread' : 'threads'} to come back to` : 'A space to think';
  $('#bodyCount').textContent = body.length ? `${body.length} check-in${body.length === 1 ? '' : 's'} today` : 'Find your rhythm';
  const upcoming = state.records.filter(r => r.type === 'task' && !r.done);
  $('#directionCount').textContent = upcoming.length ? `${upcoming.length} thing${upcoming.length === 1 ? '' : 's'} in motion` : 'Make space for what matters';
  const memory = state.records.filter(r => r.type === 'memory').at(-1);
  $('#memoryWhisper').textContent = memory ? `Something to keep close: ${memory.text.slice(0, 180)}${memory.text.length > 180 ? '...' : ''}` : 'Start anywhere. It all belongs here.';
  const minutes = tasks.filter(r => !r.done).reduce((sum, r) => sum + (r.minutes || 25), 0);
  $('#dayFootnote').textContent = minutes > 180 ? `${Math.round(minutes / 60 * 10) / 10} hours planned. Leave some space between things.` : tasks.length && done === tasks.length ? 'You did what you came here to do. Take a breath.' : 'There is room for a slower moment, too.';
  const motionButton = $('[data-action="motion"]');
  motionButton.innerHTML = icon(state.motion ? 'pause' : 'play');
  motionButton.title = motionButton.ariaLabel = state.motion ? 'Pause animation' : 'Resume animation';
  icons(); tick();
}
function open(html, id = '') {
  currentSheet = id;
  $('#sheetContent').innerHTML = html;
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0; icons();
}
function close() { sheet.close(); currentSheet = ''; editingId = null; }
function entry(r, deletable = true) {
  const edit = !['focus','checkin'].includes(r.type) ? `<button class="text-button" data-edit="${r.id}">${r.type === 'task' ? 'Adjust plan' : 'Edit'}</button>` : '';
  const favorite = r.type === 'meal' ? `<button class="text-button" data-favorite="${r.id}">${r.favorite ? 'Remove favourite' : 'Keep as a favourite'}</button>` : '';
  const promote = r.type === 'thought' ? `<button class="text-button" data-promote="${r.id}">Keep as a memory</button>` : '';
  const goal = r.type === 'goal' ? `<button class="text-button" data-complete="${r.id}">${r.done ? 'Reached / reopen' : 'Mark as reached'}</button>` : '';
  const routine = r.type === 'routine' ? `<button class="text-button" data-routine="${r.id}">${(r.completedDates || []).includes(dayKey()) ? 'Done today / undo' : 'Did this today'}</button>` : '';
  return `<article class="list-entry">
    ${icon(typeIcons[r.type] || 'circle')}
    <div class="entry-main"><h3>${esc(r.text)}</h3>
      <p>${esc(types[r.type])} / ${stamp(r)}${r.type === 'task' ? ` / ${esc(r.date)}${r.done ? ' / Complete' : ''}` : ''}${r.minutes ? ` / ${r.minutes} min` : ''}${r.value !== undefined ? ` / ${esc(r.value)} ${esc(r.unit)}` : ''}${r.source ? ` / <span class="source-tag">${esc(r.source)}</span>` : ''}</p>
      <div class="entry-actions">${edit}${promote}${goal}${routine}${favorite}</div>
    </div>
    ${deletable ? `<button class="icon-button" data-delete="${r.id}" title="Delete entry" aria-label="Delete entry">${icon('trash-2')}</button>` : ''}
  </article>`;
}
function captures(type = 'thought', text = '', id = null) {
  captureType = type; draft = text; editingId = id;
  const existing = id ? state.records.find(r => r.id === id) : null;
  const plan = existing || parsePlan(text);
  const title = { thought: 'Let it <em>out.</em>', task: 'Make a little <em>space.</em>', meal: 'What was <em>good?</em>', training: 'You made <em>time.</em>', memory: 'A little more <em>you.</em>', metric: 'A moment of <em>measure.</em>', goal: 'Something to <em>move toward.</em>', routine: 'Find your <em>rhythm.</em>' }[type];
  const placeholders = { thought: 'The thing I keep thinking about...', task: 'What deserves your attention?', meal: 'Chicken, rice, salad... as much detail as you remember.', training: 'A walk, a workout, a few good stretches...', memory: 'I feel most like myself when...', metric: 'Measurement name, e.g. body weight', goal: 'Something that matters to me...', routine: 'Something I want to return to...' };
  open(`<h2 id="sheetTitle">${title}</h2><div class="segmented" aria-label="Capture type">${['thought','task','meal','training','memory'].map(t => `<button data-kind="${t}" class="${t === type ? 'active' : ''}" aria-pressed="${t === type}">${types[t]}</button>`).join('')}</div><form id="captureForm"><label class="field">${types[type]}<textarea id="captureText" required maxlength="2000" placeholder="${placeholders[type]}">${esc(text)}</textarea></label>${type === 'task' ? `<div class="two-fields"><label class="field">Day<input id="entryDate" type="date" required value="${esc(plan.date)}"></label><label class="field">Time<input id="entryTime" type="time" value="${esc(plan.time || '')}"></label></div><div class="two-fields"><label class="field">Minutes<input id="entryMinutes" type="number" min="1" max="1440" value="${plan.minutes || 25}" required></label><label class="field">Connected to<select id="entryCategory">${['Personal','University','Training','Health'].map(c => `<option ${plan.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>` : type === 'training' ? '<label class="field">Minutes<input id="entryMinutes" type="number" min="1" max="1440" value="30" required></label>' : type === 'metric' ? '<div class="two-fields"><label class="field">Value<input id="entryValue" type="number" step="any" required></label><label class="field">Unit<input id="entryUnit" placeholder="kg, mmol/L..." maxlength="30" required></label></div><label class="field">Measured on<input id="entryDate" type="date" required value="'+dayKey()+'"></label>' : type === 'meal' ? '<p class="sheet-description">Saved as your food log. Nutrient totals are unavailable until a verified food source is connected.</p>' : ''}<div class="form-footer"><span>Kept on this device</span><button class="primary" type="submit">${id ? 'Save changes' : 'Keep this'}${icon('arrow-up-right')}</button></div></form>${id ? `<div class="form-footer"><button class="text-button" data-tomorrow="${id}">Move to tomorrow</button><button class="text-button danger" data-delete="${id}">Delete</button></div>` : ''}`, 'capture');
  if (type === 'task') {
    $('#entryCategory').add(new Option('Work', 'Work', false, plan.category === 'Work'));
    $('#entryCategory').addEventListener('change', () => { $('#entryTime').required = $('#entryCategory').value === 'Work'; });
    $('#entryTime').required = plan.category === 'Work';
  }
  if (existing?.type === 'training') $('#entryMinutes').value = existing.minutes || 30;
  if (existing?.type === 'metric') {
    $('#entryValue').value = existing.value;
    $('#entryUnit').value = existing.unit;
    $('#entryDate').value = existing.date;
  }
  $('#captureForm').addEventListener('submit', event => {
    event.preventDefault();
    const text = $('#captureText').value.trim(); if (!text) return;
    const extra = {};
    if ($('#entryDate')) extra.date = $('#entryDate').value;
    if ($('#entryTime')) extra.time = $('#entryTime').value;
    if ($('#entryMinutes')) extra.minutes = +$('#entryMinutes').value;
    if ($('#entryCategory')) extra.category = $('#entryCategory').value;
    if ($('#entryValue')) { extra.value = +$('#entryValue').value; extra.unit = $('#entryUnit').value.trim(); }
    if (existing) Object.assign(existing, { type: captureType, text }, extra);
    else state.records.push(record(captureType, text, extra));
    if (commit(existing ? 'Your plan is updated.' : `${types[captureType]} kept.`)) close();
  });
}
function worldMenu(world = 'all') {
  const rows = [
    ['planner','calendar-clock','Plan around my day','One opening between everything else.','direction'],
    ['energy','battery-medium','Energy check-in','How you feel, right now.','body'],
    ['shift','briefcase-business','Work shifts','Give your roster some space.','direction'],
    ['meals','utensils','My usual meals','Your favourites and recent meals.','body'],
    ['think','sparkles','Thoughts & journal','A place for the unfinished thoughts.','mind'],
    ['memory','fingerprint','Memory','The details that make you, you.','mind'],
    ['university','graduation-cap','University','Deadlines, study blocks, a clearer head.','direction'],
    ['calendar','calendar-days','Calendar & plans','Time for the things that matter.','direction'],
    ['goals','flag','Goals & routines','A direction, and a way to return.','direction'],
    ['nutrition','utensils','Food & nourishment','Meals, captured in your words.','body'],
    ['training','activity','Training & movement','Every kind of showing up.','body'],
    ['health','heart-pulse','Health & measurements','Your values, over time.','body']
  ];
  open(`<h2 id="sheetTitle">${world === 'all' ? 'The whole of <em>you.</em>' : {mind:'A little room to <em>think.</em>',body:'Come back to <em>yourself.</em>',direction:'Find your <em>direction.</em>'}[world]}</h2><div class="world-list">${rows.filter(r => world === 'all' || r[4] === world).map(r => `<button data-action="${r[0]}">${icon(r[1])}<span><strong>${r[2]}</strong><small>${r[3]}</small></span>${icon('arrow-up-right')}</button>`).join('')}</div>`, 'world');
}
function collection(kind) {
  const configs = {
    nutrition: ['A taste of <em>today.</em>', ['meal'], 'eat', 'Log a meal'],
    training: ['A body in <em>motion.</em>', ['training'], 'move', 'Log movement'],
    health: ['Your body, <em>over time.</em>', ['metric'], 'measure', 'Add a measurement'],
    calendar: ['Space for <em>what matters.</em>', ['task'], 'plan', 'Make a plan'],
    university: ['A clearer <em>head.</em>', ['task'], 'study', 'Plan a study block'],
    goals: ['A sense of <em>direction.</em>', ['goal','routine'], 'goal', 'Add a goal']
  };
  const [title, allowed, action, label] = configs[kind];
  const items = state.records.filter(r => allowed.includes(r.type) && (kind !== 'university' || r.category === 'University')).sort((a, b) => b.at.localeCompare(a.at));
  open(`<h2 id="sheetTitle">${title}</h2><div class="form-footer"><button class="primary" data-action="${action}">${icon('plus')}${label}</button>${kind === 'goals' ? '<button class="text-button" data-action="routine">Add a routine</button>' : ''}</div>${kind === 'university' ? '<p class="sheet-description" style="margin-top:20px">Outlook and your university portal are not connected yet. These are the study plans you add here.</p>' : kind === 'health' ? '<p class="sheet-description" style="margin-top:20px">Values you enter from your own measurements or reports. DEXA and blood-report extraction are not connected.</p>' : ''}<div style="margin-top:20px">${items.length ? items.map(r => entry(r)).join('') : '<p class="empty-message">A fresh page. Your first entry goes here.</p>'}</div>`, kind);
  if (kind === 'university' && state.context?.studyUnits) {
    $('#sheetTitle').insertAdjacentHTML('afterend', `<p class="sheet-description">${esc(state.context.studyUnits)}</p>`);
  }
}
function memory() {
  const items = state.records.filter(r => ['memory','thought'].includes(r.type)).reverse();
  open(`<h2 id="sheetTitle">Unmistakably <em>you.</em></h2><p class="sheet-description">The things you want to remember about yourself.</p><div class="form-footer"><button class="primary" data-action="remember">${icon('plus')}Add a memory</button><button class="text-button" data-action="import">Import memories</button></div><label class="field">Find a thread<input id="memorySearch" type="search" placeholder="A word, a feeling, a detail..."></label><div id="memoryList">${items.length ? items.map(r => entry(r)).join('') : '<p class="empty-message">Your Claude export has not been read yet. Add a detail that matters to you, or import the downloaded JSON.</p>'}</div>`, 'memory');
  $('#memorySearch').addEventListener('input', event => {
    const results = items.filter(r => r.text.toLowerCase().includes(event.target.value.toLowerCase()));
    $('#memoryList').innerHTML = results.map(r => entry(r)).join('') || '<p class="empty-message">No matching threads.</p>'; icons();
  });
  if (!items.length && state.contextImports?.length) $('#memoryList').innerHTML = '<p class="empty-message">No saved threads. Add a memory whenever something matters.</p>';
}
function history() {
  const items = [...state.records].sort((a, b) => b.at.localeCompare(a.at));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { label: d.toLocaleDateString('en-AU', { weekday: 'short' }).slice(0, 1), count: items.filter(r => r.date === dayKey(d)).length }; });
  const max = Math.max(1, ...days.map(d => d.count));
  open(`<h2 id="sheetTitle">Your life, <em>in the making.</em></h2><div class="stat-strip"><div><strong>${items.length}</strong><span>moments kept</span></div><div><strong>${items.filter(r => r.type === 'task' && r.done).length}</strong><span>things done</span></div><div><strong>${items.filter(r => r.type === 'focus').reduce((n, r) => n + r.minutes, 0)}</strong><span>focused minutes</span></div></div><div class="section-label">THIS WEEK / MOMENTS CAPTURED</div><div class="week-chart" role="img" aria-label="Moments captured over seven days: ${days.map(d => d.count).join(', ')}">${days.map(d => `<div><i style="height:${d.count / max * 90}px" title="${d.count} moments"></i><span>${d.label}</span></div>`).join('')}</div>${items.length ? items.map(r => entry(r)).join('') : '<p class="empty-message">Your story starts with the first thing you keep.</p>'}`, 'history');
}
function focus() {
  const t = state.timer;
  open(`<h2 id="sheetTitle">Just this <em>one thing.</em></h2><label class="field">What has your attention?<input id="focusTitle" maxlength="200" value="${esc(t?.text || todayTasks().find(r => !r.done)?.text || '')}" placeholder="One thing worth your time" ${t ? 'readonly' : ''}></label><div class="timer-display" id="timerDisplay">25:00</div><div class="focus-duration">${[15,25,45].map(n => `<button data-duration="${n}" class="${(t?.minutes || selectedMinutes) === n ? 'active' : ''}" ${t ? 'disabled' : ''}>${n} min</button>`).join('')}</div><div class="timer-controls"><button class="primary" data-action="timer-toggle" id="timerToggle">${icon(t?.running ? 'pause' : 'play')}${t?.running ? 'Pause' : t ? 'Resume' : 'Begin'}</button><button class="icon-button" data-action="timer-reset" title="Reset focus timer" aria-label="Reset focus timer">${icon('rotate-ccw')}</button></div><p class="sheet-description" style="text-align:center">${t ? 'Your time is protected. Come back when you are ready.' : 'A little less everywhere. A little more here.'}</p>`, 'focus'); tick();
}
function remaining() { return state.timer ? state.timer.running ? Math.max(0, Math.ceil((state.timer.end - Date.now()) / 1000)) : state.timer.remaining : selectedMinutes * 60; }
function tick() {
  const seconds = remaining(); const formatted = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  if ($('#timerDisplay')) $('#timerDisplay').textContent = formatted;
  $('#focusPreview').textContent = state.timer ? `${formatted} ${state.timer.running ? 'remaining' : 'paused'}` : `${focusMinutes(latestEnergy(state.records))} minutes. One thing.`;
  if (state.timer?.running && seconds === 0) {
    const completed = state.timer;
    state.records.push(record('focus', completed.text || 'A little space to focus', { minutes: completed.minutes }));
    state.timer = null; commit('Your focus session is complete.'); if (currentSheet === 'focus') focus();
  }
}
function settings() {
  open(`<h2 id="sheetTitle">Yours, <em>by design.</em></h2><form id="settingsForm"><label class="field">What should I call you?<input id="profileName" value="${esc(state.name)}" maxlength="40" required></label><label class="setting-row">Sculpture in motion<input type="checkbox" id="motionSetting" ${state.motion ? 'checked' : ''}></label><div class="form-footer"><span>Your name appears on your home.</span><button class="primary" type="submit">Save</button></div></form><div class="setting-row" style="margin-top:24px"><span>Storage</span><span>In this browser</span></div><p class="sheet-description">Your entries stay in this browser. They are not encrypted and do not sync to other devices. Export a backup before clearing browser data.</p><div class="setting-row"><span>AI & external accounts</span><span>Not connected</span></div><div class="form-footer"><button class="text-button" data-action="export">Export my data</button><button class="text-button" data-action="import">Import memories</button></div><button class="text-button danger" data-action="erase">Erase local data</button>`, 'settings');
  $('#settingsForm').addEventListener('submit', event => { event.preventDefault(); const name = $('#profileName').value.trim(); if (!name) return; state.name = name; state.motion = $('#motionSetting').checked; sculpture?.setMotion(state.motion); if (commit('A little more you.')) close(); });
}
function importMemory() {
  open('<h2 id="sheetTitle">Bring your <em>context.</em></h2><p class="sheet-description">Choose an Advaita backup, a private context file or a Claude JSON file. Your selection stays in this browser.</p><label class="field">JSON file<input type="file" id="memoryFile" accept=".json,application/json"></label><div id="importResult"></div>', 'import');
  $('#memoryFile').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { $('#importResult').textContent = 'Choose a JSON file smaller than 8 MB.'; return; }
    try {
      const json = JSON.parse(await file.text());
      if (currentSheet !== 'import') return;
      if (json.data_files) { $('#importResult').textContent = 'This is the manifest. Download the ZIP files from Claude and choose a JSON file from inside them.'; return; }
      if (Array.isArray(json.records) && (json.version === 2 || (json.version === 1 && json.importId))) {
        $('#importResult').innerHTML = `<p class="sheet-description">${json.records.length} saved entries. Existing matching entries will be kept.${json.version === 2 ? ' Your saved name and motion preference will be restored. A transferred timer will be paused.' : ''}</p><button class="primary" id="restoreFile">${json.version === 2 ? 'Restore backup' : 'Import personal context'}</button>`;
        $('#restoreFile').onclick = () => {
          try {
            const next = json.version === 2 ? restoreBackup(state, json) : structuredClone(state);
            if (json.version === 1 && !mergePersonalContext(next, json)) { toast('This context is already imported or contains no valid entries.'); return; }
            persist(next); Object.assign(state, next); sculpture?.setMotion(state.motion); render(); close(); toast('Your saved context is here.');
          } catch (error) { $('#importResult').textContent = error.message || 'The file could not be restored.'; }
        };
        return;
      }
      importTexts = memoryCandidates(json);
      $('#importResult').innerHTML = importTexts.length ? `<p class="sheet-description">${importTexts.length} text entries found (up to 200 per import). Choose what belongs in your memory.</p><div class="import-preview">${importTexts.map((t, i) => `<label><input type="checkbox" data-import-index="${i}"><span>${esc(t)}</span></label>`).join('')}</div><div class="form-footer"><span>Only selected text will be kept</span><button class="primary" data-action="keep-import">Keep selected</button></div>` : '<p class="empty-message">No supported text entries found. Add the details you want to keep as a memory.</p>';
    } catch { if ($('#importResult')) $('#importResult').textContent = 'This file could not be read as JSON.'; }
  });
}
function refreshSheet() {
  if (currentSheet === 'memory') memory(); else if (currentSheet === 'history') history();
  else if (['nutrition','training','health','calendar','university','goals'].includes(currentSheet)) collection(currentSheet);
  else if (currentSheet === 'capture') close();
}
const actions = {
  ...rhythmUI,
  close, now: () => { close(); window.scrollTo({ top: 0, behavior: state.motion ? 'smooth' : 'instant' }); },
  orbit: () => worldMenu(), memory, history, settings,
  focus: () => { if (!state.timer) selectedMinutes = focusMinutes(latestEnergy(state.records)); focus(); },
  think: () => captures('thought'), plan: () => captures('task'), eat: () => captures('meal'), move: () => captures('training'), remember: () => captures('memory'), measure: () => captures('metric'), goal: () => captures('goal'), routine: () => captures('routine'),
  study: () => { captures('task'); $('#entryCategory').value = 'University'; },
  nutrition: () => collection('nutrition'), training: () => collection('training'), health: () => collection('health'), calendar: () => collection('calendar'), university: () => collection('university'), goals: () => collection('goals'),
  motion: () => { state.motion = !state.motion; sculpture?.setMotion(state.motion); commit(); },
  'reset-scene': () => sculpture?.reset(),
  undo: () => { undoAction?.(); $('#toast').classList.remove('show'); undoAction = null; },
  'timer-toggle': () => {
    if (!state.timer) state.timer = { text: $('#focusTitle').value.trim(), minutes: selectedMinutes, remaining: selectedMinutes * 60, running: true, end: Date.now() + selectedMinutes * 60000 };
    else if (state.timer.running) { state.timer.remaining = remaining(); state.timer.running = false; }
    else { state.timer.end = Date.now() + state.timer.remaining * 1000; state.timer.running = true; }
    commit(); focus();
  },
  'timer-reset': () => { state.timer = null; commit(); focus(); },
  import: importMemory,
  'keep-import': () => {
    const selected = [...document.querySelectorAll('[data-import-index]:checked')].map(input => importTexts[+input.dataset.importIndex]);
    if (!selected.length) { toast('Choose at least one entry.'); return; }
    let count = 0;
    selected.forEach(text => { if (!state.records.some(r => r.type === 'memory' && r.text === text)) { state.records.push(record('memory', text, { source: 'Imported text' })); count++; } });
    if (commit(`${count} memories kept.`)) memory();
  },
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `advaita-private-${dayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Your private backup is ready.');
  },
  erase: () => open('<h2 id="sheetTitle">Start <em>fresh?</em></h2><p class="sheet-description">This erases your entries, memories and focus timer from this browser. Export a backup first if you want to keep them.</p><div class="form-footer"><button class="text-button" data-action="settings">Keep my data</button><button class="primary" data-action="confirm-erase">Erase local data</button></div>', 'erase'),
  'confirm-erase': () => { state.records = []; state.timer = null; state.context = null; if (commit('Your entries have been erased.')) close(); }
};
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  const d = button.dataset;
  if (d.action && actions[d.action]) actions[d.action]();
  if (d.world) { sculpture?.pulse(); worldMenu(d.world); }
  if (d.kind) captures(d.kind, $('#captureText').value, editingId);
  if (d.suggest) { captures('task', d.suggest); $('#entryCategory').value = d.category || (d.suggest.includes('assignment') ? 'University' : 'Personal'); }
  if (d.edit) { const r = state.records.find(r => r.id === d.edit); if (r) captures(r.type, r.text, r.id); }
  if (d.complete) { const r = state.records.find(r => r.id === d.complete); if (r) { r.done = !r.done; commit(); refreshSheet(); toast(r.done ? 'One less thing on your mind.' : 'Back in your day.', () => { r.done = !r.done; commit(); refreshSheet(); }); } }
  if (d.routine) { const r = state.records.find(r => r.id === d.routine); if (r) { const dates = r.completedDates || []; r.completedDates = dates.includes(dayKey()) ? dates.filter(d => d !== dayKey()) : [...dates, dayKey()]; commit(); refreshSheet(); } }
  if (d.favorite) { const r = state.records.find(r => r.id === d.favorite); if (r) { r.favorite = !r.favorite; commit(r.favorite ? 'Meal kept as a favourite.' : 'Favourite removed.'); refreshSheet(); } }
  if (d.delete) {
    const index = state.records.findIndex(r => r.id === d.delete); if (index < 0) return;
    const [r] = state.records.splice(index, 1); commit(); refreshSheet();
    toast('Entry removed.', () => { state.records.splice(index, 0, r); commit(); refreshSheet(); });
  }
  if (d.tomorrow) { const r = state.records.find(r => r.id === d.tomorrow); if (r) { r.date = tomorrow(); commit('Moved to tomorrow.'); close(); } }
  if (d.promote) { const r = state.records.find(r => r.id === d.promote); if (r) { r.type = 'memory'; commit('Kept as a memory.'); refreshSheet(); } }
  if (d.duration) { selectedMinutes = +d.duration; focus(); }
});
$('#quickCapture').addEventListener('submit', event => {
  event.preventDefault(); const input = $('#quickInput'); const text = input.value.trim(); if (!text) return;
  captures(classify(text), text); input.value = '';
});
sheet.addEventListener('click', event => { if (event.target === sheet) { const r = sheet.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } });
sheet.addEventListener('close', () => { currentSheet = ''; editingId = null; });
document.addEventListener('visibilitychange', tick);
setInterval(tick, 1000);
render();
fetch('./config.json', { cache: 'no-store' }).then(response => response.json()).then(config => config.loadPrivateContext ? fetch('./private/context.json', { cache: 'no-store' }).then(response => response.ok ? response.json() : null) : null).then(context => {
  if (!context) return;
  const next = structuredClone(state);
  if (!mergePersonalContext(next, context)) return;
  persist(next);
  Object.assign(state, next);
  render();
}).catch(() => { /* Optional private context; the app works without it. */ });
import('./scene.js').then(({ createScene }) => { sculpture = createScene($('#sculpture'), state.motion); }).catch(() => { $('.scene-fallback').hidden = false; });
