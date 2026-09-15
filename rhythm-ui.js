import { dayKey, record, escapeHTML as esc } from './core.js';
import { latestEnergy, focusMinutes, findSlots } from './rhythm.js';

export function createRhythmUI({state, open, commit, close, captures}) {
  const $ = s => document.querySelector(s);
  const icon = name => `<i data-lucide="${name}"></i>`;
  const icons = () => window.lucide?.createIcons();

  function energy() {
    const level = latestEnergy(state.records);
    open(`<h2 id="sheetTitle">How are you <em>arriving?</em></h2><form id="energyForm"><fieldset class="energy-options"><legend>My energy today</legend>${[['low','battery-low','Running low'],['steady','battery-medium','Steady'],['high','battery-full','Plenty in me']].map(([value,image,label]) => `<label>${icon(image)}<span>${label}</span><input type="radio" name="energy" value="${value}" ${level === value ? 'checked' : ''}></label>`).join('')}</fieldset><label class="field">Anything on your mind?<textarea id="energyNote" maxlength="500" placeholder="Optional"></textarea></label><div class="form-footer"><span>Just how you feel, right now.</span><button class="primary">Keep this</button></div></form>`, 'energy');
    $('#energyForm').addEventListener('submit', event => {
      event.preventDefault();
      const value = new FormData(event.target).get('energy');
      const note = $('#energyNote').value.trim();
      const label = {low:'Running low',steady:'Steady',high:'Plenty in me'}[value];
      state.records.push(record('checkin', `Energy: ${label}${note ? '. '+note : ''}`, {energy:value}));
      if (commit('Check-in kept.')) close();
    });
  }

  function planner() {
    const energyLevel = latestEnergy(state.records);
    open(`<h2 id="sheetTitle">Make room for <em>one thing.</em></h2><div class="form-footer"><button class="text-button" id="addShift">Add a work shift</button><button class="text-button" id="checkEnergy">Energy check-in</button></div><form id="plannerForm"><label class="field">What matters?<input id="planTitle" maxlength="200" value="" placeholder="A study block, training, time outside..." required></label><div class="two-fields"><label class="field">Day<input id="planDate" type="date" min="${dayKey()}" value="${dayKey()}" required></label><label class="field">Minutes<input id="planMinutes" type="number" min="5" max="240" value="${focusMinutes(energyLevel)}" required></label></div><div class="two-fields"><label class="field">No earlier than<input id="planFrom" type="time" value="09:00" required></label><label class="field">Finish by<input id="planUntil" type="time" value="21:00" required></label></div><div class="two-fields"><label class="field">Breathing room<select id="planGap"><option value="0">None</option><option value="15" selected>15 minutes</option><option value="30">30 minutes</option><option value="60">An hour</option></select></label><label class="field">Connected to<select id="planCategory"><option>University</option><option>Personal</option><option>Training</option><option>Health</option></select></label></div><p class="sheet-description" id="plannerContext">${energyLevel === 'low' ? 'You checked in with low energy. A smaller block is the starting point.' : 'Only timed plans entered here count as busy. Your external calendar is not connected.'}</p><button class="primary">Find some room ${icon('arrow-up-right')}</button></form><div id="slotResults" aria-live="polite"></div>`, 'planner');
    $('#addShift').onclick = shift;
    $('#checkEnergy').onclick = energy;
    $('#planDate').onchange = () => {
      $('#slotResults').innerHTML = '';
      const energy = latestEnergy(state.records, $('#planDate').value);
      $('#planMinutes').value = focusMinutes(energy);
      $('#plannerContext').textContent = energy === 'low' ? 'You checked in with low energy. A smaller block is the starting point.' : 'Only timed plans entered here count as busy. Your external calendar is not connected.';
    };
    $('#plannerForm').addEventListener('input', () => { $('#slotResults').innerHTML = ''; });
    $('#plannerForm').addEventListener('submit', event => {
      event.preventDefault();
      const text = $('#planTitle').value.trim(); if (!text) return;
      const category = $('#planCategory').value;
      const options = {date:$('#planDate').value,from:$('#planFrom').value,until:$('#planUntil').value,minutes:+$('#planMinutes').value,gap:+$('#planGap').value};
      const slots = findSlots(state.records, options);
      $('#slotResults').innerHTML = slots.length ? `<div class="section-label" style="margin-top:24px">POSSIBLE OPENINGS</div>${slots.map((s,i) => `<button class="suggestion" data-slot="${i}"><span>${s.time} - ${s.end}</span>${icon('plus')}</button>`).join('')}<p class="empty-message">Around your saved plans, with ${options.gap} minutes between blocks.</p>` : '<p class="empty-message">No room inside that window. Try a shorter block, a wider window or another day.</p>';
      document.querySelectorAll('[data-slot]').forEach(button => { button.onclick = () => {
        const slot = slots[+button.dataset.slot];
        if (!findSlots(state.records, options).some(s => s.time === slot.time)) { $('#slotResults').textContent = 'That opening has changed. Find some room again.'; return; }
        state.records.push(record('task', text, {...slot, category}));
        if (commit(`Time kept: ${slot.time}.`)) close();
      }; });
      icons();
    });
  }

  function shift() {
    captures('task', 'Work shift');
    $('#entryCategory').value = 'Work';
    $('#entryMinutes').value = 240;
    $('#entryTime').required = true;
  }

  function meals() {
    const favorites = state.records.filter(r => r.type === 'meal' && r.favorite);
    const recent = [...state.records].reverse().filter(r => r.type === 'meal' && !r.favorite).slice(0,5);
    open(`<h2 id="sheetTitle">Your usual, <em>your way.</em></h2><div class="form-footer"><button class="primary" id="newMeal">${icon('plus')}Log something else</button></div><div class="section-label" style="margin-top:26px">FAVOURITES</div>${favorites.length ? favorites.map(r => `<div class="meal-repeat"><button class="suggestion" data-repeat="${r.id}"><span>${esc(r.text)}</span>${icon('arrow-up-right')}</button><button class="icon-button" data-unfavorite="${r.id}" title="Remove favourite" aria-label="Remove favourite">${icon('star-off')}</button></div>`).join('') : '<p class="empty-message">Keep a meal you want to come back to.</p>'}<div class="section-label" style="margin-top:24px">RECENT MEALS</div>${recent.map(r => `<button class="suggestion" data-repeat="${r.id}"><span>${esc(r.text)}</span>${icon('arrow-up-right')}</button>`).join('') || '<p class="empty-message">Your next meal starts here.</p>'}`, 'meals');
    $('#newMeal').onclick = () => captures('meal');
    const foodContext = state.records.find(r => r.type === 'memory' && r.id === 'claude-meal-rhythm');
    if (foodContext) $('#sheetTitle').insertAdjacentHTML('afterend', `<p class="sheet-description">${esc(foodContext.text)}</p>`);
    document.querySelectorAll('[data-repeat]').forEach(button => { button.onclick = () => { const r = state.records.find(r => r.id === button.dataset.repeat); if (r) captures('meal', r.text); }; });
    document.querySelectorAll('[data-unfavorite]').forEach(button => { button.onclick = () => { const r = state.records.find(r => r.id === button.dataset.unfavorite); if (r) { r.favorite = false; commit('Favourite removed.'); meals(); } }; });
  }
  return { energy, planner, shift, meals };
}
