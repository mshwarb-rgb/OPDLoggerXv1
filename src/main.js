import { DX, DISPOSITIONS, AGE_GROUPS, GENDERS, WW_OPTIONS, dxByNo } from './constants.js';
import { getAllDates, getSetting, getVisitsByDate, saveVisit, setSetting } from './db.js';
import { computeSummary } from './summary.js';
import { exportDayXlsx } from './exportExcel.js';
import { formatDateLabel, nowTimeHHMM, todayISO, uuid } from './utils.js';

const state = {
  tab: 'entry',
  visitDate: todayISO(),
  form: resetForm(),
  doctorName: '',
  visits: [],
};

function resetForm(){
  return {
    id: null,
    time: nowTimeHHMM(),
    patientId: '',
    gender: '',
    ageGroup: '',
    diagnoses: [],
    disposition: 'Discharged',
    wwStatus: '',
    isSurgical: false,
  };
}

const el = (sel) => document.querySelector(sel);
const view = el('#view');
const subtitle = el('#subtitle');

const dateLabel = el('#dateLabel');
const dateInput = el('#dateInput');
const pickDateBtn = el('#pickDateBtn');

const sticky = el('#stickyActions');
const saveNewBtn = el('#saveNewBtn');
const resetBtn = el('#resetBtn');

const settingsBtn = el('#settingsBtn');
const settingsDialog = el('#settingsDialog');
const doctorNameInput = el('#doctorNameInput');
const saveSettingsBtn = el('#saveSettingsBtn');
const closeSettingsBtn = el('#closeSettingsBtn');

const infoDialog = el('#infoDialog');
const infoTitle = el('#infoTitle');
const infoBody = el('#infoBody');
const closeInfoBtn = el('#closeInfoBtn');

function showInfo(title, body){
  infoTitle.textContent = title;
  infoBody.textContent = body;
  infoDialog.showModal();
}

closeInfoBtn.addEventListener('click', ()=> infoDialog.close());

async function loadDoctorName(){
  state.doctorName = await getSetting('doctorName', '');
  doctorNameInput.value = state.doctorName || '';
}

async function loadVisits(){
  state.visits = await getVisitsByDate(state.visitDate);
}

function setSubtitle(){
  subtitle.textContent = `${formatDateLabel(state.visitDate)} • ${state.doctorName ? state.doctorName : 'No doctor name (set in Settings)'}`;
}

function updateDateUI(){
  dateLabel.textContent = formatDateLabel(state.visitDate);
  dateInput.value = state.visitDate;
  setSubtitle();
}

pickDateBtn.addEventListener('click', () => dateInput.showPicker?.() || dateInput.click());
dateLabel.addEventListener('click', () => dateInput.showPicker?.() || dateInput.click());
dateInput.addEventListener('change', async () => {
  state.visitDate = dateInput.value || todayISO();
  await loadVisits();
  updateDateUI();
  render();
});

settingsBtn.addEventListener('click', async () => {
  await loadDoctorName();
  settingsDialog.showModal();
});

closeSettingsBtn.addEventListener('click', () => settingsDialog.close());
saveSettingsBtn.addEventListener('click', async () => {
  const name = doctorNameInput.value.trim();
  await setSetting('doctorName', name);
  state.doctorName = name;
  settingsDialog.close();
  setSubtitle();
});

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.tab = btn.dataset.tab;
    await loadVisits();
    render();
  });
});

function computeIsSurgical(){
  state.form.isSurgical = (state.form.diagnoses || []).some(no => dxByNo(no)?.cat === 'S');
  if (!state.form.isSurgical){
    state.form.wwStatus = '';
  }
}

function toggleDx(no){
  const arr = state.form.diagnoses.slice();
  const idx = arr.indexOf(no);
  if (idx >= 0) arr.splice(idx,1);
  else {
    if (arr.length >= 2) return;
    arr.push(no);
  }
  state.form.diagnoses = arr.sort((a,b)=>a-b);
  computeIsSurgical();
}

