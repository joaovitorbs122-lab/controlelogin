/* ═══════════════════════════════════════════════════════
   Controle de Estudo — app.js
   ═══════════════════════════════════════════════════════ */

/* ════════════ CONSTANTES ════════════ */

const MATERIAS = [
  'Matemática','Português','Inglês','Biologia',
  'Física','Química','História','Geografia','Filosofia','Sociologia'
];

// Questões por matéria no ENEM
const ENEM_TOTAIS = {
  'Português': 40, 'Matemática': 45, 'Biologia': 15,
  'História': 15, 'Geografia': 15, 'Física': 15,
  'Química': 15, 'Inglês': 5, 'Filosofia': 7, 'Sociologia': 8
};

// Questões por matéria na FUVEST
const FUVEST_TOTAIS = {
  'Português': 13, 'Matemática': 10, 'Biologia': 9,
  'História': 9, 'Geografia': 9, 'Física': 9,
  'Química': 9, 'Inglês': 6, 'Filosofia': 3, 'Sociologia': 3
};

// Matérias agrupadas por área ENEM
const ENEM_AREAS = {
  matematica: { label: 'Matemática',            materias: ['Matemática'] },
  linguagens: { label: 'Linguagens',             materias: ['Português','Inglês'] },
  humanas:    { label: 'Ciências Humanas',       materias: ['História','Geografia','Filosofia','Sociologia'] },
  natureza:   { label: 'Ciências da Natureza',   materias: ['Biologia','Física','Química'] },
};

// Agrupamento por dia ENEM (para formulário e gráficos)
const ENEM_DIAS = {
  dia1: { label: '1º Dia — Linguagens e Humanas', areas: ['linguagens','humanas'] },
  dia2: { label: '2º Dia — Matemática e Ciências da Natureza', areas: ['matematica','natureza'] },
};

// Total de questões por área ENEM
const ENEM_AREA_TOTAIS = {
  matematica: 45,
  linguagens: 45,
  humanas:    45,
  natureza:   45,
};

const MATERIA_TO_AREA = {};
Object.entries(ENEM_AREAS).forEach(([areaKey, { materias }]) => {
  materias.forEach(m => { MATERIA_TO_AREA[m] = areaKey; });
});

/* ════════════ UTILITÁRIOS ════════════ */

const fmtDate = iso => {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const pct = (ac, tot) => (!tot ? 0 : Math.round((ac / tot) * 100));
const pctClass = p => p >= 75 ? 'high' : p >= 60 ? 'mid' : p >= 40 ? 'low' : 'danger';
const today = () => new Date().toISOString().slice(0,10);
const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const diffDays = iso => { const now = new Date(); now.setHours(0,0,0,0); return Math.round((new Date(iso+'T00:00:00') - now) / 86_400_000); };
const chartColor = idx => ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#14b8a6','#ec4899','#84cc16'][idx % 10];

/* ─── Toast ─── */
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

/* ─── Compressão de imagem ─── */
function compressImage(file, maxW = 900, quality = 0.72) {
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        res(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ════════════ NAVEGAÇÃO ════════════ */

function initNav() {
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
      document.getElementById('sidebar').classList.remove('open');
    });
  });
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('mainContent').addEventListener('click', e => {
    if (!e.target.closest('.sidebar')) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
}

function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
  const renders = {
    dashboard:       renderDashboard,
    simulados:       renderSimulados,
    enem:            renderEnem,
    fuvest:          renderFuvest,
    graficos:        renderGraficos,
    revisao:         renderRevisao,
    erros:           renderErros,
    config:          renderConfig,
    redacoes_enem:   renderRedacoesEnem,
    redacoes_gerais: renderRedacoesGerais,
    repertorios:     renderRepertorios,
    cronograma:      renderCronograma,
    discursivos:     renderDiscursivos,
  };
  renders[pageId]?.();
}

function initSidebarDate() {
  const el = document.getElementById('sidebarDate');
  if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

/* ════════════ DASHBOARD ════════════ */

async function renderDashboard() {
  const [sims, enems, fuvests, revisoes] = await Promise.all([
    dbGetAll('simulados'), dbGetAll('enem'), dbGetAll('fuvest'), dbGetAll('revisoes'),
  ]);

  // Média ENEM em acertos inteiros
  const enemMediaEl = document.getElementById('statEnemMedia');
  if (enems.length) {
    const mediaAc = Math.round(enems.reduce((sum, s) => {
      return sum + (s.materias||[]).reduce((t,m) => t + (m.acertos||0), 0);
    }, 0) / enems.length);
    enemMediaEl.textContent = mediaAc;
  } else { enemMediaEl.textContent = '—'; }

  // Média FUVEST em acertos inteiros
  const fuvestMediaEl = document.getElementById('statFuvestMedia');
  if (fuvests.length) {
    const mediaAc = Math.round(fuvests.reduce((sum, s) => {
      return sum + (s.materias||[]).reduce((t,m) => t + (m.acertos||0), 0);
    }, 0) / fuvests.length);
    fuvestMediaEl.textContent = mediaAc;
  } else { fuvestMediaEl.textContent = '—'; }

  // Média vestibulares gerais em porcentagem
  const geralPctEl = document.getElementById('statGeralPct');
  if (sims.length) {
    let totalAc = 0, totalQ = 0;
    sims.forEach(s => {
      (s.materias||[]).forEach(m => { totalAc += m.acertos || 0; totalQ += m.total || 0; });
    });
    geralPctEl.textContent = totalQ ? pct(totalAc, totalQ) + '%' : '—';
  } else { geralPctEl.textContent = '—'; }

  const allSims = [...sims, ...enems, ...fuvests];
  document.getElementById('statTotalSim').textContent = allSims.length;

  // Por matéria (simulados gerais)
  const byMat = buildByMateria(sims);
  const ranking = Object.entries(byMat)
    .map(([m, v]) => ({ materia: m, pct: pct(v.ac, v.tot) }))
    .sort((a, b) => b.pct - a.pct);
  document.getElementById('statMelhor').textContent = ranking.length ? ranking[0].materia : '—';
  document.getElementById('statFraca').textContent  = ranking.length ? ranking[ranking.length-1].materia : '—';

  // Último simulado geral
  renderUltimoCard('ultimoSimuladoCard', sims);
  // Último FUVEST
  renderUltimoCard('ultimoFuvestCard', fuvests);
  // Último ENEM
  renderUltimoCard('ultimoEnemCard', enems);

  // Próximas revisões
  const revEl = document.getElementById('proximasRevisoes');
  const pending = revisoes
    .flatMap(r => (r.datas||[]).filter(d => !d.feita).map(d => ({ ...d, revId: r.id })))
    .sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6);
  if (pending.length) {
    revEl.innerHTML = pending.map(d => {
      const diff = diffDays(d.data);
      let cls = 'future', label = fmtDate(d.data);
      if (diff < 0)       { cls = 'overdue'; label = `Atrasada ${-diff}d`; }
      else if (diff === 0) { cls = 'today';   label = 'Hoje'; }
      else if (diff <= 3)  { cls = 'soon';    label = `Em ${diff}d`; }
      return `<div class="next-rev-item">
        <span class="next-rev-name">${d.conteudo} <small style="color:var(--text-muted)">(${d.materia})</small></span>
        <span class="next-rev-date ${cls}">${label}</span>
      </div>`;
    }).join('');
  } else {
    revEl.innerHTML = '<p class="empty-state">Sem revisões agendadas.</p>';
  }

  // Ranking
  const rankEl = document.getElementById('rankingMaterias');
  if (ranking.length) {
    rankEl.innerHTML = ranking.map((r, i) => `
      <div class="ranking-item">
        <span class="rank-pos">${i+1}</span>
        <span class="rank-name">${r.materia}</span>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:${r.pct}%;background:${chartColor(i)}"></div></div>
        <span class="rank-pct" style="color:${chartColor(i)}">${r.pct}%</span>
      </div>`).join('');
  } else {
    rankEl.innerHTML = '<p class="empty-state">Adicione simulados para ver o ranking.</p>';
  }
}

function renderUltimoCard(elId, sims) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!sims.length) { el.innerHTML = '<p class="empty-state">Nenhum simulado registrado.</p>'; return; }
  const last = [...sims].sort((a, b) => (b.data||'').localeCompare(a.data||''))[0];
  const lAc  = (last.materias||[]).reduce((s,m) => s + (m.acertos||0), 0);
  const lTot = (last.materias||[]).reduce((s,m) => s + (m.total||0), 0);
  const p = pct(lAc, lTot);
  el.innerHTML = `
    <div class="last-sim-row"><span class="last-sim-label">Nome</span><span class="last-sim-value">${last.nome||'—'}</span></div>
    <div class="last-sim-row"><span class="last-sim-label">Data</span><span class="last-sim-value">${fmtDate(last.data)}</span></div>
    <div class="last-sim-row"><span class="last-sim-label">Questões</span><span class="last-sim-value">${lAc}/${lTot}</span></div>
    <div class="last-sim-row"><span class="last-sim-label">Desempenho</span><span class="last-sim-value pct-badge ${pctClass(p)}">${p}%</span></div>`;
}

/* Helper: agrupa acertos/total por matéria */
function buildByMateria(sims) {
  const byMat = {};
  sims.forEach(s => {
    (s.materias||[]).forEach(m => {
      if (!m.materia || !m.total) return;
      if (!byMat[m.materia]) byMat[m.materia] = { ac: 0, tot: 0 };
      byMat[m.materia].ac  += m.acertos || 0;
      byMat[m.materia].tot += m.total   || 0;
    });
  });
  return byMat;
}

/* ════════════ FORMULÁRIO DE MATÉRIAS (tabela compartilhada) ════════════ */

function buildMateriasTable(tbodyId, materias, valores = {}, totaisFixos = null, totaisDefault = null) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = materias.map(mat => {
    const v = valores[mat] || {};
    const totalFixo    = totaisFixos   ? totaisFixos[mat]   : null;
    const totalDefault = totaisDefault ? totaisDefault[mat] : null;
    // Se fixo: readonly com valor fixo. Se default: editável mas pré-preenchido. Se nenhum: campo em branco.
    const totalVal      = totalFixo !== null ? totalFixo : (v.total ?? totalDefault ?? '');
    const totalReadonly = totalFixo !== null ? 'readonly style="background:var(--surface-2);color:var(--text-secondary)"' : '';
    return `
    <tr data-materia="${mat}">
      <td>${mat}</td>
      <td><input class="mat-input mat-acertos" type="number" min="0" placeholder="—" value="${v.acertos ?? ''}" /></td>
      <td><input class="mat-input mat-total" type="number" min="0" placeholder="—" value="${totalVal}" ${totalReadonly} /></td>
      <td><span class="mat-pct empty">—</span></td>
    </tr>`;
  }).join('');
  attachTableListeners(tbodyId);
}

function attachTableListeners(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const updateRow = (row) => {
    const ac  = parseInt(row.querySelector('.mat-acertos').value) || 0;
    const tot = parseInt(row.querySelector('.mat-total').value)   || 0;
    const el  = row.querySelector('.mat-pct');
    if (!tot) { el.textContent = '—'; el.className = 'mat-pct empty'; return; }
    const p = pct(ac, tot);
    el.textContent = p + '%';
    el.className   = 'mat-pct ' + pctClass(p);
  };
  tbody.querySelectorAll('tr').forEach(row => {
    row.querySelectorAll('.mat-input').forEach(inp => {
      inp.addEventListener('input', () => { updateRow(row); updateTotals(tbodyId); });
    });
    updateRow(row);
  });
  updateTotals(tbodyId);
}

function updateTotals(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  let totalAc = 0, totalTot = 0;
  tbody.querySelectorAll('tr').forEach(row => {
    const ac  = parseInt(row.querySelector('.mat-acertos').value) || 0;
    const tot = parseInt(row.querySelector('.mat-total').value)   || 0;
    totalAc  += ac;
    totalTot += tot;
  });

  if (tbodyId === 'simMateriasBody') {
    document.getElementById('simTotalAcertos').textContent  = totalAc  || '—';
    document.getElementById('simTotalQuestoes').textContent = totalTot || '—';
    const p = pct(totalAc, totalTot);
    document.getElementById('simTotalPct').textContent = totalTot ? p + '%' : '—';
  }
  if (tbodyId === 'fuvestMateriasBody') {
    document.getElementById('fuvestTotalAcertos').textContent  = totalAc  || '—';
    document.getElementById('fuvestTotalQuestoes').textContent = totalTot || '—';
    const p = pct(totalAc, totalTot);
    document.getElementById('fuvestTotalPct').textContent = totalTot ? p + '%' : '—';
  }
}

