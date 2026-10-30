/* Maqsad — goals, tasks & habits. Data stays on-device (localStorage). */
(() => {
'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const key = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
const dow = k => parse(k).getDay();
const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtLong = k => parse(k).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = k => parse(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/* ---------- time & schedule helpers ---------- */
const fmtTime = t => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ampm}`;
};
const timeToMins = t => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const minsToTime = mins => {
  mins = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
};
const addMinsToTime = (t, delta) => minsToTime(timeToMins(t) + delta);
const getNextRecurrence = (dateStr, repeat) => {
  if (repeat === 'daily') return addDays(dateStr, 1);
  if (repeat === 'weekly') return addDays(dateStr, 7);
  if (repeat === 'monthly') {
    const [y, m, d] = dateStr.split('-').map(Number);
    const nextD = new Date(y, m, d);
    if (nextD.getDate() !== d) nextD.setDate(0);
    return key(nextD);
  }
  return null;
};

const CATS = { health: ['💪', 'Health'], study: ['📚', 'Study'], career: ['💼', 'Career'], money: ['💰', 'Money'], faith: ['🕌', 'Faith'], family: ['👨‍👩‍👧', 'Family'], personal: ['✨', 'Personal'] };
const HABIT_EMOJI = ['💧', '🏃', '📖', '🧘', '🕌', '😴', '🥗', '✍️', '💻', '🚭', '🌅', '🎯'];
const PRI = ['Normal', 'Medium', 'High'];

/* ---------- state ---------- */
const KEY = 'maqsad.v1';
const defaults = () => ({ tasks: [], goals: [], habits: [], settings: { theme: 'auto', remind: false, remindTime: '20:00', lastNotified: '' } });
let S;
try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); S.settings = Object.assign(defaults().settings, S.settings); }
catch { S = defaults(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Storage full or blocked — changes may not be saved'); } };

let tab = 'today';
let goalFilter = 'active';

/* ---------- derived ---------- */
const today = () => key();
const goalById = id => S.goals.find(g => g.id === id);
function goalProgress(g) {
  if (g.done) return 100;
  if (g.milestones.length) return Math.round(100 * g.milestones.filter(m => m.done).length / g.milestones.length);
  const t = S.tasks.filter(t => t.goalId === g.id);
  return t.length ? Math.round(100 * t.filter(t => t.done).length / t.length) : 0;
}
const scheduled = (h, k) => h.days.includes(dow(k)) && k >= h.created;
function streaks(h) {
  const t = today();
  let cur = 0, k = t;
  if (scheduled(h, t) && !h.log[t]) k = addDays(t, -1);
  for (let i = 0; i < 1500 && k >= h.created; i++, k = addDays(k, -1)) {
    if (!h.days.includes(dow(k))) continue;
    if (h.log[k]) cur++; else break;
  }
  let best = 0, run = 0;
  for (let k2 = h.created, i = 0; k2 <= t && i < 1500; k2 = addDays(k2, 1), i++) {
    if (!h.days.includes(dow(k2))) continue;
    if (h.log[k2]) { run++; best = Math.max(best, run); } else if (k2 !== t) run = 0;
  }
  return { cur, best: Math.max(best, cur) };
}
function habitRate(h, days) {
  const t = today(); let due = 0, hit = 0;
  for (let i = 0; i < days; i++) { const k = addDays(t, -i); if (scheduled(h, k)) { due++; if (h.log[k]) hit++; } }
  return due ? Math.round(100 * hit / due) : 0;
}
function todayStats() {
  const t = today();
  const tasks = S.tasks.filter(x => x.date === t);
  const habits = S.habits.filter(h => scheduled(h, t));
  const total = tasks.length + habits.length;
  const done = tasks.filter(x => x.done).length + habits.filter(h => h.log[t]).length;
  return { total, done, pct: total ? Math.round(100 * done / total) : 0 };
}

/* ---------- ui chrome ---------- */
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2200);
}
function applyTheme() {
  const t = S.settings.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = $('meta[name="theme-color"]'); if (m) m.content = dark ? '#0b1411' : '#059669';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

function openSheet(html) { $('#sheet').innerHTML = html; $('#overlay').hidden = false; document.body.style.overflow = 'hidden'; const f = $('#sheet input[type=text]'); if (f && !f.value) setTimeout(() => f.focus(), 50); }
function closeSheet() { $('#overlay').hidden = true; $('#sheet').innerHTML = ''; document.body.style.overflow = ''; }
$('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#overlay').hidden) closeSheet(); });

/* ---------- views ---------- */
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night 🌙' : h < 12 ? 'Good morning ☀️' : h < 17 ? 'Good afternoon 🌤️' : h < 21 ? 'Good evening 🌆' : 'Good night 🌙';
}

function viewToday() {
  const t = today();
  const st = todayStats();
  const habits = S.habits.filter(h => scheduled(h, t));
  const open = S.tasks.filter(x => x.date < t && !x.done).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  const todays = S.tasks.filter(x => x.date === t).sort((a, b) => {
    if (a.done !== b.done) return a.done - b.done;
    if (!a.done) {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return b.priority - a.priority;
    }
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return b.priority - a.priority;
  });
  const circ = 2 * Math.PI * 38;
  const msg = !st.total ? 'Add a task or habit to begin.' : st.pct === 100 ? 'All done — shabash! 🎉' : `${st.done} of ${st.total} done today`;
  return `
  <section class="card hero">
    <div class="ring"><svg width="92" height="92" viewBox="0 0 92 92"><circle cx="46" cy="46" r="38" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="9"/><circle cx="46" cy="46" r="38" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - st.pct / 100)}"/></svg><div class="pct">${st.pct}%</div></div>
    <div><h3>Today's progress</h3><p>${msg}</p></div>
  </section>
  ${habits.length ? `<div class="h2">Habits today <button data-act="tab" data-tab="habits">See all</button></div>
  <div class="chips">${habits.map(h => `<button class="chip ${h.log[t] ? 'done' : ''}" data-act="toggleHabit" data-id="${h.id}" data-day="${t}">${esc(h.emoji)} ${esc(h.name)}${h.log[t] ? ' ✓' : ''}</button>`).join('')}</div>` : ''}
  <div class="h2">
    <span>Tasks</span>
    <button class="chip-action" data-act="openReschedule" title="Emergency & Reschedule schedule">⚡ Reschedule</button>
  </div>
  <form class="quick" data-form="quick"><input type="text" name="title" placeholder="Add a task for today…" maxlength="140" autocomplete="off"><button>Add</button></form>
  ${open.length ? `<div class="h2" style="margin-top:6px">Overdue (${open.length})</div>${open.map(taskItem).join('')}` : ''}
  ${todays.length ? todays.map(taskItem).join('') : `<div class="empty"><b>📝</b>No tasks for today.<br>Type above or tap ＋ for more options.</div>`}
  ${upcomingBlock()}`;
}
function upcomingBlock() {
  const t = today();
  const up = S.tasks.filter(x => x.date > t && !x.done).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 6);
  return up.length ? `<div class="h2">Upcoming</div>${up.map(taskItem).join('')}` : '';
}
function taskItem(x) {
  const g = x.goalId && goalById(x.goalId);
  const t = today();
  const late = !x.done && x.date < t;
  const isEmergency = x.isEmergency;
  return `<div class="item ${x.done ? 'done' : ''} ${isEmergency ? 'item-emergency' : ''}">
    <button class="check ${x.done ? 'on' : ''}" data-act="toggleTask" data-id="${x.id}" aria-label="Toggle task">${x.done ? '✓' : ''}</button>
    <button class="body" data-act="editTask" data-id="${x.id}">
      <div class="t">${esc(x.title)}</div>
      <div class="meta">
        ${x.time ? `<span class="tag time-tag">⏰ ${fmtTime(x.time)}</span>` : ''}
        ${x.repeat ? `<span class="tag repeat-tag">🔁 ${x.repeat}</span>` : ''}
        ${x.priority ? `<span class="tag">${x.priority === 2 ? '🔴' : '🟠'} ${PRI[x.priority]}</span>` : ''}
        ${late ? `<span class="tag late">${diffDays(t, x.date)}d late</span>` : x.date > t ? `<span class="tag">${fmtShort(x.date)}</span>` : ''}
        ${g ? `<span class="tag">🎯 ${esc(g.title)}</span>` : ''}
      </div></button>
      ${!x.done && x.time && x.date === t ? `<button class="icon-action-btn" data-act="openReschedule" data-id="${x.id}" title="Reschedule from this task">⚡</button>` : ''}
    </div>`;
}

function viewGoals() {
  const list = S.goals.filter(g => goalFilter === 'active' ? !g.done : g.done);
  return `<div class="seg"><button data-act="goalFilter" data-f="active" class="${goalFilter === 'active' ? 'on' : ''}">Active (${S.goals.filter(g => !g.done).length})</button><button data-act="goalFilter" data-f="done" class="${goalFilter === 'done' ? 'on' : ''}">Achieved (${S.goals.filter(g => g.done).length})</button></div>
  ${list.length ? list.map(goalCard).join('') : `<div class="empty"><b>🎯</b>${goalFilter === 'active' ? 'No active goals yet.<br>Tap ＋ and set your first maqsad.' : 'Achieved goals will appear here.'}</div>`}`;
}
function goalCard(g) {
  const p = goalProgress(g);
  const [ic, cn] = CATS[g.category] || CATS.personal;
  const left = g.deadline ? diffDays(g.deadline, today()) : null;
  const dl = left === null ? '' : left < 0 ? `${-left}d overdue` : left === 0 ? 'Due today' : `${left}d left`;
  const linked = S.tasks.filter(t => t.goalId === g.id);
  return `<section class="card">
    <button class="goal-h" data-act="editGoal" data-id="${g.id}">
      <span class="goal-ic">${ic}</span>
      <span style="flex:1;min-width:0"><div class="t">${esc(g.title)}</div><div class="meta"><span>${cn}</span>${g.deadline ? `<span class="tag ${left < 0 && !g.done ? 'late' : ''}">⏳ ${fmtShort(g.deadline)} · ${dl}</span>` : ''}${linked.length ? `<span class="tag">${linked.filter(t => t.done).length}/${linked.length} tasks</span>` : ''}</div></span>
    </button>
    <div class="bar ${p === 100 ? 'ok' : ''}"><i style="width:${p}%"></i></div>
    <div class="pct-row"><span>${p}% complete</span><span>${g.milestones.filter(m => m.done).length}/${g.milestones.length} milestones</span></div>
    ${g.milestones.map(m => `<div class="ms ${m.done ? 'done' : ''}"><button class="check ${m.done ? 'on' : ''}" data-act="toggleMs" data-g="${g.id}" data-id="${m.id}" aria-label="Toggle milestone">${m.done ? '✓' : ''}</button><span>${esc(m.title)}</span><button class="x" data-act="delMs" data-g="${g.id}" data-id="${m.id}" aria-label="Remove milestone">✕</button></div>`).join('')}
    ${g.done ? '' : `<form class="ms-add" data-form="ms" data-id="${g.id}"><input type="text" name="title" placeholder="Add a milestone…" maxlength="120" autocomplete="off"><button>＋</button></form>`}
  </section>`;
}

function viewHabits() {
  if (!S.habits.length) return `<div class="empty"><b>🔥</b>No habits yet.<br>Tap ＋ to build your first streak.</div>`;
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  return S.habits.map(h => {
    const { cur, best } = streaks(h);
    return `<section class="card">
      <div class="habit-top"><span class="em">${esc(h.emoji)}</span>
        <button class="n" data-act="editHabit" data-id="${h.id}">${esc(h.name)}<div class="meta"><span>${h.days.length === 7 ? 'Every day' : h.days.map(d => DAYS[d]).join(', ')}</span><span>Best ${best}</span><span>${habitRate(h, 30)}% (30d)</span></div></button>
        <span class="streak">🔥 ${cur}</span></div>
      <div class="week">${days.map(k => {
        const on = !!h.log[k], sch = scheduled(h, k);
        return `<div class="day ${k === t ? 'today' : ''}">${DAYS[dow(k)][0]}<button class="${on ? 'on' : sch ? '' : 'off'}" data-act="toggleHabit" data-id="${h.id}" data-day="${k}" aria-label="${DAYS[dow(k)]}">${on ? '✓' : parse(k).getDate()}</button></div>`;
      }).join('')}</div>
    </section>`;
  }).join('');
}

function viewStats() {
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const doneByDay = days.map(k => S.tasks.filter(x => x.done && x.doneOn === k).length);
  const max = Math.max(1, ...doneByDay);
  const weekDone = doneByDay.reduce((a, b) => a + b, 0);
  const bestStreak = S.habits.reduce((m, h) => Math.max(m, streaks(h).cur), 0);
  const active = S.goals.filter(g => !g.done).length;
  const achieved = S.goals.filter(g => g.done).length;
  const weekHabit = (() => { let due = 0, hit = 0; S.habits.forEach(h => days.forEach(k => { if (scheduled(h, k)) { due++; if (h.log[k]) hit++; } })); return due ? Math.round(100 * hit / due) : 0; })();
  return `<div class="tiles">
    <div class="tile"><b>${weekDone}</b><span>Tasks done (7 days)</span></div>
    <div class="tile"><b>${weekHabit}%</b><span>Habit consistency (7d)</span></div>
    <div class="tile"><b>🔥 ${bestStreak}</b><span>Longest live streak</span></div>
    <div class="tile"><b>${achieved}<small style="font-size:15px;color:var(--muted)"> / ${active + achieved}</small></b><span>Goals achieved</span></div>
  </div>
  <section class="card"><div class="h2" style="margin-top:0">Tasks completed per day</div>
    <div class="chart">${days.map((k, i) => `<div class="col ${k === t ? 'today' : ''}"><span class="v">${doneByDay[i] || ''}</span><div class="b" style="height:${Math.round(100 * doneByDay[i] / max)}%;${doneByDay[i] ? '' : 'opacity:.25'}"></div><span class="l">${DAYS[dow(k)]}</span></div>`).join('')}</div></section>
  ${S.habits.length ? `<section class="card"><div class="h2" style="margin-top:0">Habit consistency · last 30 days</div>${S.habits.map(h => { const r = habitRate(h, 30); return `<div class="rate"><span class="n">${esc(h.emoji)} ${esc(h.name)}</span><div class="bar ${r >= 80 ? 'ok' : ''}"><i style="width:${r}%"></i></div><span class="p">${r}%</span></div>`; }).join('')}</section>` : ''}`;
}

function updateClock() {
  const helloEl = $('#hello');
  if (helloEl) helloEl.textContent = greeting();
  const dateLineEl = $('#dateLine');
  if (dateLineEl) {
    const now = new Date();
    const dateStr = fmtLong(today());
    const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    dateLineEl.innerHTML = `<span>${esc(dateStr)}</span><span class="live-sep">·</span><span class="live-clock"><span class="live-dot"></span>${esc(timeStr)}</span>`;
  }
}

function render() {
  updateClock();
  $('#main').innerHTML = { today: viewToday, goals: viewGoals, habits: viewHabits, stats: viewStats }[tab]();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#fab').hidden = tab === 'stats';
}

/* ---------- forms ---------- */
function taskForm(x) {
  const isNew = !x; x = x || { title: '', date: today(), time: '', priority: 0, goalId: '', repeat: '' };
  const goals = S.goals.filter(g => !g.done || g.id === x.goalId);
  openSheet(`<h3>${isNew ? 'New task' : 'Edit task'}</h3>
  <form data-form="task" data-id="${x.id || ''}">
    <div class="field"><label>Task</label><input type="text" name="title" value="${esc(x.title)}" maxlength="140" required autocomplete="off" placeholder="What needs to be done?"></div>
    <div class="row2">
      <div class="field"><label>Date</label><input type="date" name="date" value="${x.date}" required></div>
      <div class="field"><label>Time (optional)</label><input type="time" name="time" value="${x.time || ''}"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Priority</label><select name="priority">${PRI.map((p, i) => `<option value="${i}" ${x.priority === i ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="field"><label>Repeat</label><select name="repeat">
        <option value="" ${!x.repeat ? 'selected' : ''}>None (One-time)</option>
        <option value="daily" ${x.repeat === 'daily' ? 'selected' : ''}>Daily</option>
        <option value="weekly" ${x.repeat === 'weekly' ? 'selected' : ''}>Weekly</option>
        <option value="monthly" ${x.repeat === 'monthly' ? 'selected' : ''}>Monthly</option>
      </select></div>
    </div>
    <div class="field"><label>Link to goal (optional)</label><select name="goalId"><option value="">— None —</option>${goals.map(g => `<option value="${g.id}" ${x.goalId === g.id ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></div>
    <div class="btns">
      ${isNew ? '' : `<button type="button" class="btn danger" data-act="delTask" data-id="${x.id}">Delete</button>`}
      ${!isNew && x.time ? `<button type="button" class="btn" data-act="openReschedule" data-id="${x.id}">⚡ Reschedule</button>` : ''}
      <button type="button" class="btn" data-act="close">Cancel</button>
      <button class="btn primary">Save</button>
    </div>
  </form>`);
}

function rescheduleSheet(fromTaskId) {
  const t = today();
  const targetTask = fromTaskId ? S.tasks.find(x => x.id === fromTaskId) : null;
  const now = new Date();
  const currentHm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const timedToday = S.tasks.filter(x => x.date === t && !x.done && x.time).sort((a,b) => a.time.localeCompare(b.time));
  const defaultTime = targetTask?.time || (timedToday.length ? timedToday[0].time : currentHm);

  openSheet(`<h3>⚡ Emergency & Reschedule</h3>
  <p class="note" style="margin-bottom:14px">Did an unexpected delay happen? Enter the emergency time and delay to automatically push your remaining tasks forward.</p>
  <form data-form="reschedule">
    <div class="field">
      <label>Emergency / Reason (optional)</label>
      <input type="text" name="reason" placeholder="e.g. Doctor visit, urgent meeting, family emergency" maxlength="100" autocomplete="off" value="${targetTask ? 'Delay on ' + esc(targetTask.title) : ''}">
    </div>
    <div class="row2">
      <div class="field">
        <label>Affects tasks at / after</label>
        <input type="time" name="fromTime" value="${defaultTime}" required>
      </div>
      <div class="field">
        <label>Delay (minutes)</label>
        <input type="number" name="delayMinutes" id="delayInput" value="60" min="5" max="720" step="5" required>
      </div>
    </div>
    <div class="field">
      <label>Quick delay presets</label>
      <div class="chips" style="padding-bottom:2px">
        <button type="button" class="chip" data-act="setDelayVal" data-val="30">+30 min</button>
        <button type="button" class="chip done" data-act="setDelayVal" data-val="60">+1 hour</button>
        <button type="button" class="chip" data-act="setDelayVal" data-val="90">+1.5 hrs</button>
        <button type="button" class="chip" data-act="setDelayVal" data-val="120">+2 hours</button>
      </div>
    </div>
    <div class="switch">
      <div>
        <div style="font-weight:600;font-size:14px">Log emergency in schedule</div>
        <div class="note">Inserts a record showing what happened</div>
      </div>
      <input type="checkbox" name="logEmergency" checked style="width:22px;height:22px">
    </div>
    <div class="btns">
      <button type="button" class="btn" data-act="close">Cancel</button>
      <button class="btn primary" type="submit">⚡ Shift Tasks Forward</button>
    </div>
  </form>`);
}
function goalForm(g) {
  const isNew = !g; g = g || { title: '', category: 'personal', deadline: '' };
  openSheet(`<h3>${isNew ? 'New goal' : 'Edit goal'}</h3>
  <form data-form="goal" data-id="${g.id || ''}">
    <div class="field"><label>What do you want to achieve?</label><input type="text" name="title" value="${esc(g.title)}" maxlength="100" required autocomplete="off" placeholder="e.g. Learn Flutter, Save 100k, Run 5 km"></div>
    <div class="row2">
      <div class="field"><label>Category</label><select name="category">${Object.entries(CATS).map(([k, [e, n]]) => `<option value="${k}" ${g.category === k ? 'selected' : ''}>${e} ${n}</option>`).join('')}</select></div>
      <div class="field"><label>Deadline (optional)</label><input type="date" name="deadline" value="${g.deadline || ''}"></div>
    </div>
    ${isNew ? `<div class="field"><label>Milestones (one per line, optional)</label><textarea name="milestones" placeholder="Finish the basics&#10;Build a small project&#10;Publish it"></textarea></div>` : ''}
    <div class="btns">${isNew ? '' : `<button type="button" class="btn danger" data-act="delGoal" data-id="${g.id}">Delete</button><button type="button" class="btn" data-act="completeGoal" data-id="${g.id}">${g.done ? 'Reopen' : 'Mark achieved ✓'}</button>`}<button class="btn primary">Save</button></div>
  </form>`);
}
function habitForm(h) {
  const isNew = !h; h = h || { name: '', emoji: HABIT_EMOJI[0], days: [0, 1, 2, 3, 4, 5, 6] };
  openSheet(`<h3>${isNew ? 'New habit' : 'Edit habit'}</h3>
  <form data-form="habit" data-id="${h.id || ''}">
    <div class="field"><label>Habit</label><input type="text" name="name" value="${esc(h.name)}" maxlength="60" required autocomplete="off" placeholder="e.g. Drink 8 glasses of water"></div>
    <div class="field"><label>Icon</label><div class="emojis">${HABIT_EMOJI.map(e => `<label><input type="radio" name="emoji" value="${e}" ${h.emoji === e ? 'checked' : ''}><span>${e}</span></label>`).join('')}</div></div>
    <div class="field"><label>Repeat on</label><div class="dow">${DAYS.map((d, i) => `<label><input type="checkbox" name="days" value="${i}" ${h.days.includes(i) ? 'checked' : ''}><span>${d[0]}</span></label>`).join('')}</div></div>
    <div class="btns">${isNew ? '' : `<button type="button" class="btn danger" data-act="delHabit" data-id="${h.id}">Delete</button>`}<button type="button" class="btn" data-act="close">Cancel</button><button class="btn primary">Save</button></div>
  </form>`);
}
function settingsSheet() {
  const s = S.settings;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const bytes = new Blob([localStorage.getItem(KEY) || '']).size;
  const sizeKb = (bytes / 1024).toFixed(1);
  openSheet(`<h3>Settings</h3>
  <div class="field"><label>Theme</label><select data-set="theme"><option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Match device</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option></select></div>
  <div class="switch"><span>Daily reminder</span><input type="checkbox" data-set="remind" ${s.remind ? 'checked' : ''} style="width:22px;height:22px"></div>
  <div class="field"><label>Reminder time</label><input type="time" data-set="remindTime" value="${s.remindTime}"></div>
  <p class="note">Reminders fire while Maqsad is open or running in the background on your device. ${perm === 'denied' ? 'Notifications are blocked in your browser settings.' : perm === 'unsupported' ? 'This browser does not support notifications.' : ''}</p>
  <div class="sec"><label style="font-size:13px;font-weight:600;color:var(--muted)">Your data (${sizeKb} KB · 100% free offline storage)</label>
    <div class="btns">
      <button class="btn" data-act="shareBackup" title="Share via WhatsApp, Drive, or Email">📲 Share</button>
      <button class="btn" data-act="export">⬇ Export</button>
      <button class="btn" data-act="import">⬆ Import</button>
    </div>
    <input type="file" id="importFile" accept="application/json" hidden>
    <div class="btns"><button class="btn danger" style="flex:1" data-act="reset">Erase all data</button></div></div>
  <div class="btns"><button class="btn primary" data-act="close">Done</button></div>`);
  $('#importFile').addEventListener('change', importData);
}

/* ---------- actions ---------- */
function completeTask(x) {
  x.done = !x.done;
  x.doneOn = x.done ? today() : null;
  if (x.done && x.repeat) {
    const nextDate = getNextRecurrence(x.date, x.repeat);
    if (nextDate) {
      S.tasks.push({
        id: uid(),
        title: x.title,
        date: nextDate,
        time: x.time || '',
        priority: x.priority || 0,
        goalId: x.goalId || '',
        repeat: x.repeat,
        isEmergency: false,
        done: false,
        doneOn: null
      });
      toast(`Done! Next ${x.repeat} task scheduled for ${fmtShort(nextDate)}`);
    }
  }
}
const actions = {
  tab(d) { tab = d.tab; render(); window.scrollTo(0, 0); },
  close: closeSheet,
  settings: settingsSheet,
  openReschedule(d) { rescheduleSheet(d?.id); },
  setDelayVal(d, el) {
    const input = $('#delayInput');
    if (input) input.value = d.val;
    document.querySelectorAll('[data-act=setDelayVal]').forEach(b => b.classList.toggle('done', b === el));
  },
  fab() { ({ today: () => taskForm(), goals: () => goalForm(), habits: () => habitForm() })[tab]?.(); },
  toggleTask(d) {
    const x = S.tasks.find(t => t.id === d.id); if (!x) return;
    completeTask(x); save(); render();
    if (x.done && todayStats().pct === 100) toast('All done for today — shabash! 🎉');
  },
  editTask(d) { taskForm(S.tasks.find(t => t.id === d.id)); },
  delTask(d) { if (confirm('Delete this task?')) { S.tasks = S.tasks.filter(t => t.id !== d.id); save(); closeSheet(); render(); } },
  goalFilter(d) { goalFilter = d.f; render(); },
  editGoal(d) { goalForm(goalById(d.id)); },
  delGoal(d) { if (confirm('Delete this goal? Linked tasks will stay, but unlinked.')) { S.goals = S.goals.filter(g => g.id !== d.id); S.tasks.forEach(t => { if (t.goalId === d.id) t.goalId = ''; }); save(); closeSheet(); render(); } },
  completeGoal(d) { const g = goalById(d.id); g.done = !g.done; g.doneOn = g.done ? today() : null; save(); closeSheet(); render(); if (g.done) toast('Goal achieved — mubarak! 🏆'); },
  toggleMs(d) { const m = goalById(d.g).milestones.find(m => m.id === d.id); m.done = !m.done; save(); render(); const g = goalById(d.g); if (m.done && g.milestones.every(x => x.done) && !g.done) toast('All milestones done! Open the goal to mark it achieved.'); },
  delMs(d) { const g = goalById(d.g); g.milestones = g.milestones.filter(m => m.id !== d.id); save(); render(); },
  toggleHabit(d) {
    const h = S.habits.find(h => h.id === d.id); if (!h) return;
    if (d.day > today()) return;
    if (h.log[d.day]) delete h.log[d.day]; else h.log[d.day] = true;
    save(); render();
    if (h.log[d.day] && d.day === today()) { const s = streaks(h).cur; if (s > 1 && [3, 7, 14, 21, 30, 50, 100].includes(s)) toast(`🔥 ${s}-day streak on "${h.name}"!`); }
  },
  editHabit(d) { habitForm(S.habits.find(h => h.id === d.id)); },
  delHabit(d) { if (confirm('Delete this habit and its history?')) { S.habits = S.habits.filter(h => h.id !== d.id); save(); closeSheet(); render(); } },
  async shareBackup() {
    const jsonStr = JSON.stringify(S, null, 2);
    const fileName = `maqsad-backup-${today()}.json`;
    if (navigator.share) {
      try {
        const file = new File([jsonStr], fileName, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Maqsad Backup', text: `Maqsad backup (${today()})` });
          toast('Backup shared');
          return;
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    actions.export();
  },
  export() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `maqsad-backup-${today()}.json` });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import() { $('#importFile').click(); },
  reset() { if (confirm('Erase ALL goals, tasks and habits? This cannot be undone.') && confirm('Really erase everything?')) { S = defaults(); save(); applyTheme(); closeSheet(); render(); toast('All data erased'); } },
  install() { if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; $('#installBanner').hidden = true; }); } else showIosHint(); },
  dismissInstall() { $('#installBanner').hidden = true; try { localStorage.setItem('maqsad.noInstall', '1'); } catch {} },
};

function importData(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.tasks) || !Array.isArray(d.goals) || !Array.isArray(d.habits)) throw 0;
      if (!confirm('Replace your current data with this backup?')) return;
      S = Object.assign(defaults(), d); S.settings = Object.assign(defaults().settings, d.settings);
      save(); applyTheme(); closeSheet(); render(); toast('Backup restored');
    } catch { toast('That file is not a valid Maqsad backup'); }
  };
  r.readAsText(f);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  actions[t.dataset.act]?.(t.dataset, t);
});

document.addEventListener('change', e => {
  const k = e.target.dataset.set; if (!k) return;
  const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  S.settings[k] = v; save();
  if (k === 'theme') applyTheme();
  if (k === 'remind' && v) askNotify();
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const fd = new FormData(f), type = f.dataset.form, id = f.dataset.id;
  if (type === 'reschedule') {
    const fromTime = fd.get('fromTime');
    const delayMins = parseInt(fd.get('delayMinutes'), 10) || 60;
    const reason = (fd.get('reason') || '').toString().trim();
    const logEmergency = fd.get('logEmergency') === 'on';
    const t = today();

    const affected = S.tasks.filter(x => x.date === t && !x.done && x.time && x.time >= fromTime);
    if (!affected.length && !logEmergency) {
      toast(`No upcoming timed tasks found at or after ${fmtTime(fromTime)}`);
      return;
    }

    affected.forEach(x => {
      x.time = addMinsToTime(x.time, delayMins);
    });

    if (logEmergency) {
      S.tasks.push({
        id: uid(),
        title: `🚨 ${reason || 'Emergency delay'} (${delayMins}m)`,
        date: t,
        time: fromTime,
        priority: 2,
        goalId: '',
        repeat: '',
        isEmergency: true,
        done: true,
        doneOn: t
      });
    }

    save();
    closeSheet();
    render();
    toast(`⚡ Rescheduled! ${affected.length} task(s) shifted forward by ${delayMins}m.`);
    return;
  }
  const title = (fd.get('title') || fd.get('name') || '').toString().trim();
  if (!title) return;
  if (type === 'quick') {
    S.tasks.push({ id: uid(), title, date: today(), time: '', priority: 0, goalId: '', repeat: '', isEmergency: false, done: false, doneOn: null });
    save(); render(); const i = $('form[data-form=quick] input'); i && i.focus();
  } else if (type === 'task') {
    const o = {
      title,
      date: fd.get('date') || today(),
      time: fd.get('time') || '',
      priority: +fd.get('priority') || 0,
      repeat: fd.get('repeat') || '',
      goalId: fd.get('goalId') || '',
      isEmergency: false
    };
    if (id) Object.assign(S.tasks.find(t => t.id === id), o); else S.tasks.push({ id: uid(), done: false, doneOn: null, ...o });
    save(); closeSheet(); render();
  } else if (type === 'goal') {
    const o = { title, category: fd.get('category'), deadline: fd.get('deadline') || '' };
    if (id) Object.assign(goalById(id), o);
    else S.goals.push({ id: uid(), done: false, doneOn: null, created: today(), milestones: (fd.get('milestones') || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => ({ id: uid(), title: s, done: false })), ...o });
    save(); closeSheet(); render();
  } else if (type === 'habit') {
    let days = fd.getAll('days').map(Number); if (!days.length) days = [0, 1, 2, 3, 4, 5, 6];
    const o = { name: title, emoji: fd.get('emoji') || HABIT_EMOJI[0], days };
    if (id) Object.assign(S.habits.find(h => h.id === id), o); else S.habits.push({ id: uid(), log: {}, created: today(), ...o });
    save(); closeSheet(); render();
  } else if (type === 'ms') {
    goalById(id).milestones.push({ id: uid(), title, done: false });
    save(); render(); const i = $(`form[data-id="${id}"] input`); i && i.focus();
  }
});

/* ---------- reminders (while app is running) ---------- */
function askNotify() {
  if (!('Notification' in window)) return toast('Notifications are not supported here');
  if (Notification.permission === 'default') Notification.requestPermission().then(p => { if (p !== 'granted') toast('Permission not granted'); });
}
function checkReminder() {
  const s = S.settings;
  if (!s.remind || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (hm < s.remindTime || s.lastNotified === today()) return;
  const st = todayStats();
  s.lastNotified = today(); save();
  if (st.total && st.done < st.total) {
    const body = `${st.total - st.done} item${st.total - st.done > 1 ? 's' : ''} left today. Finish strong! 💪`;
    navigator.serviceWorker?.ready.then(r => r.showNotification('Maqsad', { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'maqsad-daily' })).catch(() => new Notification('Maqsad', { body }));
  }
}
setInterval(checkReminder, 30000);

/* ---------- install prompt ---------- */
let deferredInstall = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  if (!standalone && !localStorage.getItem('maqsad.noInstall')) $('#installBanner').hidden = false;
});
window.addEventListener('appinstalled', () => { $('#installBanner').hidden = true; toast('Maqsad installed 🎉'); });
function showIosHint() { toast('Browser menu → "Add to Home Screen" / "Install app"'); }
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent) && !localStorage.getItem('maqsad.noInstall')) {
  $('#installBanner').hidden = false;
  $('#installBanner span').textContent = '📲 To install: tap Share, then "Add to Home Screen".';
  $('#installBanner [data-act=install]').hidden = true;
}

/* ---------- boot ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
// refresh when the day rolls over or the app returns to foreground
let lastDay = today();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateClock(); if (today() !== lastDay) { lastDay = today(); render(); } checkReminder(); } });
applyTheme();
render();
setInterval(updateClock, 1000);
})();