function setGender(g){ state.form.gender = g; }
function setAge(a){ state.form.ageGroup = a; }
function setDisposition(d){ state.form.disposition = d; }
function setWW(w){ state.form.wwStatus = w; }

function keypadPress(k){
  if (k === 'CLR') state.form.patientId = '';
  else if (k === 'DEL') state.form.patientId = state.form.patientId.slice(0,-1);
  else state.form.patientId = (state.form.patientId + k).slice(0,3);
}

function validateForm(){
  if (!state.form.patientId || state.form.patientId.length < 1) return 'Patient ID is required.';
  if (!state.form.gender) return 'Gender is required.';
  if (!state.form.ageGroup) return 'Age group is required.';
  if (!state.form.diagnoses.length) return 'Select at least 1 diagnosis.';
  if (state.form.isSurgical && !state.form.wwStatus) return 'Select WW or Non-WW for surgical cases.';
  if (!state.form.disposition) return 'Disposition is required.';
  return null;
}

async function saveCurrent({ resetAfter=true }){
  const err = validateForm();
  if (err){ showInfo('Missing information', err); return; }

  const visit = {
    id: state.form.id || uuid(),
    visitDate: state.visitDate,
    time: state.form.time || nowTimeHHMM(),
    patientId: state.form.patientId,
    gender: state.form.gender,
    ageGroup: state.form.ageGroup,
    diagnoses: state.form.diagnoses.slice(),
    disposition: state.form.disposition,
    wwStatus: state.form.isSurgical ? state.form.wwStatus : '',
    isSurgical: !!state.form.isSurgical,
    updatedAt: Date.now(),
  };

  await saveVisit(visit);
  await loadVisits();

  if (resetAfter){
    state.form = resetForm();
    computeIsSurgical();
  } else {
    state.form.id = visit.id;
  }
  render();
}

saveNewBtn.addEventListener('click', ()=> saveCurrent({ resetAfter:true }));
resetBtn.addEventListener('click', ()=> { state.form = resetForm(); computeIsSurgical(); render(); });