function readMateriasTable(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return [];
  const result = [];
  tbody.querySelectorAll('tr').forEach(row => {
    const mat = row.dataset.materia;
    const ac  = parseInt(row.querySelector('.mat-acertos').value);
    const tot = parseInt(row.querySelector('.mat-total').value);
    if (!isNaN(tot) && tot > 0) {
      result.push({ materia: mat, acertos: isNaN(ac) ? 0 : ac, total: tot, pct: pct(isNaN(ac)?0:ac, tot) });
    }
  });
  return result;
}

/* ════════════ SIMULADOS GERAIS ════════════ */

function initSimulados() {
  document.getElementById('btnNovoSimulado').addEventListener('click', () => openFormSimulado());
  document.getElementById('btnFecharFormSimulado').addEventListener('click', () => {
    document.getElementById('formSimuladoCard').classList.add('hidden');
  });
  document.getElementById('btnFecharModalSimulado').addEventListener('click', () => {
    document.getElementById('modalSimulado').classList.add('hidden');
  });
  document.getElementById('modalSimulado').addEventListener('click', e => {
    if (e.target === document.getElementById('modalSimulado')) document.getElementById('modalSimulado').classList.add('hidden');
  });
  document.getElementById('btnAddMatDiscursiva').addEventListener('click', () => {
    addSimDiscursivaMateria('simDiscursivaWrap');
  });

  document.getElementById('formSimulado').addEventListener('submit', async e => {
    e.preventDefault();
    const materias = readMateriasTable('simMateriasBody');
    if (!materias.length) { showToast('Preencha pelo menos uma matéria.', 'error'); return; }
    const id  = document.getElementById('simId').value;
    const discursiva = readSimDiscursivaForm();
    const obj = {
      nome:        document.getElementById('simNome').value.trim(),
      data:        document.getElementById('simData').value,
      tempo:       parseInt(document.getElementById('simTempo').value) || 0,
      dificuldade: document.getElementById('simDificuldade').value,
      materias, discursiva, tipo: 'geral',
    };
    if (id) obj.id = id;
    await dbSave('simulados', obj);
    showToast('Simulado salvo!', 'success');
    document.getElementById('formSimuladoCard').classList.add('hidden');
    renderSimulados();
  });
}