function renderEntry(){
  sticky.style.display = 'block';

  const f = state.form;

  const dxButtons = DX.map(d => {
    const active = f.diagnoses.includes(d.no) ? 'active' : '';
    return `
      <button class="dx ${active}" data-dx="${d.no}">
        <div class="n">${d.no}. ${d.short}</div>
        <div class="t">${d.name}</div>
      </button>
    `;
  }).join('');

  const genderPills = GENDERS.map(g => `
    <button class="pill ${f.gender===g?'active':''}" data-g="${g}">${g}</button>
  `).join('');

  const agePills = AGE_GROUPS.map(a => `
    <button class="pill ${f.ageGroup===a?'active':''}" data-a="${a}">${a}</button>
  `).join('');

  const dispoPills = DISPOSITIONS.map(d => `
    <button class="pill ${f.disposition===d?'active':''}" data-d="${d}">${d}</button>
  `).join('');

  const wwPills = f.isSurgical ? WW_OPTIONS.map(w => `
    <button class="pill ${f.wwStatus===w?'active':''}" data-w="${w}">${w}</button>
  `).join('') : `<div class="hint">WW/Non-WW appears only when a surgical diagnosis is selected.</div>`;

  view.innerHTML = `
    <div class="grid">
      <div class="card">
        <h3>Patient</h3>
        <div class="form-grid">
          <div>
            <div class="field" id="pidField">${f.patientId ? f.patientId : '---'}</div>
            <div style="height:10px"></div>
            <div class="keypad">
              ${['1','2','3','4','5','6','7','8','9','CLR','0','DEL'].map(k => `
                <button class="key" data-k="${k}">${k==='DEL'?'⌫':k}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <div class="hint"><b>Time:</b> ${f.time}</div>
            <div style="height:10px"></div>
            <h3 style="margin-bottom:6px">Gender</h3>
            <div class="pill-row">${genderPills}</div>
            <div style="height:10px"></div>
            <h3 style="margin-bottom:6px">Age</h3>
            <div class="pill-row">${agePills}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Diagnosis (choose up to 2)</h3>
        <div class="dx-grid">${dxButtons}</div>
        <div style="height:10px"></div>
        <div class="hint"><b>Selected:</b> ${f.diagnoses.length ? f.diagnoses.map(n => `${n} ${dxByNo(n)?.short}`).join(', ') : 'None'}</div>
      </div>

      <div class="card">
        <h3>Disposition</h3>
        <div class="pill-row">${dispoPills}</div>
        <div style="height:10px"></div>
        <h3>War-wounded (only for Surgical)</h3>
        <div class="pill-row" id="wwRow">${wwPills}</div>
      </div>
    </div>
  `;

  view.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { keypadPress(b.dataset.k); render(); }));
  view.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { setGender(b.dataset.g); render(); }));
  view.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { setAge(b.dataset.a); render(); }));
  view.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { setDisposition(b.dataset.d); render(); }));
  view.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => { setWW(b.dataset.w); render(); }));
  view.querySelectorAll('[data-dx]').forEach(b => b.addEventListener('click', () => { toggleDx(Number(b.dataset.dx)); render(); }));
}

function renderSummary(){
  sticky.style.display = 'none';

  const s = computeSummary(state.visits);

  const dispoMini = DISPOSITIONS.map(d => `
    <div class="mini">
      <div class="k">${d}</div>
      <div class="v">${s.dispo[d] ?? 0}</div>
    </div>
  `).join('');

  const ageRows = AGE_GROUPS.map(a => `
    <tr>
      <td><b>${a}</b></td>
      <td class="right">${s.ageGender[a].Male}</td>
      <td class="right">${s.ageGender[a].Female}</td>
    </tr>
  `).join('');

  const dxCounts = DX.map(d => `
    <div class="dxcount" data-dxinfo="${d.no}">
      <div class="l">${d.no}</div>
      <div class="c">${s.dxCounts[d.no] ?? 0}</div>
    </div>
  `).join('');

  view.innerHTML = `
    <div class="grid">
      <div class="card">
        <h3>Overview</h3>
        <div class="row">
          <div class="stat">
            <div class="k">Total</div>
            <div class="v">${s.total}</div>
            <div class="s muted">Visits</div>
          </div>
          <div class="stat">
            <div class="k">Male</div>
            <div class="v">${s.male}</div>
          </div>
          <div class="stat">
            <div class="k">Female</div>
            <div class="v">${s.female}</div>
          </div>
          <div class="stat">
            <div class="k">Surgical</div>
            <div class="v">${s.surgTotal}</div>
            <div class="s muted">WW ${s.ww} / Non ${s.nonww}</div>
          </div>
        </div>
        <div style="height:10px"></div>
        <div class="row">${dispoMini}</div>
      </div>

      <div class="card">
        <h3>Age × Gender</h3>
        <table>
          <thead>
            <tr><th>Age</th><th class="right">Male</th><th class="right">Female</th></tr>
          </thead>
          <tbody>
            ${ageRows}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>Diagnosis counts (tap number for name)</h3>
        <div class="dxcount-grid">${dxCounts}</div>
        <div style="height:8px"></div>
        <div class="hint muted">Counts include Dx1 + Dx2 (if selected).</div>
      </div>
    </div>
  `;

  view.querySelectorAll('[data-dxinfo]').forEach(x => x.addEventListener('click', () => {
    const no = Number(x.dataset.dxinfo);
    const d = dxByNo(no);
    showInfo(`Dx ${no}`, d ? `${d.name} (${d.cat === 'S' ? 'Surgical' : 'Medical'})` : 'Unknown');
  }));
}

function renderData(){
  sticky.style.display = 'none';

  const visits = state.visits.slice().sort((a,b)=> (b.time||'').localeCompare(a.time||''));
  const rows = visits.map(v => `
    <tr>
      <td>${v.time || ''}</td>
      <td>${v.patientId || ''}</td>
      <td>${v.gender || ''}</td>
      <td>${v.ageGroup || ''}</td>
      <td>${(v.diagnoses||[]).join(', ')}</td>
      <td>${v.isSurgical ? 'S' : 'M'}</td>
      <td>${v.isSurgical ? (v.wwStatus||'') : ''}</td>
      <td>${v.disposition || ''}</td>
    </tr>
  `).join('');

  view.innerHTML = `
    <div class="grid">
      <div class="card">
        <h3>Export (selected day only)</h3>
        <div class="btn-row">
          <button class="btn primary" id="exportXlsxBtn">Export Excel (.xlsx)</button>
          <button class="btn secondary" id="backupBtn">Backup JSON</button>
          <button class="btn secondary" id="restoreBtn">Restore JSON</button>
        </div>
        <div style="height:10px"></div>
        <div class="hint">
          Excel export includes <b>Doctor name</b>, <b>Day Summary</b>, and <b>Raw Data</b> with formulas.
        </div>
      </div>

      <div class="card">
        <h3>Visits for ${state.visitDate} (${visits.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th><th>ID</th><th>Gender</th><th>Age</th><th>Dx</th><th>Cat</th><th>WW</th><th>Disp</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="8" class="muted">No records for this date.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>Other days</h3>
        <div class="hint muted" id="daysHint">Loading…</div>
        <div style="height:8px"></div>
        <div class="pill-row" id="daysRow"></div>
      </div>
    </div>
  `;

  el('#exportXlsxBtn').addEventListener('click', async () => {
    const name = state.doctorName || (await getSetting('doctorName',''));
    if (!name){
      showInfo('Doctor name needed', 'Please set your name in Settings before exporting.');
      return;
    }
    await exportDayXlsx({ visits: state.visits, visitDate: state.visitDate, doctorName: name });
  });

  el('#backupBtn').addEventListener('click', async () => {
    const all = await (await import('./db.js')).getAllVisits();
    const payload = {
      exportedAt: new Date().toISOString(),
      doctorName: state.doctorName || '',
      visits: all,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const { downloadBlob } = await import('./utils.js');
    downloadBlob(blob, `OPD_LoggerX_Backup_${todayISO()}.json`);
  });

  el('#restoreBtn').addEventListener('click', async () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      const txt = await file.text();
      let data;
      try { data = JSON.parse(txt); } catch { showInfo('Invalid file','Could not read JSON.'); return; }
      if (!data?.visits || !Array.isArray(data.visits)){
        showInfo('Invalid backup','This JSON does not look like an OPD LoggerX backup.');
        return;
      }
      const { saveVisit } = await import('./db.js');
      for (const v of data.visits){
        if (!v.id) v.id = uuid();
        await saveVisit(v);
      }
      showInfo('Restored', `Imported ${data.visits.length} records.`);
      await loadVisits();
      render();
    };
    inp.click();
  });

  // render other days chips
  (async () => {
    const days = await getAllDates();
    const daysRow = el('#daysRow');
    const daysHint = el('#daysHint');
    if (!days.length){
      daysHint.textContent = 'No other saved days yet.';
      return;
    }
    daysHint.textContent = 'Tap a day to open and export it.';
    daysRow.innerHTML = days.slice(0, 30).map(d => `
      <button class="pill ${d===state.visitDate?'active':''}" data-day="${d}">${d}</button>
    `).join('');
    daysRow.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', async () => {
      state.visitDate = b.dataset.day;
      updateDateUI();
      await loadVisits();
      render();
    }));
  })();
}

function render(){
  updateDateUI();
  if (state.tab === 'entry') renderEntry();
  if (state.tab === 'summary') renderSummary();
  if (state.tab === 'data') renderData();
}

async function init(){
  await loadDoctorName();
  await loadVisits();
  updateDateUI();
  render();

  // PWA SW
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
}

init();