function openFormSimulado(dados = null) {
  document.getElementById('formSimuladoTitle').textContent = dados ? 'Editar Simulado' : 'Novo Simulado';
  document.getElementById('simId').value = dados?.id || '';
  document.getElementById('simNome').value = dados?.nome || '';
  document.getElementById('simData').value = dados?.data || today();
  document.getElementById('simTempo').value = dados?.tempo || '';
  document.getElementById('simDificuldade').value = dados?.dificuldade || 'medio';
  const valoresMap = {};
  (dados?.materias || []).forEach(m => { valoresMap[m.materia] = m; });
  buildMateriasTable('simMateriasBody', MATERIAS, valoresMap, null);
  // Carrega discursiva salva (se houver)
  buildSimDiscursivaForm(dados?.discursiva || []);
  document.getElementById('formSimuladoCard').classList.remove('hidden');
  document.getElementById('formSimuladoCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderSimulados() {
  const sims  = await dbGetAll('simulados');
  const lista = document.getElementById('listaSimulados');
  if (!sims.length) { lista.innerHTML = '<p class="empty-state" style="padding:32px 0">Nenhum simulado cadastrado.</p>'; return; }
  const sorted = [...sims].sort((a, b) => (b.data||'').localeCompare(a.data||''));
  lista.innerHTML = sorted.map(s => simItemHTML(s, 'simulados')).join('');
  lista.querySelectorAll('.sim-item').forEach(el => {
    el.addEventListener('click', () => openModalSimulado(el.dataset.id, 'simulados'));
  });
}

function simItemHTML(s, store) {
  const totalAc  = (s.materias||[]).reduce((t,m) => t + (m.acertos||0), 0);
  const totalTot = (s.materias||[]).reduce((t,m) => t + (m.total||0), 0);
  const p = pct(totalAc, totalTot);
  const miniBadges = (s.materias||[]).map(m =>
    `<span class="mini-badge ${pctClass(m.pct ?? pct(m.acertos,m.total))}">${m.materia}: ${m.acertos}/${m.total}</span>`
  ).join('');
  const editFn   = store === 'simulados' ? `editSimulado` : store === 'fuvest' ? 'editFuvest' : 'editEnem';
  const deleteFn = store === 'simulados' ? `deleteSimulado` : store === 'fuvest' ? 'deleteFuvest' : 'deleteEnem';

  // ENEM: mostra acertos/180 | FUVEST: mostra acertos/total | Gerais: mostra %
  let badgeContent;
  if (store === 'enem') {
    badgeContent = `<span class="pct-badge ${pctClass(p)}" style="font-size:15px">${totalAc}/180</span>`;
  } else if (store === 'fuvest') {
    badgeContent = `<span class="pct-badge ${pctClass(p)}" style="font-size:15px">${totalAc}/${totalTot}</span>`;
  } else {
    badgeContent = `<span class="pct-badge ${pctClass(p)}">${p}%</span>`;
  }

  return `
  <div class="sim-item" data-id="${s.id}">
    <div class="sim-info" style="width:100%">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <span class="sim-name">${s.nome||'Simulado'}</span>
          <span class="sim-meta" style="display:block">${fmtDate(s.data)} · ${totalAc}/${totalTot} questões · ${s.tempo ? s.tempo+'min' : '—'}</span>
        </div>
        <div class="sim-stats">
          <span class="diff-badge diff-${s.dificuldade||'medio'}">${s.dificuldade||'médio'}</span>
          ${badgeContent}
          <div class="sim-actions" onclick="event.stopPropagation()">
            <button class="btn-icon" onclick="${editFn}(${s.id})">✎</button>
            <button class="btn-danger" onclick="${deleteFn}(${s.id})">✕</button>
          </div>
        </div>
      </div>
      <div class="sim-materias-mini">${miniBadges}</div>
    </div>
  </div>`;
}

async function openModalSimulado(id, store) {
  const s = await dbGet(store, id);
  const totalAc  = (s.materias||[]).reduce((t,m) => t + (m.acertos||0), 0);
  const totalTot = (s.materias||[]).reduce((t,m) => t + (m.total||0), 0);
  const p = pct(totalAc, totalTot);
  let html = `
    <div class="modal-row"><span class="modal-row-label">Nome</span><span class="modal-row-value">${s.nome}</span></div>
    <div class="modal-row"><span class="modal-row-label">Data</span><span class="modal-row-value">${fmtDate(s.data)}</span></div>
    <div class="modal-row"><span class="modal-row-label">Tempo</span><span class="modal-row-value">${s.tempo ? s.tempo+' min' : '—'}</span></div>
    <div class="modal-row"><span class="modal-row-label">Dificuldade</span><span class="modal-row-value"><span class="diff-badge diff-${s.dificuldade}">${s.dificuldade}</span></span></div>
    <div class="modal-row"><span class="modal-row-label">Total Geral</span><span class="modal-row-value pct-badge ${pctClass(p)}">${p}% (${totalAc}/${totalTot})</span></div>
    <div class="modal-section-title">Desempenho por Matéria — Objetiva</div>
    <table class="modal-mat-table">
      <thead><tr><th>Matéria</th><th>Acertos</th><th>Total</th><th>%</th></tr></thead>
      <tbody>
        ${(s.materias||[]).map(m => {
          const mp = m.pct ?? pct(m.acertos, m.total);
          return `<tr><td>${m.materia}</td><td>${m.acertos}</td><td>${m.total}</td>
            <td class="col-pct" style="color:${mp>=75?'var(--success)':mp>=60?'var(--accent)':mp>=40?'var(--warn)':'var(--danger)'}">${mp}%</td></tr>`;
        }).join('')}
      </tbody>
    </table>`;
  // Discursiva
  if (s.discursiva && s.discursiva.length) {
    html += discursivaModalHTML(s.discursiva);
  }
  const modalId = store === 'fuvest' ? 'modalFuvest' : store === 'enem' ? 'modalEnem' : 'modalSimulado';
  const titleId = store === 'fuvest' ? 'modalFuvestTitle' : store === 'enem' ? 'modalEnemTitle' : 'modalSimuladoTitle';
  const bodyId  = store === 'fuvest' ? 'modalFuvestBody'  : store === 'enem' ? 'modalEnemBody'  : 'modalSimuladoBody';
  document.getElementById(titleId).textContent = s.nome;
  document.getElementById(bodyId).innerHTML = html;
  document.getElementById(modalId).classList.remove('hidden');
}

window.editSimulado = async function(id) { openFormSimulado(await dbGet('simulados', id)); };
window.deleteSimulado = async function(id) {
  if (!confirm('Remover este simulado?')) return;
  await dbDelete('simulados', id);
  showToast('Simulado removido.');
  renderSimulados();
};

/* ════════════ SIMULADOS ENEM ════════════ */

function initEnem() {
  document.getElementById('btnNovoEnem').addEventListener('click', () => openFormEnem());
  document.getElementById('btnFecharFormEnem').addEventListener('click', () => {
    document.getElementById('formEnemCard').classList.add('hidden');
  });
  document.getElementById('btnFecharModalEnem').addEventListener('click', () => {
    document.getElementById('modalEnem').classList.add('hidden');
  });
  document.getElementById('modalEnem').addEventListener('click', e => {
    if (e.target === document.getElementById('modalEnem')) document.getElementById('modalEnem').classList.add('hidden');
  });

  document.getElementById('formEnem').addEventListener('submit', async e => {
    e.preventDefault();
    const materias = readEnemMaterias();
    if (!materias.length) { showToast('Preencha pelo menos uma matéria.', 'error'); return; }
    const id = document.getElementById('enemId').value;
    const areasPresentes = [...new Set(materias.map(m => m.area))];
    const obj = {
      nome:        document.getElementById('enemNome').value.trim(),
      data:        document.getElementById('enemData').value,
      tempo:       parseInt(document.getElementById('enemTempo').value) || 0,
      dificuldade: document.getElementById('enemDificuldade').value,
      materias, areas: areasPresentes, tipo: 'enem',
    };
    if (id) obj.id = id;
    await dbSave('enem', obj);
    showToast('Simulado ENEM salvo!', 'success');
    document.getElementById('formEnemCard').classList.add('hidden');
    renderEnem();
  });
}

function openFormEnem(dados = null) {
  document.getElementById('formEnemTitle').textContent = dados ? 'Editar Simulado ENEM' : 'Novo Simulado ENEM';
  document.getElementById('enemId').value    = dados?.id    || '';
  document.getElementById('enemNome').value  = dados?.nome  || '';
  document.getElementById('enemData').value  = dados?.data  || today();
  document.getElementById('enemTempo').value = dados?.tempo || '';
  document.getElementById('enemDificuldade').value = dados?.dificuldade || 'medio';
  const valoresMap = {};
  (dados?.materias || []).forEach(m => { valoresMap[m.materia] = m; });
  buildEnemAreasForm(valoresMap);
  document.getElementById('formEnemCard').classList.remove('hidden');
  document.getElementById('formEnemCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderEnem() {
  const sims  = await dbGetAll('enem');
  const lista = document.getElementById('listaEnem');
  if (!sims.length) { lista.innerHTML = '<p class="empty-state" style="padding:32px 0">Nenhum simulado ENEM cadastrado.</p>'; return; }
  const sorted = [...sims].sort((a, b) => (b.data||'').localeCompare(a.data||''));
  lista.innerHTML = sorted.map(s => simItemHTML(s, 'enem')).join('');
  lista.querySelectorAll('.sim-item').forEach(el => {
    el.addEventListener('click', () => openModalSimulado(el.dataset.id, 'enem'));
  });
}

window.editEnem = async function(id) { openFormEnem(await dbGet('enem', id)); };
window.deleteEnem = async function(id) {
  if (!confirm('Remover este simulado ENEM?')) return;
  await dbDelete('enem', id);
  showToast('Simulado removido.');
  renderEnem();
};

function buildEnemAreasForm(valoresMap = {}) {
  const wrap = document.getElementById('enemAreasWrap');
  if (!wrap) return;

  // Renderiza os dois dias com suas áreas
  wrap.innerHTML = Object.entries(ENEM_DIAS).map(([diaKey, { label: diaLabel, areas }]) => {
    const areasHtml = areas.map(areaKey => {
      const { label: areaLabel, materias } = ENEM_AREAS[areaKey];
      const rows = materias.map(mat => {
        const v = valoresMap[mat] || {};
        const totalFixo = ENEM_TOTAIS[mat];
        return `
        <tr data-materia="${mat}">
          <td>${mat}</td>
          <td><input class="mat-input mat-acertos" type="number" min="0" max="${totalFixo}" placeholder="—" value="${v.acertos ?? ''}" data-area="${areaKey}" /></td>
          <td><input class="mat-input mat-total" type="number" min="0" value="${totalFixo}" readonly style="background:var(--surface-2);color:var(--text-secondary)" data-area="${areaKey}" /></td>
          <td><span class="mat-pct empty">—</span></td>
        </tr>`;
      }).join('');
      return `
      <div class="enem-area-block">
        <div class="enem-area-title">${areaLabel}</div>
        <div class="materias-table-wrap">
          <table class="materias-table">
            <thead><tr><th>Matéria</th><th>Acertos</th><th>Total</th><th style="min-width:60px">%</th></tr></thead>
            <tbody id="enemTbody-${areaKey}">${rows}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="enem-dia-block">
      <div class="enem-dia-title">${diaLabel}</div>
      ${areasHtml}
    </div>`;
  }).join('');

  // Attach listeners
  Object.keys(ENEM_AREAS).forEach(areaKey => {
    attachTableListenersEnem('enemTbody-' + areaKey);
  });
}

function attachTableListenersEnem(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const updateRow = (row) => {
    const ac  = parseInt(row.querySelector('.mat-acertos').value) || 0;
    const tot = parseInt(row.querySelector('.mat-total').value)   || 0;
    const el  = row.querySelector('.mat-pct');
    if (!tot) { el.textContent = '—'; el.className = 'mat-pct empty'; return; }
    const p = pct(ac, tot);
    el.textContent = p + '%';
    el.className   = 'mat-pct ' + pctClass(p);
  };
  tbody.querySelectorAll('tr').forEach(row => {
    row.querySelectorAll('.mat-input').forEach(inp => {
      inp.addEventListener('input', () => updateRow(row));
    });
    updateRow(row);
  });
}

function readEnemMaterias() {
  const result = [];
  Object.keys(ENEM_AREAS).forEach(areaKey => {
    const tbody = document.getElementById('enemTbody-' + areaKey);
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      const mat = row.dataset.materia;
      const ac  = parseInt(row.querySelector('.mat-acertos').value);
      const tot = ENEM_TOTAIS[mat];
      if (!isNaN(ac) && ac >= 0) {
        result.push({ materia: mat, acertos: ac, total: tot, pct: pct(ac, tot), area: areaKey });
      }
    });
  });
  return result;
}

/* ════════════ SIMULADOS FUVEST ════════════ */

function initFuvest() {
  document.getElementById('btnNovoFuvest').addEventListener('click', () => openFormFuvest());
  document.getElementById('btnFecharFormFuvest').addEventListener('click', () => {
    document.getElementById('formFuvestCard').classList.add('hidden');
  });
  document.getElementById('btnFecharModalFuvest').addEventListener('click', () => {
    document.getElementById('modalFuvest').classList.add('hidden');
  });
  document.getElementById('modalFuvest').addEventListener('click', e => {
    if (e.target === document.getElementById('modalFuvest')) document.getElementById('modalFuvest').classList.add('hidden');
  });

  document.getElementById('formFuvest').addEventListener('submit', async e => {
    e.preventDefault();
    const materias = readMateriasTable('fuvestMateriasBody');
    if (!materias.length) { showToast('Preencha pelo menos uma matéria.', 'error'); return; }
    const id  = document.getElementById('fuvestId').value;
    const obj = {
      nome:        document.getElementById('fuvestNome').value.trim(),
      data:        document.getElementById('fuvestData').value,
      tempo:       parseInt(document.getElementById('fuvestTempo').value) || 0,
      dificuldade: document.getElementById('fuvestDificuldade').value,
      materias, tipo: 'fuvest',
    };
    if (id) obj.id = id;
    await dbSave('fuvest', obj);
    showToast('Simulado FUVEST salvo!', 'success');
    document.getElementById('formFuvestCard').classList.add('hidden');
    renderFuvest();
  });
}

function openFormFuvest(dados = null) {
  document.getElementById('formFuvestTitle').textContent = dados ? 'Editar Simulado FUVEST' : 'Novo Simulado FUVEST';
  document.getElementById('fuvestId').value    = dados?.id    || '';
  document.getElementById('fuvestNome').value  = dados?.nome  || '';
  document.getElementById('fuvestData').value  = dados?.data  || today();
  document.getElementById('fuvestTempo').value = dados?.tempo || '';
  document.getElementById('fuvestDificuldade').value = dados?.dificuldade || 'medio';
  const valoresMap = {};
  (dados?.materias || []).forEach(m => { valoresMap[m.materia] = m; });
  // Passa FUVEST_TOTAIS como valores padrão, mas campos editáveis (sem readonly)
  buildMateriasTable('fuvestMateriasBody', MATERIAS, valoresMap, null, FUVEST_TOTAIS);
  document.getElementById('formFuvestCard').classList.remove('hidden');
  document.getElementById('formFuvestCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderFuvest() {
  const sims  = await dbGetAll('fuvest');
  const lista = document.getElementById('listaFuvest');
  if (!sims.length) { lista.innerHTML = '<p class="empty-state" style="padding:32px 0">Nenhum simulado FUVEST cadastrado.</p>'; return; }
  const sorted = [...sims].sort((a, b) => (b.data||'').localeCompare(a.data||''));
  lista.innerHTML = sorted.map(s => simItemHTML(s, 'fuvest')).join('');
  lista.querySelectorAll('.sim-item').forEach(el => {
    el.addEventListener('click', () => openModalSimulado(el.dataset.id, 'fuvest'));
  });
}

window.editFuvest = async function(id) { openFormFuvest(await dbGet('fuvest', id)); };
window.deleteFuvest = async function(id) {
  if (!confirm('Remover este simulado FUVEST?')) return;
  await dbDelete('fuvest', id);
  showToast('Simulado removido.');
  renderFuvest();
};

/* ════════════ GRÁFICOS ════════════ */

const chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }
function makeChart(id, config) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;
  chartInstances[id] = new Chart(canvas, config);
}

let graficoTab = 'gerais';

function initGraficos() {
  document.getElementById('graficosTabs').addEventListener('click', e => {
    if (!e.target.dataset.gtab) return;
    document.querySelectorAll('#graficosTabs .tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    graficoTab = e.target.dataset.gtab;
    renderGraficos();
  });
}

async function renderGraficos() {
  document.getElementById('graficosGerais').classList.add('hidden');
  document.getElementById('graficosEnem').classList.add('hidden');
  document.getElementById('graficosFuvest').classList.add('hidden');
  if (graficoTab === 'gerais') {
    document.getElementById('graficosGerais').classList.remove('hidden');
    await renderGraficosGerais();
  } else if (graficoTab === 'enem') {
    document.getElementById('graficosEnem').classList.remove('hidden');
    await renderGraficosEnem();
  } else {
    document.getElementById('graficosFuvest').classList.remove('hidden');
    await renderGraficosFuvest();
  }
}

// Opções de gráfico com eixo Y em quantidade (não porcentagem)
function chartOptionsQtd(maxY, label = 'Acertos') {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} ${label}` } } },
    scales: {
      y: { min: 0, max: maxY, ticks: { stepSize: Math.ceil(maxY/5), font: { family: 'DM Sans' } }, grid: { color: 'rgba(0,0,0,.05)' } },
      x: { ticks: { font: { family: 'DM Sans', size: 11 } }, grid: { display: false } }
    }
  };
}

async function renderGraficosGerais() {
  const sims   = await dbGetAll('simulados');
  const sorted = [...sims].sort((a, b) => (a.data||'').localeCompare(b.data||''));

  // Calcula o máximo possível de acertos gerais
  const maxGeral = sorted.reduce((mx, s) => {
    const tot = (s.materias||[]).reduce((t,m) => t+(m.total||0), 0);
    return Math.max(mx, tot);
  }, 10);

  makeChart('chartGeralEvolucao', {
    type: 'line',
    data: {
      labels: sorted.map(s => s.nome || fmtDate(s.data)),
      datasets: [{
        label: 'Acertos',
        data: sorted.map(s => (s.materias||[]).reduce((t,m) => t+(m.acertos||0), 0)),
        borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)',
        borderWidth: 2.5, pointRadius: 4, tension: 0.38, fill: true,
      }]
    },
    options: chartOptionsQtd(maxGeral)
  });

  // Por matéria
  const container = document.getElementById('chartsMateria');
  container.innerHTML = '';
  const byMat = {};
  sorted.forEach(s => {
    (s.materias||[]).forEach(m => {
      if (!byMat[m.materia]) byMat[m.materia] = [];
      byMat[m.materia].push({ nome: s.nome || fmtDate(s.data), acertos: m.acertos || 0, total: m.total || 0 });
    });
  });

  Object.entries(byMat).forEach(([mat, pts], idx) => {
    const maxMat = Math.max(...pts.map(p => p.total), 1);
    const canvasId = 'chart-mat-' + mat.replace(/\s/g,'');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-header"><h3>${mat}</h3></div><div class="card-body chart-container"><canvas id="${canvasId}"></canvas></div>`;
    container.appendChild(card);
    requestAnimationFrame(() => {
      makeChart(canvasId, {
        type: 'line',
        data: {
          labels: pts.map(p => p.nome),
          datasets: [{ label: mat, data: pts.map(p => p.acertos), borderColor: chartColor(idx), backgroundColor: chartColor(idx)+'18', borderWidth: 2.5, pointRadius: 4, tension: 0.38, fill: true }]
        },
        options: chartOptionsQtd(maxMat)
      });
    });
  });
}

async function renderGraficosEnem() {
  const sims   = await dbGetAll('enem');
  const sorted = [...sims].sort((a, b) => (a.data||'').localeCompare(b.data||''));

  const maxEnemGeral = Object.values(ENEM_TOTAIS).reduce((a,b) => a+b, 0);

  // Gráfico geral
  makeChart('chartEnemEvolucao', {
    type: 'line',
    data: {
      labels: sorted.map(s => s.nome || fmtDate(s.data)),
      datasets: [{
        label: 'Acertos ENEM',
        data: sorted.map(s => (s.materias||[]).reduce((t,m) => t+(m.acertos||0), 0)),
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.08)',
        borderWidth: 2.5, pointRadius: 4, tension: 0.38, fill: true,
      }]
    },
    options: chartOptionsQtd(maxEnemGeral)
  });

  // Gráficos por dia (1º e 2º)
  const diasContainer = document.getElementById('chartsEnemDias');
  if (diasContainer) {
    diasContainer.innerHTML = '';
    Object.entries(ENEM_DIAS).forEach(([diaKey, { label: diaLabel, areas }], idx) => {
      // Soma dos totais das áreas do dia
      const maxDia = areas.reduce((sum, aKey) => {
        return sum + ENEM_AREAS[aKey].materias.reduce((s2, mat) => s2 + (ENEM_TOTAIS[mat] || 0), 0);
      }, 0);

      const pts = sorted.map(s => {
        const mats = (s.materias||[]).filter(m => areas.includes(m.area));
        if (!mats.length) return null;
        return { nome: s.nome || fmtDate(s.data), acertos: mats.reduce((t,m) => t+(m.acertos||0), 0) };
      }).filter(Boolean);
      if (!pts.length) return;

      const canvasId = 'chart-enem-' + diaKey;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<div class="card-header"><h3>${diaLabel}</h3></div><div class="card-body chart-container"><canvas id="${canvasId}"></canvas></div>`;
      diasContainer.appendChild(card);
      requestAnimationFrame(() => {
        makeChart(canvasId, {
          type: 'line',
          data: {
            labels: pts.map(p => p.nome),
            datasets: [{ label: diaLabel, data: pts.map(p => p.acertos), borderColor: chartColor(idx), backgroundColor: chartColor(idx)+'18', borderWidth: 2.5, pointRadius: 4, tension: 0.38, fill: true }]
          },
          options: chartOptionsQtd(maxDia)
        });
      });
    });
  }

  const container = document.getElementById('chartsEnemArea');
  container.innerHTML = '';

  Object.entries(ENEM_AREAS).forEach(([areaKey, { label }], idx) => {
    const pts = sorted.map(s => {
      const mats = (s.materias||[]).filter(m => m.area === areaKey);
      if (!mats.length) return null;
      const ac = mats.reduce((t,m) => t+(m.acertos||0), 0);
      return { nome: s.nome || fmtDate(s.data), acertos: ac };
    }).filter(Boolean);
    if (!pts.length) return;

    const maxArea = ENEM_AREA_TOTAIS[areaKey] || 45;
    const canvasId = 'chart-enem-' + areaKey;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-header"><h3>${label}</h3></div><div class="card-body chart-container"><canvas id="${canvasId}"></canvas></div>`;
    container.appendChild(card);
    requestAnimationFrame(() => {
      makeChart(canvasId, {
        type: 'bar',
        data: {
          labels: pts.map(p => p.nome),
          datasets: [{ label, data: pts.map(p => p.acertos), backgroundColor: chartColor(idx)+'cc', borderRadius: 6 }]
        },
        options: chartOptionsQtd(maxArea)
      });
    });
  });
}

async function renderGraficosFuvest() {
  const sims   = await dbGetAll('fuvest');
  const sorted = [...sims].sort((a, b) => (a.data||'').localeCompare(b.data||''));

  const maxFuvestGeral = Object.values(FUVEST_TOTAIS).reduce((a,b) => a+b, 0);

  makeChart('chartFuvestEvolucao', {
    type: 'line',
    data: {
      labels: sorted.map(s => s.nome || fmtDate(s.data)),
      datasets: [{
        label: 'Acertos FUVEST',
        data: sorted.map(s => (s.materias||[]).reduce((t,m) => t+(m.acertos||0), 0)),
        borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.08)',
        borderWidth: 2.5, pointRadius: 4, tension: 0.38, fill: true,
      }]
    },
    options: chartOptionsQtd(maxFuvestGeral)
  });

  const container = document.getElementById('chartsFuvestMateria');
  container.innerHTML = '';
  const byMat = {};
  sorted.forEach(s => {
    (s.materias||[]).forEach(m => {
      if (!byMat[m.materia]) byMat[m.materia] = [];
      byMat[m.materia].push({ nome: s.nome || fmtDate(s.data), acertos: m.acertos || 0 });
    });
  });

  Object.entries(byMat).forEach(([mat, pts], idx) => {
    const maxMat = FUVEST_TOTAIS[mat] || 10;
    const canvasId = 'chart-fuvest-' + mat.replace(/\s/g,'');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-header"><h3>${mat}</h3></div><div class="card-body chart-container"><canvas id="${canvasId}"></canvas></div>`;
    container.appendChild(card);
    requestAnimationFrame(() => {
      makeChart(canvasId, {
        type: 'line',
        data: {
          labels: pts.map(p => p.nome),
          datasets: [{ label: mat, data: pts.map(p => p.acertos), borderColor: chartColor(idx), backgroundColor: chartColor(idx)+'18', borderWidth: 2.5, pointRadius: 4, tension: 0.38, fill: true }]
        },
        options: chartOptionsQtd(maxMat)
      });
    });
  });
}

/* ════════════ REDAÇÕES ENEM ════════════ */

function initRedacoesEnem() {
  document.getElementById('btnNovaRedacaoEnem').addEventListener('click', () => {
    openFormRedacaoEnem();
  });
  document.getElementById('btnFecharFormRedacaoEnem').addEventListener('click', () => {
    document.getElementById('formRedacaoEnemCard').classList.add('hidden');
  });

  document.getElementById('formRedacaoEnem').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('redEnemId').value;
    const obj = {
      tema:  document.getElementById('redEnemTema').value.trim(),
      data:  document.getElementById('redEnemData').value,
      nota:  parseInt(document.getElementById('redEnemNota').value) || 0,
      c1:    parseInt(document.getElementById('redEnemC1').value) || 0,
      c2:    parseInt(document.getElementById('redEnemC2').value) || 0,
      c3:    parseInt(document.getElementById('redEnemC3').value) || 0,
      c4:    parseInt(document.getElementById('redEnemC4').value) || 0,
      c5:    parseInt(document.getElementById('redEnemC5').value) || 0,
      obs:   document.getElementById('redEnemObs').value.trim(),
      criadoEm: today(),
    };
    if (id) obj.id = id;
    await dbSave('redacoes_enem', obj);
    showToast('Redação salva!', 'success');
    document.getElementById('formRedacaoEnemCard').classList.add('hidden');
    document.getElementById('formRedacaoEnem').reset();
    renderRedacoesEnem();
  });
}

function openFormRedacaoEnem(dados = null) {
  document.getElementById('formRedacaoEnemTitle').textContent = dados ? 'Editar Redação' : 'Nova Redação ENEM';
  document.getElementById('redEnemId').value    = dados?.id    || '';
  document.getElementById('redEnemTema').value  = dados?.tema  || '';
  document.getElementById('redEnemData').value  = dados?.data  || today();
  document.getElementById('redEnemNota').value  = dados?.nota  ?? '';
  document.getElementById('redEnemC1').value    = dados?.c1    ?? '';
  document.getElementById('redEnemC2').value    = dados?.c2    ?? '';
  document.getElementById('redEnemC3').value    = dados?.c3    ?? '';
  document.getElementById('redEnemC4').value    = dados?.c4    ?? '';
  document.getElementById('redEnemC5').value    = dados?.c5    ?? '';
  document.getElementById('redEnemObs').value   = dados?.obs   || '';
  document.getElementById('formRedacaoEnemCard').classList.remove('hidden');
  document.getElementById('formRedacaoEnemCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderRedacoesEnem() {
  const lista    = document.getElementById('listaRedacoesEnem');
  const graficos = document.getElementById('graficosRedacaoEnem');
  const reds     = await dbGetAll('redacoes_enem');

  if (!reds.length) {
    lista.innerHTML = '<p class="empty-state" style="padding:32px 0">Nenhuma redação cadastrada.</p>';
    graficos.style.display = 'none';
    return;
  }

  const sorted = [...reds].sort((a, b) => (b.data||'').localeCompare(a.data||''));
  lista.innerHTML = sorted.map(r => `
    <div class="sim-item" data-id="${r.id}" style="cursor:default">
      <div class="sim-info" style="width:100%">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <span class="sim-name">${r.tema}</span>
            <span class="sim-meta" style="display:block">${fmtDate(r.data)}</span>
          </div>
          <div class="sim-stats">
            <span class="pct-badge ${r.nota>=700?'high':r.nota>=500?'mid':r.nota>=400?'low':'danger'}" style="font-size:20px">${r.nota}</span>
            <div class="sim-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" onclick="editRedacaoEnem(${r.id})">✎</button>
              <button class="btn-danger" onclick="deleteRedacaoEnem(${r.id})">✕</button>
            </div>
          </div>
        </div>
        <div class="sim-materias-mini" style="margin-top:8px">
          <span class="mini-badge">C1: ${r.c1}</span>
          <span class="mini-badge">C2: ${r.c2}</span>
          <span class="mini-badge">C3: ${r.c3}</span>
          <span class="mini-badge">C4: ${r.c4}</span>
          <span class="mini-badge">C5: ${r.c5}</span>
        </div>
        ${r.obs ? `<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);font-style:italic">${r.obs}</div>` : ''}
      </div>
    </div>`).join('');

  // Gráficos
  graficos.style.display = 'block';
  const cronologico = [...reds].sort((a, b) => (a.data||'').localeCompare(b.data||''));
  const labels = cronologico.map(r => r.tema.length > 20 ? r.tema.slice(0,18)+'…' : r.tema);

  makeChart('chartRedEnemNota', {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Nota Geral', data: cronologico.map(r => r.nota), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)', borderWidth: 2.5, pointRadius: 4, tension: 0.38, fill: true }]
    },
    options: chartOptionsQtd(1000, 'pontos')
  });

  const compContainer = document.getElementById('chartsRedEnemComp');
  compContainer.innerHTML = '';
  const comps = [
    { key: 'c1', label: 'Competência 1' },
    { key: 'c2', label: 'Competência 2' },
    { key: 'c3', label: 'Competência 3' },
    { key: 'c4', label: 'Competência 4' },
    { key: 'c5', label: 'Competência 5' },
  ];
  comps.forEach((c, idx) => {
    const canvasId = 'chart-red-enem-' + c.key;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-header"><h3>${c.label}</h3></div><div class="card-body chart-container"><canvas id="${canvasId}"></canvas></div>`;
    compContainer.appendChild(card);
    requestAnimationFrame(() => {
      makeChart(canvasId, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: c.label, data: cronologico.map(r => r[c.key] || 0), backgroundColor: chartColor(idx)+'cc', borderRadius: 6 }]
        },
        options: chartOptionsQtd(200, 'pontos')
      });
    });
  });
}

window.editRedacaoEnem = async function(id) { openFormRedacaoEnem(await dbGet('redacoes_enem', id)); };
window.deleteRedacaoEnem = async function(id) {
  if (!confirm('Remover esta redação?')) return;
  await dbDelete('redacoes_enem', id);
  showToast('Redação removida.');
  renderRedacoesEnem();
};

/* ════════════ REDAÇÕES GERAIS ════════════ */

function initRedacoesGerais() {
  document.getElementById('btnNovaRedacaoGeral').addEventListener('click', () => openFormRedacaoGeral());
  document.getElementById('btnFecharFormRedacaoGeral').addEventListener('click', () => {
    document.getElementById('formRedacaoGeralCard').classList.add('hidden');
  });

  document.getElementById('formRedacaoGeral').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('redGeralId').value;
    const obj = {
      tema:     document.getElementById('redGeralTema').value.trim(),
      data:     document.getElementById('redGeralData').value,
      nota:     parseFloat(document.getElementById('redGeralNota').value) || 0,
      obs:      document.getElementById('redGeralObs').value.trim(),
      criadoEm: today(),
    };
    if (id) obj.id = id;
    await dbSave('redacoes_gerais', obj);
    showToast('Redação salva!', 'success');
    document.getElementById('formRedacaoGeralCard').classList.add('hidden');
    document.getElementById('formRedacaoGeral').reset();
    renderRedacoesGerais();
  });
}

function openFormRedacaoGeral(dados = null) {
  document.getElementById('formRedacaoGeralTitle').textContent = dados ? 'Editar Redação' : 'Nova Redação';
  document.getElementById('redGeralId').value   = dados?.id   || '';
  document.getElementById('redGeralTema').value = dados?.tema || '';
  document.getElementById('redGeralData').value = dados?.data || today();
  document.getElementById('redGeralNota').value = dados?.nota ?? '';
  document.getElementById('redGeralObs').value  = dados?.obs  || '';
  document.getElementById('formRedacaoGeralCard').classList.remove('hidden');
  document.getElementById('formRedacaoGeralCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderRedacoesGerais() {
  const lista = document.getElementById('listaRedacoesGerais');
  const reds  = await dbGetAll('redacoes_gerais');
  if (!reds.length) { lista.innerHTML = '<p class="empty-state" style="padding:32px 0">Nenhuma redação cadastrada.</p>'; return; }
  const sorted = [...reds].sort((a, b) => (b.data||'').localeCompare(a.data||''));
  lista.innerHTML = sorted.map(r => `
    <div class="sim-item" style="cursor:default">
      <div class="sim-info" style="width:100%">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <span class="sim-name">${r.tema}</span>
            <span class="sim-meta" style="display:block">${fmtDate(r.data)}</span>
          </div>
          <div class="sim-stats">
            <span class="pct-badge mid" style="font-size:20px">${r.nota}</span>
            <div class="sim-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" onclick="editRedacaoGeral(${r.id})">✎</button>
              <button class="btn-danger" onclick="deleteRedacaoGeral(${r.id})">✕</button>
            </div>
          </div>
        </div>
        ${r.obs ? `<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);font-style:italic">${r.obs}</div>` : ''}
      </div>
    </div>`).join('');
}

window.editRedacaoGeral = async function(id) { openFormRedacaoGeral(await dbGet('redacoes_gerais', id)); };
window.deleteRedacaoGeral = async function(id) {
  if (!confirm('Remover esta redação?')) return;
  await dbDelete('redacoes_gerais', id);
  showToast('Redação removida.');
  renderRedacoesGerais();
};

/* ════════════ CADERNO DE REPERTÓRIOS ════════════ */

function initRepertorios() {
  document.getElementById('btnNovoRepertorio').addEventListener('click', () => openFormRepertorio());
  document.getElementById('btnFecharFormRepertorio').addEventListener('click', () => {
    document.getElementById('formRepertorioCard').classList.add('hidden');
  });
  document.getElementById('filtroRepertorioEixo').addEventListener('change', renderRepertorios);

  document.getElementById('formRepertorio').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('repertorioId').value;
    const obj = {
      eixo:     document.getElementById('repertorioEixo').value.trim(),
      texto:    document.getElementById('repertorioTexto').value.trim(),
      criadoEm: today(),
    };
    if (id) obj.id = id;
    await dbSave('repertorios', obj);
    showToast('Repertório salvo!', 'success');
    document.getElementById('formRepertorioCard').classList.add('hidden');
    document.getElementById('formRepertorio').reset();
    renderRepertorios();
  });
}

function openFormRepertorio(dados = null) {
  document.getElementById('formRepertorioTitle').textContent = dados ? 'Editar Repertório' : 'Novo Repertório';
  document.getElementById('repertorioId').value    = dados?.id    || '';
  document.getElementById('repertorioEixo').value  = dados?.eixo  || '';
  document.getElementById('repertorioTexto').value = dados?.texto || '';
  document.getElementById('formRepertorioCard').classList.remove('hidden');
  document.getElementById('formRepertorioCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderRepertorios() {
  const filtro = document.getElementById('filtroRepertorioEixo').value;
  let reps = await dbGetAll('repertorios');

  // Atualizar filtro de eixos
  const eixos = [...new Set(reps.map(r => r.eixo).filter(Boolean))].sort();
  const sel   = document.getElementById('filtroRepertorioEixo');
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">Todos os eixos temáticos</option>' +
    eixos.map(e => `<option value="${e}" ${e === currentVal ? 'selected' : ''}>${e}</option>`).join('');

  if (filtro) reps = reps.filter(r => r.eixo === filtro);

  const lista = document.getElementById('listaRepertorios');
  if (!reps.length) { lista.innerHTML = '<p class="empty-state" style="padding:32px 0">Nenhum repertório cadastrado.</p>'; return; }

  const sorted = [...reps].sort((a, b) => (a.eixo||'').localeCompare(b.eixo||''));
  lista.innerHTML = sorted.map(r => `
    <div class="repertorio-card">
      <div class="repertorio-eixo">${r.eixo}</div>
      <div class="repertorio-texto">${r.texto.replace(/\n/g,'<br>')}</div>
      <div class="repertorio-actions">
        <button class="btn-icon" onclick="editRepertorio(${r.id})">✎</button>
        <button class="btn-danger" onclick="deleteRepertorio(${r.id})">✕</button>
      </div>
    </div>`).join('');
}

window.editRepertorio = async function(id) { openFormRepertorio(await dbGet('repertorios', id)); };
window.deleteRepertorio = async function(id) {
  if (!confirm('Remover este repertório?')) return;
  await dbDelete('repertorios', id);
  showToast('Repertório removido.');
  renderRepertorios();
};

/* ════════════ REVISÃO ESPAÇADA ════════════ */

let revisaoTab = 'pendentes';
let revisaoFiltroMateria = '';

function initRevisao() {
  loadIntervalos();
  document.getElementById('btnAddIntervalo').addEventListener('click', () => addIntervaloTag());
  document.getElementById('btnSalvarIntervalos').addEventListener('click', saveIntervalos);
  document.getElementById('btnNovaRevisao').addEventListener('click', () => {
    document.getElementById('formRevisaoCard').classList.remove('hidden');
    document.getElementById('formRevisao').reset();
    document.getElementById('revData').value = today();
  });
  document.getElementById('btnFecharFormRevisao').addEventListener('click', () => {
    document.getElementById('formRevisaoCard').classList.add('hidden');
  });

  document.getElementById('formRevisao').addEventListener('submit', async e => {
    e.preventDefault();
    const materia    = document.getElementById('revMateria').value;
    const conteudo   = document.getElementById('revConteudo').value.trim();
    const dataEstudo = document.getElementById('revData').value;
    const obs        = document.getElementById('revObs').value.trim();
    const ints       = getIntervalos();
    const datas = ints.map((intervalo, idx) => ({
      numero: idx + 1, data: addDays(dataEstudo, intervalo), feita: false, materia, conteudo,
    }));
    await dbSave('revisoes', { materia, conteudo, dataEstudo, obs, datas, criadoEm: today() });
    showToast('Revisões agendadas!', 'success');
    document.getElementById('formRevisaoCard').classList.add('hidden');
    document.getElementById('formRevisao').reset();
    renderRevisao();
  });

  document.getElementById('revisaoTabs').addEventListener('click', e => {
    if (!e.target.dataset.rtab) return;
    document.querySelectorAll('#revisaoTabs .tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    revisaoTab = e.target.dataset.rtab;
    document.getElementById('revisaoFilterBar').style.display = (revisaoTab === 'todos') ? 'none' : '';
    renderRevisaoTab();
  });

  document.getElementById('filtroRevisaoMateria').addEventListener('change', e => {
    revisaoFiltroMateria = e.target.value;
    renderRevisaoTab();
  });
}

function getIntervalos() {
  return [...document.querySelectorAll('.intervalo-tag input')].map(i => parseInt(i.value) || 1);
}

function addIntervaloTag(valor = null) {
  const list = document.getElementById('intervalosList');
  const idx  = list.querySelectorAll('.intervalo-tag').length + 1;
  const v    = valor ?? idx * 7;
  const tag  = document.createElement('div');
  tag.className = 'intervalo-tag';
  tag.innerHTML = `
    <label>${idx}ª revisão</label>
    <input type="number" min="1" value="${v}" />
    <span>dias</span>
    <button type="button" class="btn-remove-int" title="Remover">✕</button>`;
  tag.querySelector('.btn-remove-int').addEventListener('click', () => { tag.remove(); renumberIntervalos(); });
  list.appendChild(tag);
}

function renumberIntervalos() {
  document.querySelectorAll('.intervalo-tag').forEach((tag, i) => {
    const lbl = tag.querySelector('label');
    if (lbl) lbl.textContent = `${i+1}ª revisão`;
  });
}

async function loadIntervalos() {
  const cfg = await dbGet('config', 'intervalos').catch(() => null);
  const list = document.getElementById('intervalosList');
  list.innerHTML = '';
  const defaults = [1, 7, 30, 90];
  const vals = (cfg?.value && Array.isArray(cfg.value)) ? cfg.value : defaults;
  vals.forEach(v => addIntervaloTag(v));
}

async function saveIntervalos() {
  await dbSave('config', { key: 'intervalos', value: getIntervalos() });
  showToast('Intervalos salvos!', 'success');
}

async function renderRevisao() { renderRevisaoTab(); }

async function renderRevisaoTab() {
  const revs = await dbGetAll('revisoes');
  const el   = document.getElementById('revisaoTabContent');
  if (revisaoTab === 'pendentes')     renderPendentes(revs, el);
  else if (revisaoTab === 'feitas')   renderFeitas(revs, el);
  else                                renderTodosConteudos(revs, el);
}

function renderPendentes(revs, el) {
  let items = revs.flatMap(r => (r.datas||[]).filter(d => !d.feita).map(d => ({ ...d, revId: r.id, obs: r.obs })));
  if (revisaoFiltroMateria) items = items.filter(d => d.materia === revisaoFiltroMateria);
  items.sort((a, b) => a.data.localeCompare(b.data));
  if (!items.length) { el.innerHTML = '<p class="empty-state">Nenhuma revisão pendente' + (revisaoFiltroMateria ? ' para esta matéria' : '') + '. 🎉</p>'; return; }
  el.innerHTML = '<div class="revisao-tab-list">' + items.map(d => {
    const diff = diffDays(d.data);
    let cls = '', datLabel = fmtDate(d.data);
    if (diff < 0)       { cls = 'overdue'; datLabel += ` (${-diff}d atrasada)`; }
    else if (diff === 0) { cls = 'today';   datLabel = 'Hoje'; }
    else if (diff <= 3)  { cls = 'soon'; }
    return `<div class="revisao-item ${cls}">
      <input type="checkbox" class="rev-check" data-rev-id="${d.revId}" data-rev-idx="${d.numero-1}" />
      <div class="rev-info">
        <div class="rev-title">${d.conteudo}</div>
        <div class="rev-sub">${d.materia} · Revisão nº ${d.numero}</div>
        ${d.obs ? `<div class="rev-sub" style="margin-top:2px;font-style:italic">${d.obs}</div>` : ''}
      </div>
      <div class="rev-date">${datLabel}</div>
    </div>`;
  }).join('') + '</div>';
  el.querySelectorAll('.rev-check').forEach(cb => {
    cb.addEventListener('change', async () => {
      if (!cb.checked) return;
      const revId = cb.dataset.revId, revIdx = parseInt(cb.dataset.revIdx);
      const rev = await dbGet('revisoes', revId);
      if (rev?.datas?.[revIdx]) {
        rev.datas[revIdx].feita = true; rev.datas[revIdx].feitaEm = today();
        await dbSave('revisoes', rev);
        renderRevisaoTab();
        showToast('Revisão marcada como feita!', 'success');
      }
    });
  });
}

function renderFeitas(revs, el) {
  let items = revs.flatMap(r => (r.datas||[]).filter(d => d.feita).map(d => ({ ...d, revId: r.id, obs: r.obs })));
  if (revisaoFiltroMateria) items = items.filter(d => d.materia === revisaoFiltroMateria);
  items.sort((a, b) => (b.feitaEm||'').localeCompare(a.feitaEm||''));
  if (!items.length) { el.innerHTML = '<p class="empty-state">Nenhuma revisão concluída' + (revisaoFiltroMateria ? ' para esta matéria' : '') + ' ainda.</p>'; return; }
  el.innerHTML = '<div class="revisao-tab-list">' + items.map(d => `
    <div class="revisao-item done">
      <div class="rev-info">
        <div class="rev-title">${d.conteudo}</div>
        <div class="rev-sub">${d.materia} · Revisão nº ${d.numero} · Agendada p/ ${fmtDate(d.data)}</div>
      </div>
      <span class="rev-done-stamp">✓ Feita${d.feitaEm ? ' em '+fmtDate(d.feitaEm) : ''}</span>
      <button class="btn-icon" title="Desmarcar" onclick="desmarcarRevisao(${d.revId},${d.numero-1})">↩</button>
    </div>`).join('') + '</div>';
}

function renderTodosConteudos(revs, el) {
  if (!revs.length) { el.innerHTML = '<p class="empty-state">Nenhum conteúdo cadastrado.</p>'; return; }
  const sorted = [...revs].sort((a, b) => (b.criadoEm||'').localeCompare(a.criadoEm||''));
  el.innerHTML = '<div class="revisao-tab-list">' + sorted.map(r => {
    const total = (r.datas||[]).length, feitas = (r.datas||[]).filter(d => d.feita).length;
    const pctVal = pct(feitas, total);
    return `
    <div class="revisao-item" style="flex-direction:column;align-items:flex-start;gap:10px">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div class="rev-title">${r.conteudo}</div>
          <div class="rev-sub">${r.materia} · Estudado em ${fmtDate(r.dataEstudo)} · ${feitas}/${total} revisões feitas</div>
          ${r.obs ? `<div class="rev-sub" style="margin-top:2px;font-style:italic">${r.obs}</div>` : ''}
        </div>
        <button class="btn-danger" onclick="deleteRevisao(${r.id})">Remover</button>
      </div>
      <div style="width:100%">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span style="color:var(--text-muted)">Progresso</span>
          <span style="font-weight:600">${pctVal}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${pctVal}%;background:${pctVal===100?'var(--success)':'var(--accent)'}"></div>
        </div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

window.desmarcarRevisao = async function(revId, revIdx) {
  const rev = await dbGet('revisoes', revId);
  if (rev?.datas?.[revIdx]) {
    rev.datas[revIdx].feita = false; rev.datas[revIdx].feitaEm = null;
    await dbSave('revisoes', rev);
    renderRevisaoTab();
  }
};

window.deleteRevisao = async function(id) {
  if (!confirm('Remover este conteúdo e todas as suas revisões?')) return;
  await dbDelete('revisoes', id);
  showToast('Conteúdo removido.');
  renderRevisaoTab();
};

/* ════════════ CONTROLE DE ERROS ════════════ */

function initErros() {
  document.getElementById('btnNovoErro').addEventListener('click', () => {
    document.getElementById('formErroCard').classList.remove('hidden');
    document.getElementById('formErroTitle').textContent = 'Novo Erro';
    document.getElementById('formErro').reset();
    document.getElementById('erroId').value = '';
    document.getElementById('previewEnunciado').classList.add('hidden');
    document.getElementById('previewResolucao').classList.add('hidden');
  });
  document.getElementById('btnFecharFormErro').addEventListener('click', () => {
    document.getElementById('formErroCard').classList.add('hidden');
  });
  document.getElementById('btnFecharModalErro').addEventListener('click', () => {
    document.getElementById('modalErro').classList.add('hidden');
  });
  document.getElementById('modalErro').addEventListener('click', e => {
    if (e.target === document.getElementById('modalErro')) document.getElementById('modalErro').classList.add('hidden');
  });

  document.getElementById('erroImgEnunciado').addEventListener('change', async e => {
    if (e.target.files[0]) {
      const b64 = await compressImage(e.target.files[0]);
      const p = document.getElementById('previewEnunciado');
      p.src = b64; p.classList.remove('hidden');
    }
  });
  document.getElementById('erroImgResolucao').addEventListener('change', async e => {
    if (e.target.files[0]) {
      const b64 = await compressImage(e.target.files[0]);
      const p = document.getElementById('previewResolucao');
      p.src = b64; p.classList.remove('hidden');
    }
  });

  document.getElementById('formErro').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('erroId').value;
    let imgEnunciado = null, imgResolucao = null;
    const fileE = document.getElementById('erroImgEnunciado').files[0];
    const fileR = document.getElementById('erroImgResolucao').files[0];
    if (fileE) imgEnunciado = await compressImage(fileE);
    if (fileR) imgResolucao = await compressImage(fileR);
    if (id && !fileE) { const old = await dbGet('erros', id); imgEnunciado = old?.imgEnunciado || null; }
    if (id && !fileR) { const old = await dbGet('erros', id); imgResolucao = old?.imgResolucao || null; }

    const obj = {
      materia:   document.getElementById('erroMateria').value,
      assunto:   document.getElementById('erroAssunto').value.trim(),
      enunciado: document.getElementById('erroEnunciado').value.trim(),
      resolucao: document.getElementById('erroResolucao').value.trim(),
      imgEnunciado, imgResolucao, criadoEm: today(),
    };
    if (id) obj.id = id;
    await dbSave('erros', obj);
    showToast('Erro salvo!', 'success');
    document.getElementById('formErroCard').classList.add('hidden');
    document.getElementById('formErro').reset();
    document.getElementById('previewEnunciado').classList.add('hidden');
    document.getElementById('previewResolucao').classList.add('hidden');
    renderErros();
  });

  document.getElementById('filtroErroMateria').addEventListener('change', renderErros);
}

async function renderErros() {
  const filtro = document.getElementById('filtroErroMateria').value;
  let erros    = await dbGetAll('erros');
  if (filtro) erros = erros.filter(e => e.materia === filtro);
  const lista  = document.getElementById('listaErros');
  if (!erros.length) { lista.innerHTML = '<p class="empty-state" style="grid-column:1/-1;padding:32px 0">Nenhum erro registrado.</p>'; return; }
  const sorted = [...erros].sort((a, b) => (b.criadoEm||'').localeCompare(a.criadoEm||''));
  lista.innerHTML = sorted.map(er => `
    <div class="erro-card" data-id="${er.id}">
      <div class="erro-materia">${er.materia}</div>
      <div class="erro-assunto">${er.assunto}</div>
      <div class="erro-preview">${er.enunciado || 'Sem enunciado.'}</div>
      <div class="erro-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="editErro(${er.id})">✎</button>
        <button class="btn-danger" onclick="deleteErro(${er.id})">✕</button>
      </div>
    </div>`).join('');
  lista.querySelectorAll('.erro-card').forEach(el => {
    el.addEventListener('click', () => openModalErro(el.dataset.id));
  });
}

async function openModalErro(id) {
  const er = await dbGet('erros', id);
  let html = `
    <div class="modal-row"><span class="modal-row-label">Matéria</span><span class="modal-row-value">${er.materia}</span></div>
    <div class="modal-row"><span class="modal-row-label">Assunto</span><span class="modal-row-value">${er.assunto}</span></div>
    <div class="modal-section-title">Enunciado</div>
    <p style="font-size:14px;line-height:1.6">${er.enunciado || '<em>Não informado.</em>'}</p>`;
  if (er.imgEnunciado) html += `<img src="${er.imgEnunciado}" class="modal-img" alt="Enunciado" />`;
  html += `<div class="modal-section-title">Resolução</div>
    <p style="font-size:14px;line-height:1.6">${er.resolucao || '<em>Não informada.</em>'}</p>`;
  if (er.imgResolucao) html += `<img src="${er.imgResolucao}" class="modal-img" alt="Resolução" />`;
  document.getElementById('modalErroTitle').textContent = er.assunto;
  document.getElementById('modalErroBody').innerHTML = html;
  document.getElementById('modalErro').classList.remove('hidden');
}

window.editErro = async function(id) {
  const er = await dbGet('erros', id);
  document.getElementById('erroId').value        = er.id;
  document.getElementById('erroMateria').value   = er.materia;
  document.getElementById('erroAssunto').value   = er.assunto;
  document.getElementById('erroEnunciado').value = er.enunciado;
  document.getElementById('erroResolucao').value = er.resolucao;
  if (er.imgEnunciado) { const p = document.getElementById('previewEnunciado'); p.src = er.imgEnunciado; p.classList.remove('hidden'); }
  if (er.imgResolucao) { const p = document.getElementById('previewResolucao'); p.src = er.imgResolucao; p.classList.remove('hidden'); }
  document.getElementById('formErroTitle').textContent = 'Editar Erro';
  document.getElementById('formErroCard').classList.remove('hidden');
};

window.deleteErro = async function(id) {
  if (!confirm('Remover este erro?')) return;
  await dbDelete('erros', id);
  showToast('Erro removido.');
  renderErros();
};

/* ════════════ CRONOGRAMA SEMANAL ════════════ */

const DIAS_SEMANA = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

// Estado do cronograma em memória (salvo no IndexedDB como config)
let cronoState = { horarios: [], slots: {} };
// slots: { 'Segunda-07:00': { texto: 'Matemática', cor: '#2563eb' } }

async function loadCronograma() {
  const cfg = await dbGet('config', 'cronograma').catch(() => null);
  if (cfg?.value) {
    cronoState = cfg.value;
  } else {
    cronoState = { horarios: ['07:00','08:00','09:00','10:00'], slots: {} };
  }
}

async function saveCronograma() {
  await dbSave('config', { key: 'cronograma', value: cronoState });
}

function initCronograma() {
  initCronoSlotEditor();
  initCronoAddHorario();
}

async function renderCronograma() {
  await loadCronograma();
  buildCronoTable();
}

function buildCronoTable() {
  const wrap = document.getElementById('cronoTableWrap');
  if (!wrap) return;

  const { horarios, slots } = cronoState;

  if (!horarios.length) {
    wrap.innerHTML = '<p class="empty-state">Adicione um horário para começar.</p>';
    return;
  }

  // Cabeçalho
  let html = `<div class="crono-table-scroll"><table class="crono-table">
    <thead><tr>
      <th class="crono-th-hora">Horário</th>
      ${DIAS_SEMANA.map(d => `<th>${d}</th>`).join('')}
    </tr></thead>
    <tbody>`;

  horarios.forEach(hora => {
    html += `<tr><td class="crono-hora-cell">${hora}
      <button class="crono-del-hora" title="Remover horário" onclick="removeHorario('${hora}')">✕</button>
    </td>`;
    DIAS_SEMANA.forEach(dia => {
      const key = `${dia}-${hora}`;
      const slot = slots[key] || {};
      const bg   = slot.cor  || '';
      const txt  = slot.texto || '';
      // Usa cor de texto contrastante
      const textColor = bg ? contrastColor(bg) : '';
      html += `<td class="crono-slot-cell" data-key="${key}"
        style="${bg ? `background:${bg};` : ''}${textColor ? `color:${textColor};` : ''}"
        onclick="openSlotEditor('${key}')">
        <span class="crono-slot-text">${txt || '<span class="crono-empty-slot">+</span>'}</span>
      </td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

/** Retorna #000 ou #fff dependendo do brilho da cor hex */
function contrastColor(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
  return luminance > 0.55 ? '#14161a' : '#ffffff';
}

window.removeHorario = async function(hora) {
  if (!confirm(`Remover o horário ${hora} e todos os seus slots?`)) return;
  cronoState.horarios = cronoState.horarios.filter(h => h !== hora);
  // Remove slots desse horário
  DIAS_SEMANA.forEach(dia => { delete cronoState.slots[`${dia}-${hora}`]; });
  await saveCronograma();
  buildCronoTable();
};

window.openSlotEditor = function(key) {
  const slot = cronoState.slots[key] || {};
  const [dia, hora] = key.split('-');
  document.getElementById('slotEditorKey').value   = key;
  document.getElementById('slotEditorTexto').value = slot.texto || '';
  document.getElementById('slotEditorCor').value   = slot.cor   || '#2563eb';
  document.getElementById('slotEditorCorHex').value= slot.cor   || '#2563eb';
  document.getElementById('slotEditorTitle').textContent = `${dia} — ${hora}`;
  document.getElementById('slotEditorModal').classList.remove('hidden');
  document.getElementById('slotEditorTexto').focus();
};

function initCronoSlotEditor() {
  const modal    = document.getElementById('slotEditorModal');
  const btnClose = document.getElementById('btnFecharSlotEditor');
  const btnSave  = document.getElementById('btnSalvarSlot');
  const btnClear = document.getElementById('btnLimparSlot');
  const picker   = document.getElementById('slotEditorCor');
  const hexInp   = document.getElementById('slotEditorCorHex');

  if (!modal) return;

  // Sincroniza picker ↔ hex
  picker.addEventListener('input', () => { hexInp.value = picker.value; });
  hexInp.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInp.value)) picker.value = hexInp.value;
  });

  btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  btnSave.addEventListener('click', async () => {
    const key   = document.getElementById('slotEditorKey').value;
    const texto = document.getElementById('slotEditorTexto').value.trim();
    const cor   = /^#[0-9a-fA-F]{6}$/.test(hexInp.value) ? hexInp.value : picker.value;
    if (texto) {
      cronoState.slots[key] = { texto, cor };
    } else {
      delete cronoState.slots[key];
    }
    await saveCronograma();
    modal.classList.add('hidden');
    buildCronoTable();
  });

  btnClear.addEventListener('click', async () => {
    const key = document.getElementById('slotEditorKey').value;
    delete cronoState.slots[key];
    await saveCronograma();
    modal.classList.add('hidden');
    buildCronoTable();
  });
}

function initCronoAddHorario() {
  const btn = document.getElementById('btnAddHorario');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const inp  = document.getElementById('inputNovoHorario');
    const val  = inp?.value?.trim();
    if (!val) { showToast('Informe um horário.', 'error'); return; }
    // Valida formato HH:MM
    if (!/^\d{2}:\d{2}$/.test(val)) { showToast('Use o formato HH:MM (ex: 08:30).', 'error'); return; }
    // Garante que o estado está carregado do DB antes de verificar duplicatas
    await loadCronograma();
    if (cronoState.horarios.includes(val)) { showToast('Este horário já existe.', 'error'); return; }
    cronoState.horarios.push(val);
    // Ordena cronologicamente
    cronoState.horarios.sort();
    await saveCronograma();
    if (inp) inp.value = '';
    buildCronoTable();
    showToast('Horário adicionado!', 'success');
  });
}


window.quickCor = function(hex) {
  document.getElementById('slotEditorCor').value    = hex;
  document.getElementById('slotEditorCorHex').value = hex;
};

/* ════════════ CONFIGURAÇÕES ════════════ */

function initConfig() {
  loadCoresConfig();
  loadNomeSiteConfig();
  loadFonteConfig();

  // Nome do site
  document.getElementById('btnSalvarNomeSite').addEventListener('click', salvarNomeSite);
  document.getElementById('btnResetarNomeSite').addEventListener('click', resetarNomeSite);

  // Fonte
  document.getElementById('btnAplicarFonte').addEventListener('click', aplicarFonte);
  document.getElementById('btnResetarFonte').addEventListener('click', resetarFonte);

  // Sync color pickers with hex inputs
  ['Bg','Surface','Accent','Text','Border','Sidebar'].forEach(name => {
    const picker = document.getElementById('cor' + name);
    const hex    = document.getElementById('cor' + name + 'Hex');
    if (!picker || !hex) return;
    picker.addEventListener('input', () => { hex.value = picker.value; });
    hex.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) picker.value = hex.value;
    });
  });

  document.getElementById('btnAplicarCores').addEventListener('click', aplicarCores);
  document.getElementById('btnResetarCores').addEventListener('click', resetarCores);
  document.getElementById('btnExportar').addEventListener('click', exportarDados);
  document.getElementById('btnImportar').addEventListener('click', () => document.getElementById('inputImportar').click());
  document.getElementById('inputImportar').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!confirm('Isso vai sobrescrever todos os seus dados. Confirmar?')) return;
      await dbImportAll(data);
      showToast('Dados importados!', 'success');
    } catch {
      showToast('Erro ao importar: arquivo inválido.', 'error');
    }
    e.target.value = '';
  });
}

const COR_DEFAULTS = {
  Bg:      '#f4f5f7',
  Surface: '#ffffff',
  Accent:  '#2563eb',
  Text:    '#14161a',
  Border:  '#e2e4e9',
  Sidebar: '#ffffff',
};

const COR_CSS_VARS = {
  Bg:      '--bg',
  Surface: '--surface',
  Accent:  '--accent',
  Text:    '--text-primary',
  Border:  '--border',
  Sidebar: '--surface', // sidebar uses --surface
};

async function loadCoresConfig() {
  const cfg = await dbGet('config', 'cores').catch(() => null);
  const cores = cfg?.value || {};
  Object.entries(COR_DEFAULTS).forEach(([name, defaultVal]) => {
    const val    = cores[name] || defaultVal;
    const picker = document.getElementById('cor' + name);
    const hex    = document.getElementById('cor' + name + 'Hex');
    if (picker) picker.value = val;
    if (hex)    hex.value    = val;
  });
  // Apply stored colors on load
  if (cfg?.value) applyCoresToDOM(cfg.value);
}

function getCoresFromForm() {
  const cores = {};
  Object.keys(COR_DEFAULTS).forEach(name => {
    const hex = document.getElementById('cor' + name + 'Hex');
    cores[name] = (hex && /^#[0-9a-fA-F]{6}$/.test(hex.value)) ? hex.value : COR_DEFAULTS[name];
  });
  return cores;
}

function applyCoresToDOM(cores) {
  const root = document.documentElement;
  root.style.setProperty('--bg',           cores.Bg      || COR_DEFAULTS.Bg);
  root.style.setProperty('--surface',      cores.Surface || COR_DEFAULTS.Surface);
  root.style.setProperty('--accent',       cores.Accent  || COR_DEFAULTS.Accent);
  root.style.setProperty('--text-primary', cores.Text    || COR_DEFAULTS.Text);
  root.style.setProperty('--border',       cores.Border  || COR_DEFAULTS.Border);
  // Sidebar background via inline style workaround
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.background = cores.Sidebar || COR_DEFAULTS.Sidebar;
  // Accent dark (darken by ~15%)
  const acc = cores.Accent || COR_DEFAULTS.Accent;
  root.style.setProperty('--accent-dark', acc);
  root.style.setProperty('--accent-soft', acc + '20');
}

async function aplicarCores() {
  const cores = getCoresFromForm();
  applyCoresToDOM(cores);
  await dbSave('config', { key: 'cores', value: cores });
  showToast('Cores aplicadas!', 'success');
}

async function resetarCores() {
  applyCoresToDOM(COR_DEFAULTS);
  await dbSave('config', { key: 'cores', value: COR_DEFAULTS });
  // Reset form
  Object.entries(COR_DEFAULTS).forEach(([name, val]) => {
    const picker = document.getElementById('cor' + name);
    const hex    = document.getElementById('cor' + name + 'Hex');
    if (picker) picker.value = val;
    if (hex)    hex.value    = val;
  });
  showToast('Cores restauradas!', 'success');
}

function renderConfig() {
  loadCoresConfig();
  loadNomeSiteConfig();
  loadFonteConfig();
}

const NOME_SITE_DEFAULT = 'Controle de Estudo';

async function loadNomeSiteConfig() {
  const cfg = await dbGet('config', 'nomeSite').catch(() => null);
  const nome = cfg?.value || NOME_SITE_DEFAULT;
  const inp = document.getElementById('inputNomeSite');
  if (inp) inp.value = nome;
  applyNomeSite(nome);
}

function applyNomeSite(nome) {
  // Sidebar brand text
  const brandText = document.querySelector('.brand-text');
  if (brandText) brandText.textContent = nome;
  // Ícone: primeira letra maiúscula
  const brandIcon = document.querySelector('.brand-icon');
  if (brandIcon) brandIcon.textContent = nome.charAt(0).toUpperCase();
  // Título da aba do navegador
  document.title = nome;
}

async function salvarNomeSite() {
  const inp = document.getElementById('inputNomeSite');
  const nome = (inp?.value || '').trim() || NOME_SITE_DEFAULT;
  inp.value = nome;
  await dbSave('config', { key: 'nomeSite', value: nome });
  applyNomeSite(nome);
  showToast('Nome do site atualizado!', 'success');
}

async function resetarNomeSite() {
  const inp = document.getElementById('inputNomeSite');
  if (inp) inp.value = NOME_SITE_DEFAULT;
  await dbSave('config', { key: 'nomeSite', value: NOME_SITE_DEFAULT });
  applyNomeSite(NOME_SITE_DEFAULT);
  showToast('Nome restaurado ao padrão.', 'success');
}

async function exportarDados() {
  const data = await dbExportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `controle-estudo-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado!', 'success');
}

/* ════════════ FONTE ════════════ */

const FONTE_DEFAULT = 'DM Sans';
const FONTES_DISPONIVEIS = ['DM Sans','Inter','Roboto','Lato','Merriweather','Fira Code'];

async function loadFonteConfig() {
  const cfg = await dbGet('config', 'fonte').catch(() => null);
  const fonte = cfg?.value || FONTE_DEFAULT;
  applyFonte(fonte);
  // Marca o radio correto
  document.querySelectorAll('input[name="fonte"]').forEach(r => {
    r.checked = r.value === fonte;
  });
}

function applyFonte(fonte) {
  document.documentElement.style.setProperty('--font-body', `'${fonte}', sans-serif`);
  document.body.style.fontFamily = `'${fonte}', sans-serif`;
}

async function aplicarFonte() {
  const selected = document.querySelector('input[name="fonte"]:checked');
  if (!selected) { showToast('Selecione uma fonte.', 'error'); return; }
  const fonte = selected.value;
  applyFonte(fonte);
  await dbSave('config', { key: 'fonte', value: fonte });
  showToast('Fonte aplicada!', 'success');
}

async function resetarFonte() {
  applyFonte(FONTE_DEFAULT);
  await dbSave('config', { key: 'fonte', value: FONTE_DEFAULT });
  document.querySelectorAll('input[name="fonte"]').forEach(r => {
    r.checked = r.value === FONTE_DEFAULT;
  });
  showToast('Fonte restaurada ao padrão.', 'success');
}

/* ════════════ INIT ════════════ */

async function init() {
  await openDB();
  initSidebarDate();
  initNav();
  initSimulados();
  initEnem();
  initFuvest();
  initGraficos();
  initRevisao();
  initErros();
  initConfig();
  initRedacoesEnem();
  initRedacoesGerais();
  initRepertorios();
  initCronograma();
  initDiscursivos();
  initSimDiscursiva();
  // Aplica nome do site salvo
  loadNomeSiteConfig();
  // Aplica fonte salva
  loadFonteConfig();
  renderDashboard();
}

// O app só inicia quando o Firebase liberar o acesso
window.__initApp = function() {
  if (window.__appInited) return;
  window.__appInited = true;
  init();
};

/* ════════════ DISCURSIVA — UTILITÁRIOS COMPARTILHADOS ════════════ */

/* Letras dos itens */
const LETRAS = ['a','b','c','d','e','f','g','h'];

/* Gera HTML do modal para uma seção discursiva (usada em Gerais e Discursivos) */
function discursivaModalHTML(discursiva) {
  if (!discursiva || !discursiva.length) return '';
  let totalGeral = 0;
  let html = '<div class="modal-section-title" style="margin-top:20px">Discursiva</div>';
  discursiva.forEach(mat => {
    const notaMateria = (mat.questoes||[]).reduce((s,q) => s + (q.nota||0), 0);
    totalGeral += notaMateria;
    html += `<div class="disc-modal-materia-title">${mat.materia} — ${notaMateria.toFixed(2)} pts</div>`;
    html += `<table class="disc-modal-table">
      <thead><tr><th>Questão</th><th>Itens</th><th>Nota</th></tr></thead><tbody>`;
    (mat.questoes||[]).forEach((q,qi) => {
      const itensStr = (q.itens||[]).map((it,ii) =>
        `${LETRAS[ii]}: ${it.nota !== undefined ? it.nota : '—'}`
      ).join(' | ');
      html += `<tr>
        <td>Q${qi+1}</td>
        <td class="td-itens">${itensStr || '—'}</td>
        <td class="td-nota">${(q.nota||0).toFixed(2)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  });
  html += `<div class="disc-total-row">
    <span class="disc-total-label">Total Discursiva</span>
    <span class="disc-total-value">${totalGeral.toFixed(2)} pts</span>
  </div>`;
  return html;
}

/* ════════════ DISCURSIVA NO FORM DE SIMULADOS GERAIS ════════════ */

/* Constrói o bloco de discursiva dentro do form de Simulados Gerais */
function buildSimDiscursivaForm(discursivaData = []) {
  const wrap = document.getElementById('simDiscursivaWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  discursivaData.forEach(mat => addSimDiscursivaMateria('simDiscursivaWrap', mat));
}

function addSimDiscursivaMateria(wrapId, dadosMateria = null) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;

  const block = document.createElement('div');
  block.className = 'disc-materia-block';

  const numQuestoes = dadosMateria?.questoes?.length || 1;
  const numItens    = dadosMateria?.questoes?.[0]?.itens?.length || 2;
  const materiaVal  = dadosMateria?.materia || '';

  block.innerHTML = `
    <div class="disc-materia-header">
      <span class="disc-materia-label">Disciplina:</span>
      <select class="disc-sel-materia">
        <option value="">Selecione…</option>
        ${MATERIAS.map(m => `<option value="${m}" ${m===materiaVal?'selected':''}>${m}</option>`).join('')}
      </select>
      <span class="disc-materia-label" style="margin-left:8px">Questões:</span>
      <input type="number" class="disc-inp-nq" min="1" max="20" value="${numQuestoes}" style="width:60px" />
      <span class="disc-materia-label" style="margin-left:8px">Itens/questão:</span>
      <input type="number" class="disc-inp-ni" min="1" max="8" value="${numItens}" style="width:60px" />
      <button type="button" class="btn-secondary disc-btn-apply" style="margin-left:auto;padding:5px 12px;font-size:12px">Aplicar</button>
      <button type="button" class="btn-danger disc-btn-rem" style="padding:5px 10px;font-size:12px">✕</button>
    </div>
    <div class="disc-questoes-wrap"></div>`;

  wrap.appendChild(block);

  const questoesWrap = block.querySelector('.disc-questoes-wrap');
  const inpNQ = block.querySelector('.disc-inp-nq');
  const inpNI = block.querySelector('.disc-inp-ni');

  const renderQuestoes = (dados = null) => {
    const nq = Math.max(1, parseInt(inpNQ.value)||1);
    const ni = Math.max(1, parseInt(inpNI.value)||1);
    questoesWrap.innerHTML = '';
    for (let qi = 0; qi < nq; qi++) {
      const qDados = dados?.questoes?.[qi] || null;
      const qBlock = document.createElement('div');
      qBlock.className = 'disc-questao-block';
      let itensHTML = '';
      for (let ii = 0; ii < ni; ii++) {
        const notaItem = qDados?.itens?.[ii]?.nota ?? '';
        itensHTML += `
          <div class="disc-item-group">
            <span class="disc-item-label">Item ${LETRAS[ii]}</span>
            <input type="number" class="disc-item-input" min="0" step="0.01" placeholder="0" value="${notaItem}" data-qi="${qi}" data-ii="${ii}" />
          </div>`;
      }
      qBlock.innerHTML = `
        <div class="disc-questao-title">
          <span>Questão ${qi+1}</span>
          <span class="disc-questao-nota-total" data-qi="${qi}">0.00 pts</span>
        </div>
        <div class="disc-itens-grid">${itensHTML}</div>`;
      questoesWrap.appendChild(qBlock);
    }
    // Listeners para calcular total da questão
    questoesWrap.querySelectorAll('.disc-item-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const qi = inp.dataset.qi;
        const total = [...questoesWrap.querySelectorAll(`.disc-item-input[data-qi="${qi}"]`)]
          .reduce((s,i) => s + (parseFloat(i.value)||0), 0);
        const badge = questoesWrap.querySelector(`.disc-questao-nota-total[data-qi="${qi}"]`);
        if (badge) badge.textContent = total.toFixed(2) + ' pts';
      });
    });
    // Inicializa totais
    const nqFinal = Math.max(1, parseInt(inpNQ.value)||1);
    for (let qi = 0; qi < nqFinal; qi++) {
      const total = [...questoesWrap.querySelectorAll(`.disc-item-input[data-qi="${qi}"]`)]
        .reduce((s,i) => s + (parseFloat(i.value)||0), 0);
      const badge = questoesWrap.querySelector(`.disc-questao-nota-total[data-qi="${qi}"]`);
      if (badge) badge.textContent = total.toFixed(2) + ' pts';
    }
  };

  block.querySelector('.disc-btn-apply').addEventListener('click', () => renderQuestoes());
  block.querySelector('.disc-btn-rem').addEventListener('click', () => block.remove());

  renderQuestoes(dadosMateria);
}

/* Lê os dados do form de discursiva de Simulados Gerais */
function readSimDiscursivaForm() {
  const wrap = document.getElementById('simDiscursivaWrap');
  if (!wrap) return [];
  return readDiscursivaWrap(wrap);
}

/* Lê os dados de qualquer wrap de discursiva */
function readDiscursivaWrap(wrap) {
  const result = [];
  wrap.querySelectorAll('.disc-materia-block').forEach(block => {
    const materia = block.querySelector('.disc-sel-materia')?.value;
    if (!materia) return;
    const questoes = [];
    const nq = block.querySelectorAll('.disc-questao-block').length;
    for (let qi = 0; qi < nq; qi++) {
      const itensInputs = block.querySelectorAll(`.disc-item-input[data-qi="${qi}"]`);
      const itens = [...itensInputs].map((inp, ii) => ({
        letra: LETRAS[ii],
        nota: parseFloat(inp.value) || 0,
      }));
      const nota = itens.reduce((s,it) => s + it.nota, 0);
      questoes.push({ itens, nota });
    }
    result.push({ materia, questoes });
  });
  return result;
}

/* Init para o botão "Adicionar Matéria Discursiva" no form de Simulados Gerais */
function initSimDiscursiva() {
  const btn = document.getElementById('btnAddMatDiscursiva');
  if (btn) btn.addEventListener('click', () => addSimDiscursivaMateria('simDiscursivaWrap'));
}

/* ════════════ SIMULADOS DISCURSIVOS (página própria) ════════════ */

function initDiscursivos() {
  document.getElementById('btnNovoDiscursivo').addEventListener('click', () => openFormDiscursivo());
  document.getElementById('btnFecharFormDiscursivo').addEventListener('click', () => {
    document.getElementById('formDiscursivoCard').classList.add('hidden');
  });
  document.getElementById('btnFecharModalDiscursivo').addEventListener('click', () => {
    document.getElementById('modalDiscursivo').classList.add('hidden');
  });
  document.getElementById('modalDiscursivo').addEventListener('click', e => {
    if (e.target === document.getElementById('modalDiscursivo'))
      document.getElementById('modalDiscursivo').classList.add('hidden');
  });
  document.getElementById('btnAddDiscMateria').addEventListener('click', () => {
    addSimDiscursivaMateria('discMateriasWrap');
  });
  document.getElementById('formDiscursivo').addEventListener('submit', async e => {
    e.preventDefault();
    const wrap = document.getElementById('discMateriasWrap');
    const disciplinas = readDiscursivaWrap(wrap);
    if (!disciplinas.length) { showToast('Adicione pelo menos uma disciplina.', 'error'); return; }
    const id = document.getElementById('discursivoId').value;
    const obj = {
      nome:        document.getElementById('discNome').value.trim(),
      data:        document.getElementById('discData').value,
      tempo:       parseInt(document.getElementById('discTempo').value) || 0,
      dificuldade: document.getElementById('discDificuldade').value,
      disciplinas,
    };
    if (id) obj.id = id;
    await dbSave('discursivos', obj);
    showToast('Simulado discursivo salvo!', 'success');
    document.getElementById('formDiscursivoCard').classList.add('hidden');
    document.getElementById('formDiscursivo').reset();
    document.getElementById('discMateriasWrap').innerHTML = '';
    renderDiscursivos();
  });
}

function openFormDiscursivo(dados = null) {
  document.getElementById('formDiscursivoTitle').textContent = dados ? 'Editar Simulado Discursivo' : 'Novo Simulado Discursivo';
  document.getElementById('discursivoId').value  = dados?.id   || '';
  document.getElementById('discNome').value      = dados?.nome || '';
  document.getElementById('discData').value      = dados?.data || today();
  document.getElementById('discTempo').value     = dados?.tempo || '';
  document.getElementById('discDificuldade').value = dados?.dificuldade || 'medio';
  // Reconstrói os blocos de disciplina
  const wrap = document.getElementById('discMateriasWrap');
  wrap.innerHTML = '';
  (dados?.disciplinas || []).forEach(mat => addSimDiscursivaMateria('discMateriasWrap', mat));
  document.getElementById('formDiscursivoCard').classList.remove('hidden');
  document.getElementById('formDiscursivoCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderDiscursivos() {
  const lista = document.getElementById('listaDiscursivos');
  const sims  = await dbGetAll('discursivos');
  if (!sims.length) {
    lista.innerHTML = '<p class="empty-state" style="padding:32px 0">Nenhum simulado discursivo cadastrado.</p>';
    return;
  }
  const sorted = [...sims].sort((a,b) => (b.data||'').localeCompare(a.data||''));
  lista.innerHTML = sorted.map(s => discursivoItemHTML(s)).join('');
  lista.querySelectorAll('.sim-item').forEach(el => {
    el.addEventListener('click', () => openModalDiscursivo(el.dataset.id));
  });
}

function discursivoItemHTML(s) {
  const totalNota = (s.disciplinas||[]).reduce((sum, mat) =>
    sum + (mat.questoes||[]).reduce((s2,q) => s2 + (q.nota||0), 0), 0);
  const disciplinasStr = (s.disciplinas||[]).map(d => d.materia).join(', ');
  const miniBadges = (s.disciplinas||[]).map(mat => {
    const notaMat = (mat.questoes||[]).reduce((s2,q) => s2 + (q.nota||0), 0);
    return `<span class="mini-badge mid">${mat.materia}: ${notaMat.toFixed(2)} pts</span>`;
  }).join('');
  return `
  <div class="sim-item" data-id="${s.id}">
    <div class="sim-info" style="width:100%">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <span class="sim-name">${s.nome||'Simulado'}</span>
          <span class="sim-meta" style="display:block">${fmtDate(s.data)} · ${disciplinasStr} · ${s.tempo ? s.tempo+'min' : '—'}</span>
        </div>
        <div class="sim-stats">
          <span class="diff-badge diff-${s.dificuldade||'medio'}">${s.dificuldade||'médio'}</span>
          <span class="disc-nota-badge">${totalNota.toFixed(2)} pts</span>
          <div class="sim-actions" onclick="event.stopPropagation()">
            <button class="btn-icon" onclick="editDiscursivo('${s.id}')">✎</button>
            <button class="btn-danger" onclick="deleteDiscursivo('${s.id}')">✕</button>
          </div>
        </div>
      </div>
      <div class="sim-materias-mini">${miniBadges}</div>
    </div>
  </div>`;
}

async function openModalDiscursivo(id) {
  const s = await dbGet('discursivos', id);
  if (!s) return;
  const totalNota = (s.disciplinas||[]).reduce((sum, mat) =>
    sum + (mat.questoes||[]).reduce((s2,q) => s2 + (q.nota||0), 0), 0);
  let html = `
    <div class="modal-row"><span class="modal-row-label">Nome</span><span class="modal-row-value">${s.nome}</span></div>
    <div class="modal-row"><span class="modal-row-label">Data</span><span class="modal-row-value">${fmtDate(s.data)}</span></div>
    <div class="modal-row"><span class="modal-row-label">Tempo</span><span class="modal-row-value">${s.tempo ? s.tempo+' min' : '—'}</span></div>
    <div class="modal-row"><span class="modal-row-label">Dificuldade</span><span class="modal-row-value"><span class="diff-badge diff-${s.dificuldade}">${s.dificuldade}</span></span></div>`;
  html += discursivaModalHTML(s.disciplinas);
  html += `<div class="disc-total-row" style="margin-top:16px;border-top:2px solid var(--accent)">
    <span class="disc-total-label" style="font-size:16px">TOTAL GERAL</span>
    <span class="disc-total-value" style="font-size:24px">${totalNota.toFixed(2)} pts</span>
  </div>`;
  document.getElementById('modalDiscursivoTitle').textContent = s.nome;
  document.getElementById('modalDiscursivoBody').innerHTML = html;
  document.getElementById('modalDiscursivo').classList.remove('hidden');
}

window.editDiscursivo = async function(id) {
  const s = await dbGet('discursivos', id);
  openFormDiscursivo(s);
};

window.deleteDiscursivo = async function(id) {
  if (!confirm('Remover este simulado discursivo?')) return;
  await dbDelete('discursivos', id);
  showToast('Simulado removido.');
  renderDiscursivos();
};
