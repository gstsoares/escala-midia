import { store, init, entrar, sair, save, patch, remove, lote, novaPessoa, definirPin, trocarMeuPin, primeiroAcesso, resetDemo, newId, pinValido } from './store.js';
import { MINISTERIO } from './firebase-config.js';
import {
  AREAS, WD, WDL, WDF, CULTO, fmtT, fmtD, fmtDL, cap, mesKey, mesLabel, mesNome, mesParts, diasNoMes, iso, dow, dnum,
  hojeStr, tipo, ordenar, janela, proxMes, eventosFixos, sugerir, avisos
} from './regras.js';

// ============================ HELPERS ============================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const primeiro = n => String(n || '').trim().split(/\s+/)[0];
const D = () => store.data;
let tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2800); }

function confirmar(msg, ok = 'Confirmar', perigo = false) {
  return new Promise(res => {
    const w = document.createElement('div'); w.className = 'modal';
    w.innerHTML = `<div class="modal-box" style="max-width:440px"><div class="mb"><p style="font-weight:700;line-height:1.5">${esc(msg).replace(/\n/g, '<br>')}</p></div>
      <div class="mf"><button class="btn" data-n>Voltar</button><button class="btn ${perigo ? 'danger fill' : 'pink'}" data-y>${esc(ok)}</button></div></div>`;
    document.body.appendChild(w);
    const fim = v => { w.remove(); res(v); };
    w.querySelector('[data-n]').onclick = () => fim(false);
    w.querySelector('[data-y]').onclick = () => fim(true);
    w.querySelector('[data-y]').focus();
  });
}
function copiar(texto) {
  const falhou = () => abrirModal(`<div class="mh"><h2>Copie o texto</h2><button class="x" data-act="fechar" aria-label="Fechar">×</button></div>
    <div class="mb"><p class="muted">Seu aparelho não deixou copiar sozinho. Selecione o texto abaixo e copie.</p><div class="field"><textarea id="txtCopia" readonly style="min-height:240px">${esc(texto)}</textarea></div></div>`);
  try { navigator.clipboard.writeText(texto).then(() => toast('Copiado! É só colar no WhatsApp.'), falhou); } catch (e) { falhou(); }
}
function fotoDeArquivo(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = 320, c = document.createElement('canvas'); c.width = c.height = s;
        const k = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, s, s);
        res(c.toDataURL('image/jpeg', .82));
      };
      img.onerror = () => rej(new Error('Não consegui abrir essa imagem.'));
      img.src = r.result;
    };
    r.onerror = () => rej(new Error('Não consegui ler o arquivo.'));
    r.readAsDataURL(file);
  });
}
const siteUrl = () => location.origin + location.pathname;
function waLink(pid, texto) {
  let d = String(priv(pid).telefone || '').replace(/\D/g, ''); if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent(texto);
}

// ============================ ÍCONES ============================
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC = {
  casa: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  gente: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="7" r="2.5"/><path d="M16 13.2c2.8.2 4.7 2 5.3 4.8"/>'),
  coracao: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  hist: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><path d="M12 8v4l3 2"/>'),
  check: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 12l3 3 5-6"/>'),
  olho: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eu: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.4 4-6.5 8-6.5s7 2.1 8 6.5"/>'),
};

// ============================ DADOS ============================
const pessoa = id => D().pessoas.find(p => p.id === id);
const nomeDe = id => pessoa(id)?.nome || '—';
const ativos = () => D().pessoas.filter(p => p.ativo !== false).sort((a, b) => (a.papel === 'master' ? -1 : 0) - (b.papel === 'master' ? -1 : 0) || a.nome.localeCompare(b.nome));
const timeDe = a => ativos().filter(p => p.area === a);
const priv = id => D().privado.find(x => x.id === id) || {};
const lider = () => ativos().find(p => p.papel === 'master');
const liderNome = () => primeiro(lider()?.nome) || 'líder';
const mesAtual = () => store.cfg().mesAtual || (() => { const n = new Date(); return mesKey(n.getFullYear(), n.getMonth() + 1); })();
const mesDoc = m => D().meses.find(x => x.id === m);
const jan = (m, a) => mesDoc(m)?.areas?.[a] || {};
const eventos = (m, a) => ordenar(D().eventos.filter(e => e.mes === m && (!a || e.area === a)));
const respDoc = (m, pid) => D().respostas.find(r => r.id === m + '_' + pid);
const disp = (m, pid, ev) => respDoc(m, pid)?.disp?.[ev];
const rasc = (m, a) => D().rascunhos.find(r => r.id === m + '_' + a);
const pub = (m, a) => D().publicadas.find(r => r.id === m + '_' + a);
const cultoNao = (m, pid) => respDoc(m, pid)?.culto === 'nao';
const histAno = (pid, ano, exceto) => D().publicadas.filter(x => x.mes.startsWith(ano) && x.mes !== exceto)
  .reduce((n, x) => n + Object.values(x.slots || {}).filter(l => (l || []).includes(pid)).length, 0);
const ctxDe = (m, a) => ({ eventos: eventos(m, a), pessoas: timeDe(a), resp: (pid, ev) => disp(m, pid, ev), bloq: pid => priv(pid).bloq || [], cultoNao: pid => cultoNao(m, pid), hist: pid => histAno(pid, m.slice(0, 4), m) });
const slotsDe = (e, s) => Array.from({ length: e.vagas }, (_, k) => ((s || {})[e.id] || [])[k] || '');
const escalados = (e, s) => slotsDe(e, s).filter(Boolean);
const norm = (evs, s) => JSON.stringify(evs.map(e => slotsDe(e, s)));
const ehMaster = () => store.isMaster();
const eu = () => store.me;

const CORES = ['#F0287A', '#8b5cf6', '#14b8a6', '#f59e0b', '#0ea5e9', '#ec4899', '#10b981', '#6366f1'];
function av(ref, size = 'md') {
  const p = typeof ref === 'string' ? (pessoa(ref) || { nome: ref }) : (ref || {});
  const nome = p.nome || '?';
  const ini = nome.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase() || '?';
  const cor = CORES[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];
  return p.foto ? `<span class="av ${size}"><img src="${esc(p.foto)}" alt=""></span>` : `<span class="av ${size}" style="background:${cor}" aria-hidden="true">${esc(ini)}</span>`;
}
const curto = n => { const w = String(n).trim().split(/\s+/); return w.length > 1 ? w[0].slice(0, 3) + w[1].charAt(0).toUpperCase() : w[0].slice(0, 4); };
const badgeJanela = st => ({ prep: '<span class="badge">Não liberado</span>', breve: '<span class="badge warn">Abre em breve</span>', aberto: '<span class="badge ok">Aberto</span>', fechado: '<span class="badge no">Encerrado</span>' }[st]);
const legendaTipos = () => '<div class="legend"><span class="pill k-culto">Culto</span><span class="pill k-ceia">Ceia</span><span class="pill k-acao">Ação social</span><span class="pill k-extra">Especial</span></div>';
const legendaDisp = () => '<div class="legend"><span class="row"><i class="dot ok"></i>consigo</span><span class="row"><i class="dot maybe"></i>talvez</span><span class="row"><i class="dot no"></i>não consigo</span><span class="row"><i class="dot"></i>falta responder</span></div>';

// ============================ ESTADO DA TELA ============================
const U = { view: '', area: 'midia', mes: '', sel: null, eqf: 'todas', culM: '', histAno: '', pubMes: '', showList: false, showAvisos: true, showStats: false, login: { pid: null, pin: '', err: '' }, setup: false, saveState: '' };

// ============================ LOGIN ============================
function renderLogin() {
  const el = $('#login'), cfg = store.cfg(), titulo = cfg.ministerio || MINISTERIO;
  if (U.setup) {
    el.innerHTML = `<div class="login-card"><div class="login-brand"><span class="dots4"><i></i><i></i><i></i><i></i></span><h1>${esc(titulo)}</h1><p>Primeiro acesso</p></div>
      <div class="pinbox" style="max-width:420px;align-items:stretch"><h2>Criar a líder</h2><p style="color:#a6a6b0">A líder vê e controla tudo. Depois ela cadastra a equipe e o PIN de cada pessoa.</p>
      <form id="fSetup" class="stack"><div class="field"><label for="suNome">Nome</label><input id="suNome" value="Camila" maxlength="40"></div>
      <div class="grid2"><div class="field"><label for="suPin">PIN (4 números)</label><input id="suPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>
      <div class="field"><label for="suPin2">Repita o PIN</label><input id="suPin2" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div></div>
      <button class="btn pink block" type="submit">Começar</button><p class="err" id="suErr" role="alert"></p></form></div></div>`;
    $('#fSetup').onsubmit = async ev => {
      ev.preventDefault();
      const n = $('#suNome').value.trim(), a = $('#suPin').value, b = $('#suPin2').value;
      if (!n) return $('#suErr').textContent = 'Escreva o nome da líder.';
      if (!pinValido(a)) return $('#suErr').textContent = 'O PIN precisa ter 4 números (diferente de 0000).';
      if (a !== b) return $('#suErr').textContent = 'Os dois PINs precisam ser iguais.';
      try { await primeiroAcesso(n, a); } catch (e) { $('#suErr').textContent = e.message; }
    };
    return;
  }
  const L = U.login, p = L.pid && pessoa(L.pid);
  const topo = `<div class="login-brand"><span class="dots4"><i></i><i></i><i></i><i></i></span><h1>${esc(titulo)}</h1><p>${esc(cap(mesLabel(mesAtual())))}</p></div>`;
  if (p) {
    el.innerHTML = `<div class="login-card">${topo}<div class="pinbox">
      <span class="ring">${av(p, 'lg')}</span><div class="who">${esc(p.nome)}</div><p style="color:#a6a6b0;font-weight:700">Digite seu PIN</p>
      <div class="pindots" id="pindots">${[0, 1, 2, 3].map(i => `<i class="${i < L.pin.length ? 'on' : ''}"></i>`).join('')}</div>
      <p class="err" role="alert">${esc(L.err)}</p>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-act="pk" data-k="${n}" aria-label="${n}">${n}</button>`).join('')}
        <button class="k-fn" data-act="pkvolta">Voltar</button><button data-act="pk" data-k="0" aria-label="0">0</button><button class="k-fn" data-act="pkdel" aria-label="Apagar">Apagar</button></div>
      </div></div>`;
    return;
  }
  const lista = ativos();
  el.innerHTML = `<div class="login-card">${topo}<h2>Quem é você?</h2>
    ${lista.length ? `<div class="people">${lista.map(x => `<button class="pcard" data-act="escolher" data-id="${esc(x.id)}"><span class="ring">${av(x, 'lg')}</span><span class="nm">${esc(x.nome)}</span>${x.papel === 'master' ? '<span class="tagl">líder</span>' : ''}</button>`).join('')}</div>` : '<p style="color:#a6a6b0">Carregando a equipe…</p>'}
    ${store.authMsg ? `<p class="err">${esc(store.authMsg)}</p>` : ''}
    ${store.demo ? `<div class="demo-hint"><b>Modo demonstração.</b> PIN da Camila (líder): <code>1234</code> · PIN das demais: <code>1111</code><br>Os dados ficam só neste navegador.</div>` : ''}</div>`;
}
async function tentarLogin() {
  const L = U.login;
  try { await entrar(L.pid, L.pin); L.err = ''; }
  catch (e) { L.err = e.message; L.pin = ''; renderLogin(); $('#pindots')?.classList.add('shake'); }
}
document.addEventListener('keydown', e => {
  if ($('#login').classList.contains('hidden') || !U.login.pid || U.setup) return;
  if (/^\d$/.test(e.key)) A.pk({ k: e.key });
  else if (e.key === 'Backspace') A.pkdel();
  else if (e.key === 'Escape') A.pkvolta();
  else return;
  renderLogin();
});

// ============================ CASCA ============================
function navItens() {
  const m = mesAtual();
  if (ehMaster()) {
    const falta = ativos().filter(p => p.papel !== 'master' && !respDoc(m, p.id)?.enviado && janela(jan(m, p.area)) === 'aberto').length;
    return [['painel', 'Painel', IC.casa], ['escala', 'Montar escala', IC.cal], ['eventos', 'Eventos e prazos', IC.relogio], ['equipe', 'Equipe', IC.gente, falta], ['culto', 'Culto e ceia', IC.coracao], ['historico', 'Histórico', IC.hist],
      'Para mim', ['disp', 'Minha disponibilidade', IC.check], ['publicada', 'Escala publicada', IC.olho], ['perfil', 'Meu perfil', IC.eu]];
  }
  const me = eu(), st = janela(jan(m, me.area)), pend = st === 'aberto' && !respDoc(m, me.id)?.enviado ? 1 : 0;
  return [['inicio', 'Início', IC.casa], ['disp', 'Minha disponibilidade', IC.check, pend], ['publicada', 'Escala do mês', IC.cal], ['perfil', 'Meu perfil', IC.eu]];
}
const TITULOS = { painel: 'Painel', escala: 'Montar escala', eventos: 'Eventos e prazos', equipe: 'Equipe', culto: 'Culto e ceia', historico: 'Histórico', disp: 'Minha disponibilidade', publicada: 'Escala publicada', perfil: 'Meu perfil', inicio: 'Início' };
function renderSide() {
  const me = pessoa(eu().id) || eu();
  $('#sideUser').innerHTML = `<span class="ring">${av(me, 'xl')}</span><div class="side-name">${esc(me.nome)}</div><div class="side-role">${ehMaster() ? 'Líder · acesso total' : esc(AREAS[me.area] || '')}</div>`;
  $('#nav').innerHTML = navItens().map(n => typeof n === 'string' ? `<div class="sep">${esc(n)}</div>` :
    `<a data-act="ir" data-v="${n[0]}" class="${U.view === n[0] ? 'on' : ''}" ${U.view === n[0] ? 'aria-current="page"' : ''}><span class="ic">${n[2]}</span>${esc(n[1])}${n[3] ? `<span class="nb">${n[3]}</span>` : ''}</a>`).join('');
  $('#brandMini').textContent = store.cfg().ministerio || MINISTERIO;
  $('#demoTag').classList.toggle('hidden', !store.demo);
}
let rAF = 0;
function agendarRender() { cancelAnimationFrame(rAF); rAF = requestAnimationFrame(renderTudo); }
function renderTudo() {
  if (!$('#login').classList.contains('hidden')) return renderLogin();
  if (!eu()) return;
  store.me = { ...store.me, ...(pessoa(eu().id) || {}), papel: store.me.papel };
  renderSide(); render();
}
function render() {
  const y = window.scrollY;
  $('#pageTitle').textContent = TITULOS[U.view] || '';
  $('#topActions').innerHTML = '';
  const fn = VIEWS[U.view] || VIEWS[ehMaster() ? 'painel' : 'inicio'];
  $('#view').innerHTML = fn();
  window.scrollTo(0, y);
}
function areaSeg(extra = '') {
  return `<div class="seg" role="group" aria-label="Equipe">${extra}${Object.keys(AREAS).map(k => `<button data-act="area" data-k="${k}" aria-pressed="${U.area === k}">${AREAS[k]}</button>`).join('')}</div>`;
}

// ============================ CALENDÁRIO ============================
function cal(m, evs, cellFn) {
  const { y, m: mm } = mesParts(m), first = new Date(y, mm - 1, 1).getDay(), hoje = hojeStr();
  let h = `<div class="stack" style="gap:6px"><div class="cal-h">${WD.map(w => `<span>${w}</span>`).join('')}</div><div class="cal-g">`;
  for (let i = 0; i < first; i++) h += '<span class="cell off"></span>';
  for (let d = 1; d <= diasNoMes(m); d++) {
    const s = iso(y, mm, d), es = evs.filter(e => e.data === s), td = s === hoje ? ' today' : '';
    if (!es.length) { h += `<span class="cell empty${td}"><b>${d}</b></span>`; continue; }
    h += `<button class="cell has${td}${U.sel === s ? ' sel' : ''}" data-act="dia" data-d="${s}" aria-label="Dia ${d}, ${es.length} evento(s)"><b>${d}</b>${cellFn(s, es)}</button>`;
  }
  return h + '</div></div>';
}
const nomeChip = (pid, e, opt = {}) => {
  const nm = nomeDe(pid), t = opt.talvez && opt.talvez(pid, e) ? ' ?' : '', il = opt.multi && e.area === 'iluminacao' ? '<span class="ilu">ILU</span>' : '';
  return `<span class="chip k-${tipo(e)}${opt.me === pid ? ' me' : ''}" title="${esc(nm)}${t ? ' (marcou talvez)' : ''}">${il}<span class="full">${esc(nm)}${t}</span><span class="short">${esc(curto(nm))}${t}</span></span>`;
};
const chips = (es, slots, opt) => es.map(e => { const a = escalados(e, slots); return a.length ? a.map(pid => nomeChip(pid, e, opt)).join('') : `<span class="chip vazio">${opt.multi && e.area === 'iluminacao' ? 'ILU ' : ''}vazio</span>`; }).join('');
function infoEv(e) {
  const d = new Date(...e.data.split('-').map((v, i) => i === 1 ? v - 1 : +v));
  return `<dl class="info"><div><dt>Data</dt><dd>${fmtDL(e.data)}</dd></div><div><dt>Dia</dt><dd>${WDF[d.getDay()]}</dd></div><div><dt>Hora</dt><dd>${fmtT(e.hora)}</dd></div><div><dt>Ministério</dt><dd>${esc(e.ministerio || '—')}</dd></div>${e.vagas > 1 ? `<div><dt>Vagas</dt><dd>${e.vagas}</dd></div>` : ''}</dl>`;
}
const escolherDia = (evs, pref) => { if (!U.sel || !evs.some(e => e.data === U.sel)) { const f = (pref && evs.find(pref)) || evs[0]; U.sel = f ? f.data : null; } };

// Escala pronta (somente leitura). slots = { evId: [pid] }
function escalaPronta(m, evs, slots, meId, multi) {
  escolherDia(evs, e => meId && escalados(e, slots).includes(meId));
  const meus = meId ? evs.filter(e => escalados(e, slots).includes(meId)) : [];
  const doDia = evs.filter(e => e.data === U.sel);
  return `<section class="card">
    ${meId ? `<div class="banner">${meus.length ? 'Você serve em: ' + meus.map(e => fmtD(e.data) + ' às ' + fmtT(e.hora) + (multi ? ' (' + AREAS[e.area] + ')' : '')).join(' · ') : 'Neste mês você não foi escalada.'}</div>` : ''}
    ${cal(m, evs, (s, es) => chips(es, slots, { me: meId, multi }))}
    <div class="spread">${legendaTipos()}${multi ? '<span class="legend"><span><b>ILU</b> = Iluminação</span></span>' : ''}</div>
  </section>
  <section class="card"><h3>${U.sel ? WDL[dow(U.sel)] + ', ' + dnum(U.sel) : 'Escolha um dia'}</h3>
    ${doDia.length ? doDia.map(e => { const a = escalados(e, slots); return `<div class="ev k-${tipo(e)}"><div class="ev-h"><strong>${esc(e.nome)}</strong><span class="pill k-${tipo(e)}">${fmtT(e.hora)}${multi ? ' · ' + AREAS[e.area] : ''}</span></div>${infoEv(e)}
      <div><span class="lbl">Escalada</span><div class="whoes">${a.length ? a.map(pid => `<span>${av(pid, 'sm')}${esc(nomeDe(pid))}${pid === meId ? ' <span class="badge pink">você</span>' : ''}</span>`).join('') : '<span class="muted">Ninguém ainda</span>'}</div></div></div>`; }).join('') : '<p class="muted">Toque num dia do calendário para ver os detalhes.</p>'}
    <button class="btn" data-act="toggle" data-k="showList">${U.showList ? 'Esconder a lista' : 'Ver em lista'}</button>
    ${U.showList ? `<div class="agenda">${evs.map(e => { const a = escalados(e, slots); return `<div class="ag${meId && a.includes(meId) ? ' mine' : ''}"><div class="d">${dnum(e.data)}<small>${WD[dow(e.data)]}</small></div><div><span class="pill k-${tipo(e)}">${fmtT(e.hora)} · ${esc(e.nome)}${multi ? ' · ' + AREAS[e.area] : ''}</span><div class="whoes">${a.length ? a.map(pid => `<span>${av(pid, 'xs')}${esc(nomeDe(pid))}</span>`).join('') : '<span class="muted">—</span>'}</div></div></div>`; }).join('')}</div>` : ''}
  </section>`;
}
function textoEscala(m, a, slots) {
  const evs = eventos(m, a);
  return `Escala de ${AREAS[a]} · ${cap(mesLabel(m))}\n\n` + evs.map(e => `${fmtD(e.data)} · ${fmtT(e.hora)} · ${e.nome}: ${escalados(e, slots).map(nomeDe).join(' e ') || '—'}`).join('\n');
}

// ============================ TELAS: INTEGRANTE ============================
function vInicio() {
  const me = eu(), m = mesAtual(), st = janela(jan(m, me.area)), r = respDoc(m, me.id), evs = eventos(m, me.area);
  const feitos = evs.filter(e => r?.disp?.[e.id]).length, hoje = hojeStr();
  const futuros = D().publicadas.flatMap(x => eventos(x.mes, x.area).filter(e => e.data >= hoje && escalados(e, x.slots).includes(me.id))).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  const msg = st === 'aberto' ? (r?.enviado ? `Prontinho! Suas respostas de ${mesNome(m)} foram enviadas.` : `Responda até ${fmtD(jan(m, me.area).fecha)}. Faltam ${evs.length - feitos} de ${evs.length} eventos.`)
    : st === 'breve' ? `As respostas abrem em ${fmtD(jan(m, me.area).abre)}.` : st === 'fechado' ? 'O prazo para responder terminou.' : `Ainda não liberado. A ${liderNome()} avisa no WhatsApp quando abrir.`;
  return `<section class="card"><div class="row" style="gap:16px">${av(me, 'lg')}<div class="stack" style="gap:4px"><h2 style="font-size:26px">Oi, ${esc(primeiro(me.nome))}!</h2><div class="row"><span class="badge pink">${AREAS[me.area]}</span><span class="muted small">${esc(cap(mesLabel(m)))}</span></div></div></div></section>
  <div class="cols"><section class="card"><div class="spread"><h3>Disponibilidade de ${mesNome(m)}</h3>${badgeJanela(st)}</div><p>${esc(msg)}</p>
    ${st === 'aberto' ? `<div class="bar"><i style="width:${evs.length ? feitos / evs.length * 100 : 0}%"></i></div><div class="row"><button class="btn pink" data-act="ir" data-v="disp">${r?.enviado ? 'Ver minhas respostas' : 'Marcar agora'}</button></div>` : ''}</section>
  <section class="card"><h3>Seus próximos dias de servir</h3>${futuros.length ? `<div class="agenda">${futuros.slice(0, 6).map(e => `<div class="ag mine"><div class="d">${dnum(e.data)}<small>${WD[dow(e.data)]}</small></div><div><span class="pill k-${tipo(e)}">${fmtT(e.hora)} · ${esc(e.nome)}</span><div class="small muted" style="margin-top:4px">${fmtDL(e.data)} · ${AREAS[e.area]}</div></div></div>`).join('')}</div>` : '<p class="muted">Nenhum dia marcado por enquanto. Quando a escala for publicada, seus dias aparecem aqui.</p>'}
    <button class="btn" data-act="ir" data-v="publicada">Ver a escala completa</button></section></div>`;
}

function vDisp() {
  const me = eu(), m = mesAtual(), a = me.area, r = respDoc(m, me.id), evs = eventos(m, a), st = janela(jan(m, a)), master = ehMaster();
  const top = `<section class="card"><div class="spread"><div><span class="lbl">${esc(cap(mesLabel(m)))} · ${AREAS[a]}</span></div>${badgeJanela(st)}</div></section>`;
  if (!master && !r?.culto && st !== 'prep') {
    return `<section class="card" style="max-width:640px"><span class="lbl">Antes de começar</span><p class="muted" style="font-weight:700">Oie! Para organizarmos a escala do ministério, responda com carinho:</p>
      <p class="q">Você tem frequentado os cultos? No mês passado, você participou do culto de Santa Ceia e tomou a Ceia?</p>
      <div class="stack" style="gap:8px">${[['sim', 'Sim!'], ['nao', 'Não.'], ['imprevisto', 'Tive um imprevisto, já comuniquei sobre.']].map(o => `<button class="btn block" data-act="culto" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>
      <p class="small muted">Só a ${esc(liderNome())} vê essa resposta.</p></section>`;
  }
  const feitos = evs.filter(e => r?.disp?.[e.id]).length;
  if (!master && r?.enviado && evs.length && feitos === evs.length && !U.editando) {
    return top + `<section class="card"><h2>Tudo certo!</h2><p>Suas disponibilidades foram salvas. A ${esc(liderNome())} avisa no WhatsApp quando a escala estiver pronta.</p>
      ${legendaDisp()}${cal(m, evs, (s, es) => `<span class="dotsrow">${es.map(e => `<i class="dot ${cls(r.disp[e.id])}"></i>`).join('')}</span>`)}
      ${st === 'aberto' ? '<div class="row"><button class="btn" data-act="editarResp">Mudar minhas respostas</button></div>' : ''}</section>`;
  }
  if (!master && st !== 'aberto') {
    const msg = st === 'prep' ? `Ainda não está liberado. A ${liderNome()} vai avisar pelo WhatsApp quando você puder marcar suas disponibilidades.` : st === 'breve' ? `As respostas abrem em ${fmtD(jan(m, a).abre)}. Volte nesse dia.` : `O prazo para responder terminou. Se precisar mudar alguma coisa, fale com a ${liderNome()}.`;
    return top + `<section class="card"><h2>${st === 'fechado' ? 'Respostas encerradas' : 'Ainda não abriu'}</h2><p>${esc(msg)}</p></section>`;
  }
  if (!evs.length) return top + `<section class="card"><h2>Ainda sem eventos</h2><p>${master ? 'Cadastre os eventos do mês em "Eventos e prazos" primeiro.' : `A ${esc(liderNome())} ainda não cadastrou os eventos deste mês.`}</p></section>`;
  escolherDia(evs, e => !r?.disp?.[e.id]);
  const ss = U.saveState === 'pending' ? '<span class="badge">Salvando…</span>' : U.saveState === 'saved' ? '<span class="badge ok">Salvo ✓</span>' : U.saveState === 'error' ? '<span class="badge no">Sem conexão. Ainda não salvou.</span>' : '';
  return `<section class="card"><div class="spread"><h2>Quando você consegue servir?</h2><div class="row">${ss}<span class="badge ${feitos === evs.length ? 'ok' : ''}">${feitos} de ${evs.length}</span></div></div>
    <p class="muted small">${esc(cap(mesLabel(m)))} · ${AREAS[a]}${jan(m, a).fecha ? ' · responda até ' + fmtD(jan(m, a).fecha) : ''}. As respostas salvam sozinhas.</p>
    ${cal(m, evs, (s, es) => `<span class="dotsrow">${es.map(e => `<i class="dot ${cls(r?.disp?.[e.id])}"></i>`).join('')}</span>`)}${legendaDisp()}</section>
  <section class="card"><h3>${WDL[dow(U.sel)]}, ${dnum(U.sel)}</h3>
    ${evs.filter(e => e.data === U.sel).map(e => { const v = r?.disp?.[e.id]; return `<div class="ev k-${tipo(e)}"><div class="ev-h"><strong>${esc(e.nome)}</strong><span class="pill k-${tipo(e)}">${fmtT(e.hora)}</span></div>${infoEv(e)}
      <div class="choice"><button class="btn yes" data-act="disp" data-ev="${e.id}" data-v="sim" aria-pressed="${v === 'sim'}">Consigo</button><button class="btn mb" data-act="disp" data-ev="${e.id}" data-v="talvez" aria-pressed="${v === 'talvez'}">Talvez</button><button class="btn nop" data-act="disp" data-ev="${e.id}" data-v="nao" aria-pressed="${v === 'nao'}">Não consigo</button></div></div>`; }).join('')}
    <div class="row"><button class="btn" data-act="diaProx">Próximo dia sem resposta</button></div></section>
  <div class="row" style="justify-content:space-between">${master ? '<span class="muted small">Você é escalada junto com a equipe, com as mesmas regras.</span>' : `<button class="btn pink" data-act="enviar" ${feitos < evs.length ? 'disabled' : ''}>Enviar</button>`}
    ${feitos < evs.length ? '<button class="btn link" data-act="restoNao">Marcar o resto como "não consigo"</button>' : ''}</div>`;
}
const cls = v => v === 'sim' ? 'ok' : v === 'nao' ? 'no' : v === 'talvez' ? 'maybe' : '';

function vPublicada() {
  const me = eu(), ms = [...new Set(D().publicadas.map(x => x.mes))].sort().reverse();
  if (!ms.length) return `<section class="card"><h2>Ainda não tem escala publicada</h2><p>Quando a ${esc(liderNome())} publicar, a escala aparece aqui.</p></section>`;
  if (!U.pubMes || !ms.includes(U.pubMes)) U.pubMes = ms.includes(mesAtual()) ? mesAtual() : ms[0];
  const m = U.pubMes, ps = D().publicadas.filter(x => x.mes === m), slots = Object.assign({}, ...ps.map(x => x.slots));
  const evs = ordenar(ps.flatMap(x => eventos(m, x.area))), falta = Object.keys(AREAS).filter(a => !ps.some(x => x.area === a));
  $('#topActions').innerHTML = `<div class="field" style="flex-direction:row;align-items:center;gap:8px"><label for="pubMes">Mês</label><select id="pubMes" data-chg="pubMes" style="min-height:38px;padding:4px 12px">${ms.map(k => `<option value="${k}" ${k === m ? 'selected' : ''}>${esc(cap(mesLabel(k)))}</option>`).join('')}</select></div>`;
  const aviso = m === mesAtual() || !ms.includes(mesAtual()) ? '' : `<div class="banner soft">A escala de ${mesNome(mesAtual())} ainda não foi publicada. Você está vendo ${mesNome(m)}.</div>`;
  return aviso + escalaPronta(m, evs, slots, me.id, true) + (falta.length ? `<p class="muted small">A escala de ${falta.map(a => AREAS[a]).join(' e ')} deste mês ainda não foi publicada.</p>` : '');
}

function vPerfil() {
  const me = pessoa(eu().id) || eu();
  return `<div class="cols"><section class="card"><h2>Sua foto</h2><div class="photo-pick"><span class="ring" id="fotoPrev">${av(me, 'xl')}</span>
    <div class="stack" style="gap:8px"><label class="btn file-btn">Escolher foto<input type="file" accept="image/*" data-chg="minhaFoto" aria-label="Escolher foto"></label>
    ${me.foto ? '<button class="btn link" data-act="tirarMinhaFoto">Remover foto</button>' : ''}<span class="muted small">A foto é recortada em círculo e reduzida sozinha.</span></div></div>
    <dl class="info"><div><dt>Nome</dt><dd>${esc(me.nome)}</dd></div><div><dt>Equipe</dt><dd>${AREAS[me.area]}</dd></div><div><dt>Acesso</dt><dd>${ehMaster() ? 'Líder (vê tudo)' : 'Integrante'}</dd></div></dl></section>
  <section class="card"><h2>Trocar meu PIN</h2><form id="fPin" class="stack">
    <div class="field"><label for="pAtual">PIN atual</label><input id="pAtual" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>
    <div class="grid2"><div class="field"><label for="pNovo">PIN novo</label><input id="pNovo" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>
    <div class="field"><label for="pNovo2">Repita o PIN novo</label><input id="pNovo2" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div></div>
    <button class="btn pink" type="submit">Salvar PIN novo</button></form></section></div>
  ${store.demo && ehMaster() ? `<section class="card"><h3>Demonstração</h3><p class="muted">Apaga o que foi feito nesta demonstração e volta aos dados de exemplo.</p><div class="row"><button class="btn danger" data-act="resetDemo">Recomeçar a demonstração</button></div></section>` : ''}`;
}

// ============================ TELAS: LÍDER ============================
function vPainel() {
  const m = mesAtual(), hoje = hojeStr();
  const areas = Object.keys(AREAS).map(a => {
    const t = timeDe(a), resp = t.filter(p => respDoc(m, p.id)?.enviado).length, evs = eventos(m, a), r = rasc(m, a), p = pub(m, a), sl = (p || r)?.slots;
    const vagas = evs.reduce((n, e) => n + e.vagas, 0), cheias = evs.reduce((n, e) => n + escalados(e, sl).length, 0);
    return { a, t, resp, evs, r, p, vagas, cheias, st: janela(jan(m, a)), av: sl ? avisos(ctxDe(m, a), sl).length : 0 };
  });
  const tot = k => areas.reduce((n, x) => n + (typeof x[k] === 'number' ? x[k] : x[k].length), 0);
  const falta = ativos().filter(p => p.papel !== 'master' && !respDoc(m, p.id)?.enviado);
  const prox = D().publicadas.flatMap(x => eventos(x.mes, x.area).filter(e => e.data >= hoje && e.data <= addD(hoje, 14)).map(e => ({ e, a: escalados(e, x.slots) }))).sort((x, y) => x.e.data.localeCompare(y.e.data) || x.e.hora.localeCompare(y.e.hora));
  return `<div class="kpis">
    <div class="kpi hl"><span class="l">Respostas de ${mesNome(m)}</span><span class="v">${tot('resp')} de ${tot('t')}</span><span class="s">pessoas já enviaram</span></div>
    <div class="kpi"><span class="l">Eventos no mês</span><span class="v">${tot('evs')}</span><span class="s">nas duas equipes</span></div>
    <div class="kpi"><span class="l">Vagas preenchidas</span><span class="v">${tot('cheias')} de ${tot('vagas')}</span><span class="s">rascunho ou publicada</span></div>
    <div class="kpi"><span class="l">Avisos na escala</span><span class="v">${tot('av')}</span><span class="s">conflitos para conferir</span></div></div>
  <div class="cols"><div class="stack">${areas.map(x => `<section class="card"><div class="spread"><h2>${AREAS[x.a]}</h2><div class="row">${badgeJanela(x.st)}${x.p ? '<span class="badge ok">Publicada</span>' : x.r ? '<span class="badge warn">Rascunho</span>' : '<span class="badge">Escala não montada</span>'}</div></div>
      <div class="stack" style="gap:6px"><div class="spread small"><span class="muted" style="font-weight:700">Respostas</span><b>${x.resp} de ${x.t.length}</b></div><div class="bar"><i style="width:${x.t.length ? x.resp / x.t.length * 100 : 0}%"></i></div></div>
      <p class="muted small">${x.evs.length} eventos · ${x.cheias} de ${x.vagas} vagas preenchidas${jan(m, x.a).fecha ? ' · respostas até ' + fmtD(jan(m, x.a).fecha) : ''}</p>
      <div class="row"><button class="btn pink sm" data-act="abrirEscala" data-k="${x.a}">Abrir escala</button><button class="btn sm" data-act="abrirEventos" data-k="${x.a}">Eventos e prazos</button></div></section>`).join('')}</div>
    <div class="stack"><section class="card"><h3>Ainda não responderam</h3>${falta.length ? `<div class="list">${falta.map(p => { const w = waLink(p.id, `Oi, ${primeiro(p.nome)}! Falta você marcar suas disponibilidades da escala de ${mesNome(m)} no site (${siteUrl()}), até ${fmtD(jan(m, p.area).fecha) || 'o prazo'}. Obrigada!`); return `<div class="li">${av(p, 'sm')}<div class="grow"><b>${esc(p.nome)}</b><div class="muted small">${AREAS[p.area]}</div></div>${w ? `<a class="btn sm" href="${w}" target="_blank" rel="noopener">Cobrar no WhatsApp</a>` : ''}</div>`; }).join('')}</div>` : '<p><span class="badge ok">Todas responderam</span></p>'}</section>
    <section class="card"><h3>Próximos 14 dias</h3>${prox.length ? `<div class="agenda">${prox.map(({ e, a }) => `<div class="ag"><div class="d">${dnum(e.data)}<small>${WD[dow(e.data)]}</small></div><div><span class="pill k-${tipo(e)}">${fmtT(e.hora)} · ${esc(e.nome)} · ${AREAS[e.area]}</span><div class="whoes">${a.map(pid => `<span>${av(pid, 'xs')}${esc(nomeDe(pid))}</span>`).join('') || '<span class="muted">—</span>'}</div></div></div>`).join('')}</div>` : '<p class="muted">Nada publicado para os próximos dias.</p>'}</section></div></div>`;
}
const addD = (s, n) => { const d = new Date(...s.split('-').map((v, i) => i === 1 ? v - 1 : +v)); d.setDate(d.getDate() + n); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); };

function vEscala() {
  const meses = [...new Set([...D().meses.map(x => x.id), mesAtual()])].sort().reverse();
  if (!U.mes || !meses.includes(U.mes)) U.mes = mesAtual();
  const m = U.mes, a = U.area, evs = eventos(m, a), t = timeDe(a), ctx = ctxDe(m, a), r = rasc(m, a), p = pub(m, a);
  const slots = (r || p)?.slots, tem = !!slots, mudou = p && r && norm(evs, r.slots) !== norm(evs, p.slots);
  const resp = t.filter(x => respDoc(m, x.id)?.enviado).length;
  $('#topActions').innerHTML = areaSeg() + `<select data-chg="mesEscala" aria-label="Mês" class="btn sm" style="padding-right:10px">${meses.map(k => `<option value="${k}" ${k === m ? 'selected' : ''}>${esc(cap(mesLabel(k)))}</option>`).join('')}</select>`;
  let h = `<section class="card"><div class="spread"><h2>Escala de ${mesNome(m)} · ${AREAS[a]}</h2><div class="row">${p ? (mudou ? '<span class="badge warn">Publicada · com mudanças</span>' : '<span class="badge ok">Publicada</span>') : r ? '<span class="badge warn">Rascunho</span>' : ''}</div></div>
    <p class="muted">Respostas: <b>${resp} de ${t.length}</b>${jan(m, a).fecha ? ' · até ' + fmtD(jan(m, a).fecha) : ''}</p>
    <div class="row">${tem ? '' : `<button class="btn pink" data-act="manual" ${evs.length ? '' : 'disabled'}>Escolher eu mesma</button>`}
      <button class="btn ${tem ? 'pink' : ''}" data-act="sugerir" ${evs.length ? '' : 'disabled'}>${tem ? 'Sugerir de novo' : 'Deixar o robô sugerir'}</button>
      <button class="btn" data-act="previa" ${evs.length ? '' : 'disabled'}>Ver prévia</button>
      ${r ? '<button class="btn link" data-act="limpar">Limpar rascunho</button>' : ''}</div>
    ${evs.length ? '<p class="muted small">O robô escala primeiro quem marcou "consigo", começando pelos eventos com menos gente, e equilibra quem serve menos no mês e no ano. Depois você ajusta à mão tocando nos dias.</p>' : '<p class="muted small">Cadastre os eventos em "Eventos e prazos" primeiro.</p>'}</section>`;
  if (!tem) return h;
  const w = avisos(ctx, slots), temTalvez = evs.some(e => escalados(e, slots).some(pid => disp(m, pid, e.id) === 'talvez'));
  escolherDia(evs);
  h += `<section class="card">${cal(m, evs, (s, es) => chips(es, slots, { talvez: (pid, e) => disp(m, pid, e.id) === 'talvez' }))}${legendaTipos()}${temTalvez ? '<p class="muted small">Nome com "?" marcou "talvez": confirme com a pessoa.</p>' : ''}</section>`;
  const doDia = evs.filter(e => e.data === U.sel);
  h += `<section class="card"><h3>${WDL[dow(U.sel)]}, ${dnum(U.sel)}</h3>${doDia.map(e => `<div class="ev k-${tipo(e)}"><div class="ev-h"><strong>${esc(e.nome)}</strong><span class="pill k-${tipo(e)}">${fmtT(e.hora)}</span></div>${infoEv(e)}${painelEscolha(m, e, t, slots)}</div>`).join('')}</section>`;
  const cnt = {}; t.forEach(x => cnt[x.id] = 0); evs.forEach(e => escalados(e, slots).forEach(pid => { if (pid in cnt) cnt[pid]++; }));
  const mx = Math.max(1, ...Object.values(cnt));
  h += `<section class="card"><div class="row"><button class="btn sm" data-act="toggle" data-k="showAvisos" aria-expanded="${U.showAvisos}">Avisos <span class="badge ${w.length ? 'warn' : 'ok'}">${w.length}</span></button><button class="btn sm" data-act="toggle" data-k="showStats" aria-expanded="${U.showStats}">Quem serve quanto</button></div>
    ${U.showAvisos ? (w.length ? `<ul class="warnlist">${w.map(x => `<li class="${x.k}">${esc(x.t)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum aviso. Tudo dentro das regras.</p>') : ''}
    ${U.showStats ? `<div>${t.map(x => `<div class="stat"><span class="nm">${av(x, 'xs')}${esc(x.nome)}</span><div class="bar"><i style="width:${cnt[x.id] / mx * 100}%"></i></div><b>${cnt[x.id]}<span class="muted small"> · ${histAno(x.id, m.slice(0, 4), m) + cnt[x.id]} no ano</span></b></div>`).join('')}</div>` : ''}
    <div class="row" style="border-top:1px dashed var(--line);padding-top:14px">
      ${p && !mudou ? '<button class="btn" data-act="despublicar">Tirar do ar (voltar a rascunho)</button>' : `<button class="btn pink" data-act="publicar">${p ? 'Publicar as mudanças' : 'Publicar escala'}</button>`}
      <button class="btn" data-act="copiarEscala">Copiar em texto para o WhatsApp</button></div></section>`;
  return h;
}
function painelEscolha(m, e, t, slots) {
  const sl = escalados(e, slots), by = v => t.filter(p => disp(m, p.id, e.id) === v), sem = t.filter(p => !disp(m, p.id, e.id));
  const alerta = p => cultoNao(m, p.id) || (priv(p.id).bloq || []).includes(dow(e.data)) ? ' ⚠' : '';
  const btn = p => `<button class="btn sm" data-act="pickSlot" data-ev="${e.id}" data-p="${esc(p.id)}" aria-pressed="${sl.includes(p.id)}">${av(p, 'xs')}${esc(p.nome)}${alerta(p)}</button>`;
  const grp = (tt, l) => l.length ? `<div class="stack" style="gap:6px"><span class="lbl">${tt} (${l.length})</span><div class="picks">${l.map(btn).join('')}</div></div>` : '';
  const sim = by('sim'), nao = by('nao');
  return `<p class="small"><b>${sim.length} ${sim.length === 1 ? 'pessoa disponível' : 'pessoas disponíveis'}</b> para ${e.vagas} ${e.vagas === 1 ? 'vaga' : 'vagas'}. Toque no nome para escalar ou tirar.</p>
    ${grp('Consigo', sim)}${grp('Talvez', by('talvez'))}${grp('Sem resposta', sem)}
    ${nao.length ? `<p class="muted small">Não conseguem: ${nao.map(p => esc(p.nome)).join(', ')}</p>` : ''}
    <p class="muted small">⚠ = respondeu "Não" sobre culto e ceia, ou tem restrição neste dia da semana.</p>`;
}
async function gravarRasc(m, a, slots) { await save('rascunhos', m + '_' + a, { mes: m, area: a, slots }); }

function vEventos() {
  const m = mesAtual(), a = U.area, c = jan(m, a), st = janela(c), evs = eventos(m, a);
  $('#topActions').innerHTML = areaSeg();
  return `<section class="card"><div class="spread"><h2>Respostas de ${mesNome(m)} · ${AREAS[a]}</h2>${badgeJanela(st)}</div>
    <p class="muted small">As integrantes só conseguem marcar disponibilidade depois que você liberar, entre as duas datas.</p>
    <div class="grid2"><div class="field"><label for="jAbre">Abre em</label><input id="jAbre" type="date" data-chg="jan" data-k="abre" value="${c.abre || ''}"></div><div class="field"><label for="jFecha">Fecha em</label><input id="jFecha" type="date" data-chg="jan" data-k="fecha" value="${c.fecha || ''}"></div></div>
    <div class="row">${st === 'prep' ? '<button class="btn pink" data-act="liberar">Liberar para a equipe</button>' : (st === 'fechado' ? '<button class="btn" data-act="reabrir">Reabrir</button>' : '<button class="btn" data-act="encerrar">Encerrar agora</button>') + '<button class="btn link" data-act="desliberar">Desfazer liberação</button>'}</div></section>
  <section class="card"><div class="spread"><h2>Eventos de ${mesNome(m)} · ${AREAS[a]}</h2><button class="btn pink sm" data-act="novoEv">+ Novo evento</button></div>
    <div class="row"><button class="btn sm" data-act="fixos">Criar os eventos fixos do mês</button><span class="muted small">Domingos 9h e 18h (Ceia no 2º domingo), quinta 20h e Ação social no 3º sábado.</span></div>
    ${evs.length ? `<div class="agenda">${evs.map(e => `<button class="ag" data-act="editEv" data-id="${e.id}"><div class="d">${dnum(e.data)}<small>${WD[dow(e.data)]}</small></div><div><span class="pill k-${tipo(e)}">${fmtT(e.hora)} · ${esc(e.nome)}</span><div class="small muted" style="margin-top:4px">${e.vagas} ${e.vagas === 1 ? 'pessoa' : 'pessoas'}${e.ministerio ? ' · ' + esc(e.ministerio) : ''}</div></div></button>`).join('')}</div>` : '<p class="empty">Nenhum evento ainda. Toque em "Criar os eventos fixos do mês" para trazer os cultos de domingo, quinta, a Ceia e a Ação social.</p>'}</section>
  <section class="card"><div class="spread"><div><h3>Mês em uso: ${esc(cap(mesLabel(m)))}</h3><p class="muted small">Ao abrir o próximo mês, ${mesNome(m)} vai para o Histórico com tudo guardado. Equipe, PINs e fotos continuam.</p></div><button class="btn" data-act="proxMes">Abrir ${esc(cap(mesLabel(proxMes(m))))}</button></div></section>`;
}
function modalEvento(id) {
  const m = mesAtual(), e = id ? D().eventos.find(x => x.id === id) : { nome: '', data: iso(mesParts(m).y, mesParts(m).m, 1), hora: '19:00', vagas: 1, ministerio: '', ceia: false };
  abrirModal(`<div class="mh"><h2>${id ? 'Editar evento' : 'Novo evento · ' + AREAS[U.area]}</h2><button class="x" data-act="fechar" aria-label="Fechar">×</button></div>
    <form class="mb" id="fEv"><div class="field"><label for="evNome">Nome</label><input id="evNome" value="${esc(e.nome)}" maxlength="80" placeholder="Ex.: Culto de jovens"></div>
    <div class="field"><label for="evMin">Ministério</label><input id="evMin" value="${esc(e.ministerio || '')}" maxlength="60" placeholder="Ex.: Jovens, Louvor, Geral"></div>
    <div class="grid3"><div class="field"><label for="evData">Dia</label><input id="evData" type="date" value="${e.data}" min="${iso(mesParts(m).y, mesParts(m).m, 1)}" max="${iso(mesParts(m).y, mesParts(m).m, diasNoMes(m))}"></div>
    <div class="field"><label for="evHora">Horário</label><input id="evHora" type="time" value="${e.hora}"></div><div class="field"><label for="evVagas">Pessoas escaladas</label><input id="evVagas" type="number" min="1" max="6" value="${e.vagas}"></div></div>
    <label class="chk"><input type="checkbox" id="evCeia" ${e.ceia ? 'checked' : ''}> É culto de Santa Ceia</label></form>
    <div class="mf">${id ? `<button class="btn danger" data-act="delEv" data-id="${id}">Excluir</button><span class="space"></span>` : ''}<button class="btn" data-act="fechar">Cancelar</button><button class="btn pink" data-act="salvarEv" data-id="${id || ''}">Salvar</button></div>`);
}

function vEquipe() {
  const m = mesAtual(), lista = ativos().filter(p => U.eqf === 'todas' || p.area === U.eqf);
  $('#topActions').innerHTML = `<div class="seg" role="group" aria-label="Filtro">${[['todas', 'Todas'], ...Object.entries(AREAS)].map(([k, l]) => `<button data-act="eqf" data-k="${k}" aria-pressed="${U.eqf === k}">${l}</button>`).join('')}</div><button class="btn pink sm" data-act="novaPessoa">+ Adicionar</button>`;
  const msg = `Oi, pessoal! A escala de ${mesNome(m)} está aberta. Entrem no site (${siteUrl()}), escolham seu nome, digitem o PIN e marquem "consigo" ou "não consigo" em cada evento até ${fmtD(jan(m, 'midia').fecha) || 'o prazo'}. Obrigada!`;
  return `<section class="card"><div class="spread"><h3>Lembrete para o grupo do WhatsApp</h3><button class="btn sm" data-act="copiarTexto" data-t="${esc(msg)}">Copiar mensagem</button></div><p class="muted small" style="white-space:pre-wrap">${esc(msg)}</p></section>
  <section class="card"><div class="list">${lista.map(p => {
    const r = respDoc(m, p.id), pu = pub(m, p.area), cob = !r?.enviado && p.papel !== 'master' ? waLink(p.id, `Oi, ${primeiro(p.nome)}! Falta você marcar suas disponibilidades da escala de ${mesNome(m)} no site (${siteUrl()}), até ${fmtD(jan(m, p.area).fecha) || 'o prazo'}. Obrigada!`) : '';
    const avi = pu ? waLink(p.id, `Oi, ${primeiro(p.nome)}! A escala de ${mesNome(m)} já está pronta. Entre no site para ver: ${siteUrl()}`) : '';
    const n = Object.values(r?.disp || {}).filter(v => v === 'sim').length;
    return `<div class="li">${av(p, 'md')}<div class="grow"><div class="row"><b>${esc(p.nome)}</b><span class="badge">${AREAS[p.area]}</span>${p.papel === 'master' ? '<span class="badge pink">Líder</span>' : ''}</div>
      <div class="muted small">${esc(priv(p.id).telefone || 'sem WhatsApp')} · ${n} "consigo"${p.loginEmail || store.demo ? '' : ' · <b class="err">sem PIN</b>'}</div></div>
      <div class="row">${p.papel === 'master' ? '' : `<span class="badge ${r?.enviado ? 'ok' : 'no'}">${r?.enviado ? 'Respondeu' : 'Falta responder'}</span>`}${cob ? `<a class="btn sm" href="${cob}" target="_blank" rel="noopener">Cobrar</a>` : ''}${avi ? `<a class="btn sm" href="${avi}" target="_blank" rel="noopener">Avisar</a>` : ''}<button class="btn sm" data-act="abrirPessoa" data-id="${p.id}">Abrir</button></div></div>`;
  }).join('') || '<p class="empty">Ninguém nesta equipe ainda.</p>'}</div></section>`;
}
function modalPessoa(id) {
  const p = pessoa(id), pr = priv(id), m = mesAtual(), r = respDoc(m, id), evs = eventos(m, p.area), eLider = p.papel === 'master';
  abrirModal(`<div class="mh">${av(p, 'md')}<h2>${esc(p.nome)}</h2><button class="x" data-act="fechar" aria-label="Fechar">×</button></div>
  <div class="mb"><div class="photo-pick"><span class="ring" id="mFoto">${av(p, 'xl')}</span><div class="stack" style="gap:8px"><label class="btn sm file-btn">Escolher foto<input type="file" accept="image/*" data-chg="fotoPessoa" data-id="${id}" aria-label="Escolher foto"></label>${p.foto ? `<button class="btn link" data-act="tirarFoto" data-id="${id}">Remover foto</button>` : ''}</div></div>
    <p class="priv">Dados e acesso</p>
    <div class="grid2"><div class="field"><label for="mpNome">Nome</label><input id="mpNome" value="${esc(p.nome)}" maxlength="40"></div>
      <div class="field"><label for="mpArea">Equipe</label><select id="mpArea">${Object.entries(AREAS).map(([k, l]) => `<option value="${k}" ${p.area === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="mpTel">WhatsApp (com DDD)</label><input id="mpTel" value="${esc(pr.telefone || '')}" inputmode="tel" placeholder="(11) 91234-5678"></div>
      <div class="field"><label for="mpObs">Observações</label><input id="mpObs" value="${esc(pr.obs || '')}" maxlength="300"></div></div>
    <div class="field"><label>Dias em que não pode servir</label><div class="wds">${WD.map((w, i) => `<label><input type="checkbox" class="mpBloq" value="${i}" ${(pr.bloq || []).includes(i) ? 'checked' : ''}>${w}</label>`).join('')}</div></div>
    <div class="row"><button class="btn pink" data-act="salvarPessoa" data-id="${id}">Salvar dados</button></div>
    <p class="priv">PIN de acesso</p>
    <div class="row"><div class="field" style="max-width:220px"><label for="mpPin">${p.loginEmail || store.demo ? 'PIN novo' : 'Criar o PIN'} (4 números)</label><input id="mpPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><button class="btn" data-act="pinPessoa" data-id="${id}" style="align-self:flex-end">Definir PIN</button></div>
    <p class="muted small">Use quando a pessoa esquecer o PIN. O PIN antigo deixa de funcionar.</p>
    ${eLider ? '' : `<p class="priv">Controle privado · só você vê</p>
    <div class="row"><span class="lbl">Culto e ceia · ${mesNome(m)}</span>${badgeCulto(r?.culto)}</div>
    ${evs.length ? `<span class="lbl">Disponibilidade (marque por ela se veio pelo WhatsApp)</span><div class="avl">${evs.map(e => { const v = r?.disp?.[e.id]; return `<span>${fmtD(e.data)} · ${fmtT(e.hora)}<br><span class="muted">${esc(e.nome)}</span></span><span class="choice" style="grid-template-columns:repeat(3,auto)">${[['sim', 'Sim', 'yes'], ['talvez', 'Talvez', 'mb'], ['nao', 'Não', 'nop']].map(o => `<button class="btn sm ${o[2]}" data-act="dispPor" data-p="${id}" data-ev="${e.id}" data-v="${o[0]}" aria-pressed="${v === o[0]}">${o[1]}</button>`).join('')}</span>`; }).join('')}</div>` : ''}
    <div class="row"><button class="btn sm" data-act="marcarEnviado" data-id="${id}">${r?.enviado ? 'Marcar como "falta responder"' : 'Marcar como "respondeu"'}</button><span class="space"></span><button class="btn sm danger" data-act="removerPessoa" data-id="${id}">Remover da equipe</button></div>`}
  </div>`, 'wide');
}
function modalNovaPessoa() {
  abrirModal(`<div class="mh"><h2>Nova pessoa na equipe</h2><button class="x" data-act="fechar" aria-label="Fechar">×</button></div>
  <div class="mb"><div class="grid2"><div class="field"><label for="npNome">Nome</label><input id="npNome" maxlength="40"></div>
    <div class="field"><label for="npArea">Equipe</label><select id="npArea">${Object.entries(AREAS).map(([k, l]) => `<option value="${k}" ${(U.eqf === k || (U.eqf === 'todas' && k === 'midia')) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="npTel">WhatsApp (com DDD)</label><input id="npTel" inputmode="tel" placeholder="(11) 91234-5678"></div>
    <div class="field"><label for="npPin">PIN (4 números)</label><input id="npPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div></div>
    <p class="muted small">A foto você coloca depois, abrindo a pessoa na lista.</p></div>
  <div class="mf"><button class="btn" data-act="fechar">Cancelar</button><button class="btn pink" data-act="salvarNova">Adicionar</button></div>`);
}
const badgeCulto = v => `<span class="badge ${v === 'sim' ? 'ok' : v === 'nao' ? 'no' : v === 'imprevisto' ? 'warn' : ''}">${v ? esc(CULTO[v]) : 'Ainda não respondeu'}</span>`;

function vCulto() {
  const ms = [...new Set([...D().meses.map(x => x.id), mesAtual()])].sort().reverse();
  if (!U.culM || !ms.includes(U.culM)) U.culM = mesAtual();
  const m = U.culM;
  $('#topActions').innerHTML = `<select data-chg="culM" class="btn sm" aria-label="Mês">${ms.map(k => `<option value="${k}" ${k === m ? 'selected' : ''}>${esc(cap(mesLabel(k)))}</option>`).join('')}</select>`;
  return `<section class="card"><p class="muted">O que cada pessoa respondeu sobre frequência nos cultos e Santa Ceia. Só você vê. Quem respondeu "Não" fica fora da sugestão do robô.</p></section>
  ${Object.keys(AREAS).map(a => { const t = timeDe(a).filter(p => p.papel !== 'master'); return `<section class="card"><h3>${AREAS[a]}</h3>${t.length ? `<div class="list">${t.map(p => { const r = respDoc(m, p.id); return `<div class="li">${av(p, 'sm')}<div class="grow"><b>${esc(p.nome)}</b>${r?.cultoEm ? `<div class="muted small">respondeu em ${fmtDL(r.cultoEm)}</div>` : ''}</div>${badgeCulto(r?.culto)}</div>`; }).join('')}</div>` : '<p class="muted">Ninguém nesta equipe.</p>'}</section>`; }).join('')}`;
}

function vHistorico() {
  const ms = [...new Set([...D().meses.map(x => x.id), mesAtual()])].sort().reverse(), anos = [...new Set(ms.map(k => k.slice(0, 4)))];
  if (!U.histAno || !anos.includes(U.histAno)) U.histAno = anos[0];
  const ano = U.histAno, doAno = ms.filter(k => k.startsWith(ano));
  $('#topActions').innerHTML = `<select data-chg="histAno" class="btn sm" aria-label="Ano">${anos.map(y => `<option ${y === ano ? 'selected' : ''}>${y}</option>`).join('')}</select>`;
  const cont = {}; D().publicadas.filter(x => x.mes.startsWith(ano)).forEach(x => eventos(x.mes, x.area).forEach(e => escalados(e, x.slots).forEach(pid => cont[pid] = (cont[pid] || 0) + 1)));
  const rank = ativos().map(p => [p, cont[p.id] || 0]).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...rank.map(x => x[1]));
  return `<div class="cols"><section class="card"><h2>Meses de ${ano}</h2><div class="tbl"><table><thead><tr><th>Mês</th>${Object.values(AREAS).map(l => `<th>${l}</th>`).join('')}<th class="n">Eventos</th><th></th></tr></thead><tbody>
    ${doAno.map(k => `<tr><td><b>${esc(cap(mesNome(k)))}</b>${k === mesAtual() ? ' <span class="badge pink">em uso</span>' : ''}</td>${Object.keys(AREAS).map(a => `<td>${pub(k, a) ? '<span class="badge ok">Publicada</span>' : rasc(k, a) ? '<span class="badge warn">Rascunho</span>' : '<span class="muted">—</span>'}</td>`).join('')}<td class="n">${eventos(k).length}</td><td><button class="btn sm" data-act="verMes" data-k="${k}">Abrir</button></td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>Quem serviu quanto em ${ano}</h2><p class="muted small">Conta só as escalas publicadas, das duas equipes.</p><div>${rank.map(([p, n]) => `<div class="stat"><span class="nm">${av(p, 'xs')}${esc(p.nome)}</span><div class="bar"><i style="width:${n / mx * 100}%"></i></div><b>${n}</b></div>`).join('')}</div></section></div>`;
}

const VIEWS = { inicio: vInicio, disp: vDisp, publicada: vPublicada, perfil: vPerfil, painel: vPainel, escala: vEscala, eventos: vEventos, equipe: vEquipe, culto: vCulto, historico: vHistorico };
const SO_LIDER = ['painel', 'escala', 'eventos', 'equipe', 'culto', 'historico'];

// ============================ MODAL ============================
function abrirModal(html, cls = '') { const b = $('#modalBox'); b.className = 'modal-box ' + cls; b.innerHTML = html; $('#modal').classList.remove('hidden'); b.querySelector('input,select,textarea')?.focus(); }
function fecharModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });

// ============================ RESPOSTAS (salva sozinho) ============================
let saveTimer = null;
function minhaResp() {
  const me = eu(), m = mesAtual(), id = m + '_' + me.id;
  let r = respDoc(m, me.id);
  if (!r) { r = { id, mes: m, pid: me.id, area: me.area, disp: {}, enviado: false, culto: null, cultoEm: '' }; D().respostas.push(r); }
  r.disp = r.disp || {}; return r;
}
function agendarSalvar(r, imediato) {
  U.saveState = 'pending'; clearTimeout(saveTimer);
  const go = async () => { try { await save('respostas', r.id, { ...r, area: eu().area }); U.saveState = 'saved'; } catch (e) { U.saveState = 'error'; } agendarRender(); };
  if (imediato) return go(); saveTimer = setTimeout(go, 600);
}
function syncLiderEnviado(r) { if (!ehMaster()) return; const evs = eventos(mesAtual(), eu().area); r.enviado = evs.length > 0 && evs.every(e => r.disp[e.id]); }

// ============================ AÇÕES ============================
const A = {
  // login
  escolher: d => { U.login = { pid: d.id, pin: '', err: '' }; store.authMsg = ''; },
  pk: d => { const L = U.login; if (L.pin.length >= 4) return; L.pin += d.k; L.err = ''; if (L.pin.length === 4) { renderLogin(); return tentarLogin(); } },
  pkdel: () => { U.login.pin = U.login.pin.slice(0, -1); },
  pkvolta: () => { U.login = { pid: null, pin: '', err: '' }; },
  sair: async () => { fecharModal(); await sair(); },
  menu: () => { $('#side').classList.toggle('open'); $('#scrim').classList.toggle('on'); return 'skip'; },
  ir: d => { if (SO_LIDER.includes(d.v) && !ehMaster()) return; U.view = d.v; U.sel = null; U.editando = false; $('#side').classList.remove('open'); $('#scrim').classList.remove('on'); window.scrollTo(0, 0); },
  toggle: d => { U[d.k] = !U[d.k]; },
  dia: d => { U.sel = d.d; },
  area: d => { U.area = d.k; U.sel = null; },
  fechar: () => { fecharModal(); return 'skip'; },
  copiarTexto: d => { copiar(d.t); return 'skip'; },

  // integrante
  culto: async d => { const r = minhaResp(); r.culto = d.v; r.cultoEm = hojeStr(); await agendarSalvar(r, true); },
  disp: d => { const r = minhaResp(); if (r.disp[d.ev] === d.v) delete r.disp[d.ev]; else r.disp[d.ev] = d.v; if (!ehMaster()) r.enviado = false; syncLiderEnviado(r); agendarSalvar(r); },
  restoNao: () => { const r = minhaResp(); eventos(mesAtual(), eu().area).forEach(e => { if (!r.disp[e.id]) r.disp[e.id] = 'nao'; }); syncLiderEnviado(r); agendarSalvar(r); },
  diaProx: () => { const r = minhaResp(), evs = eventos(mesAtual(), eu().area), f = evs.find(e => !r.disp[e.id] && e.data !== U.sel) || evs.find(e => e.data > U.sel); if (f) U.sel = f.data; else toast('Não falta mais nenhum dia.'); },
  enviar: async () => { const r = minhaResp(); r.enviado = true; U.editando = false; await agendarSalvar(r, true); toast(`Enviado! A ${liderNome()} avisa quando a escala ficar pronta.`); },
  editarResp: () => { U.editando = true; },
  tirarMinhaFoto: async () => { await patch('pessoas', eu().id, { foto: '' }); toast('Foto removida.'); },

  // escala
  manual: async () => { const m = U.mes, a = U.area, s = {}; eventos(m, a).forEach(e => s[e.id] = Array.from({ length: e.vagas }, () => '')); await gravarRasc(m, a, s); U.sel = null; },
  sugerir: async () => {
    const m = U.mes, a = U.area, tem = rasc(m, a) || pub(m, a);
    if (tem && !await confirmar('Sugerir de novo apaga as escolhas que você fez à mão neste mês. Quer mesmo?', 'Sim, sugerir de novo', true)) return;
    await gravarRasc(m, a, sugerir(ctxDe(m, a))); U.sel = null; toast('Pronto! Confira os avisos e ajuste o que precisar.');
  },
  limpar: async () => { if (!await confirmar('Apagar o rascunho deste mês? A escala publicada (se houver) continua no ar.', 'Apagar rascunho', true)) return; await remove('rascunhos', U.mes + '_' + U.area); },
  pickSlot: async d => {
    const m = U.mes, a = U.area, e = D().eventos.find(x => x.id === d.ev), base = (rasc(m, a) || pub(m, a))?.slots || {};
    const s = JSON.parse(JSON.stringify(base)), l = slotsDe(e, s), i = l.indexOf(d.p);
    if (i >= 0) l[i] = ''; else { const f = l.indexOf(''); if (f < 0) { toast('As vagas deste evento já estão cheias. Tire alguém primeiro.'); return; } l[f] = d.p; }
    s[e.id] = l; await gravarRasc(m, a, s);
  },
  publicar: async () => {
    const m = U.mes, a = U.area, s = (rasc(m, a) || pub(m, a)).slots, w = avisos(ctxDe(m, a), s);
    if (w.length && !await confirmar(`A escala tem ${w.length} aviso(s). Publicar assim mesmo?`, 'Sim, publicar')) return;
    await lote([{ col: 'publicadas', id: m + '_' + a, data: { mes: m, area: a, slots: s, em: hojeStr() } }, { col: 'rascunhos', id: m + '_' + a, data: { mes: m, area: a, slots: s } }]);
    toast('Escala publicada! A equipe já pode ver.');
  },
  despublicar: async () => { if (!await confirmar('Tirar a escala do ar? A equipe deixa de ver até você publicar de novo.', 'Tirar do ar', true)) return; const m = U.mes, a = U.area, p = pub(m, a); if (!rasc(m, a)) await gravarRasc(m, a, p.slots); await remove('publicadas', m + '_' + a); },
  copiarEscala: () => { const m = U.mes, a = U.area; copiar(textoEscala(m, a, (rasc(m, a) || pub(m, a)).slots)); return 'skip'; },
  previa: () => {
    const m = U.mes, a = U.area, s = (rasc(m, a) || pub(m, a))?.slots || sugerir(ctxDe(m, a)), sim = !(rasc(m, a) || pub(m, a)), bk = U.sel; U.sel = null;
    abrirModal(`<div class="mh"><h2>Como a equipe vê</h2><button class="x" data-act="fechar" aria-label="Fechar">×</button></div><div class="mb" style="background:var(--bg)">
      <div class="banner soft">${sim ? 'Simulação: é a sugestão do robô com as respostas de agora. Nada foi salvo.' : pub(m, a) && !rasc(m, a) ? 'Esta é a escala publicada.' : 'Esta é a escala como está agora. Só aparece para a equipe depois que você publicar.'}</div>
      ${escalaPronta(m, eventos(m, a), s, null, false).replace(/data-act="(dia|toggle)"[^>]*/g, '')}</div>`, 'wide');
    U.sel = bk; return 'skip';
  },

  // eventos e prazos
  liberar: async () => { const m = mesAtual(), a = U.area, c = { ...jan(m, a) }; if (!c.abre) c.abre = hojeStr(); if (!c.fecha) c.fecha = addD(c.abre, 7); if (c.abre > c.fecha) return toast('O dia de abrir precisa ser antes do dia de fechar.'); await setJan(m, a, { ...c, liberado: true, encerrado: false }); toast('Liberado! Avise a equipe no WhatsApp (mensagem pronta em Equipe).'); },
  encerrar: async () => { await setJan(mesAtual(), U.area, { ...jan(mesAtual(), U.area), encerrado: true }); },
  reabrir: async () => { const c = jan(mesAtual(), U.area); await setJan(mesAtual(), U.area, { ...c, encerrado: false }); if (c.fecha && hojeStr() > c.fecha) toast('Mude o dia de fechar para um dia que ainda não passou.'); },
  desliberar: async () => { await setJan(mesAtual(), U.area, { ...jan(mesAtual(), U.area), liberado: false, encerrado: false }); },
  fixos: async () => {
    const m = mesAtual(), a = U.area, ja = eventos(m, a), novos = eventosFixos(m).filter(f => !ja.some(e => e.data === f.data && e.hora === f.hora));
    if (!novos.length) return toast('Os eventos fixos já estavam na lista.');
    await lote(novos.map(f => ({ col: 'eventos', id: newId(), data: { ...f, mes: m, area: a } }))); toast(novos.length + ' eventos criados.');
  },
  novoEv: () => { modalEvento(null); return 'skip'; },
  editEv: d => { modalEvento(d.id); return 'skip'; },
  salvarEv: async d => {
    const m = mesAtual(), data = $('#evData').value; if (!data || !data.startsWith(m)) return toast('Escolha um dia dentro de ' + mesNome(m) + '.');
    const old = d.id ? D().eventos.find(x => x.id === d.id) : null;
    const v = { mes: m, area: old?.area || U.area, nome: $('#evNome').value.trim() || 'Evento', ministerio: $('#evMin').value.trim(), data, hora: $('#evHora').value || '19:00', vagas: Math.max(1, Math.min(6, parseInt($('#evVagas').value, 10) || 1)), ceia: $('#evCeia').checked };
    await save('eventos', d.id || newId(), v); fecharModal(); toast('Evento salvo.');
  },
  delEv: async d => {
    if (!await confirmar('Excluir este evento? As respostas e a escala desse evento somem.', 'Excluir', true)) return;
    const e = D().eventos.find(x => x.id === d.id), ops = [{ col: 'eventos', id: d.id, del: true }];
    [rasc(e.mes, e.area), pub(e.mes, e.area)].forEach((x, i) => { if (x && x.slots?.[d.id]) { const s = { ...x.slots }; delete s[d.id]; ops.push({ col: i ? 'publicadas' : 'rascunhos', id: x.id, data: { ...x, slots: s } }); } });
    await lote(ops); fecharModal(); toast('Evento excluído.');
  },
  proxMes: async () => {
    const m = mesAtual(), n = proxMes(m);
    if (!await confirmar(`Abrir ${mesLabel(n)}? ${cap(mesNome(m))} vai para o Histórico, com tudo guardado.`, 'Abrir ' + mesNome(n))) return;
    const vazio = { liberado: false, encerrado: false, abre: '', fecha: '' }, ops = [{ col: 'config', id: 'app', data: { ...store.cfg(), mesAtual: n } }];
    if (!mesDoc(n)) ops.push({ col: 'meses', id: n, data: { areas: { midia: { ...vazio }, iluminacao: { ...vazio } } } });
    await lote(ops); U.mes = n; toast(cap(mesLabel(n)) + ' aberto. Agora crie os eventos.');
  },

  // equipe
  eqf: d => { U.eqf = d.k; },
  abrirPessoa: d => { modalPessoa(d.id); return 'skip'; },
  novaPessoa: () => { modalNovaPessoa(); return 'skip'; },
  salvarNova: async () => {
    const nome = $('#npNome').value.trim(), pin = $('#npPin').value.trim();
    if (!nome) return toast('Escreva o nome.');
    if (pin && !pinValido(pin)) return toast('O PIN precisa ter 4 números (diferente de 0000).');
    if (!pin && !store.demo && !await confirmar('Sem PIN a pessoa não consegue entrar. Adicionar mesmo assim e criar o PIN depois?', 'Adicionar sem PIN')) return;
    await novaPessoa({ nome, area: $('#npArea').value, pin, telefone: $('#npTel').value.trim() }); fecharModal(); toast(nome + ' entrou na equipe.');
  },
  salvarPessoa: async d => {
    const nome = $('#mpNome').value.trim(); if (!nome) return toast('O nome não pode ficar vazio.');
    await lote([{ col: 'pessoas', id: d.id, data: { ...pessoa(d.id), nome, area: $('#mpArea').value } }, { col: 'privado', id: d.id, data: { ...priv(d.id), telefone: $('#mpTel').value.trim(), obs: $('#mpObs').value, bloq: $$('.mpBloq').filter(x => x.checked).map(x => +x.value) } }]);
    toast('Dados salvos.'); return 'skip';
  },
  pinPessoa: async d => { const v = $('#mpPin').value.trim(); await definirPin(d.id, v); $('#mpPin').value = ''; toast('PIN de ' + primeiro(nomeDe(d.id)) + ' definido.'); return 'skip'; },
  dispPor: async (d, el) => {
    const m = mesAtual(), p = pessoa(d.p), id = m + '_' + d.p, r = JSON.parse(JSON.stringify(respDoc(m, d.p) || { mes: m, pid: d.p, area: p.area, disp: {}, enviado: false, culto: null, cultoEm: '' }));
    r.disp = r.disp || {}; if (r.disp[d.ev] === d.v) delete r.disp[d.ev]; else r.disp[d.ev] = d.v;
    $$(`[data-act="dispPor"][data-p="${d.p}"][data-ev="${d.ev}"]`).forEach(b => b.setAttribute('aria-pressed', String(r.disp[d.ev] === b.dataset.v)));
    await save('respostas', id, r); return 'skip';
  },
  marcarEnviado: async d => { const m = mesAtual(), p = pessoa(d.id), r = respDoc(m, d.id) || { mes: m, pid: d.id, area: p.area, disp: {}, culto: null, cultoEm: '' }; await save('respostas', m + '_' + d.id, { ...r, enviado: !r.enviado }); modalPessoa(d.id); return 'skip'; },
  tirarFoto: async d => { await patch('pessoas', d.id, { foto: '' }); modalPessoa(d.id); return 'skip'; },
  removerPessoa: async d => {
    if (!await confirmar(`Remover ${nomeDe(d.id)} da equipe? Ela não consegue mais entrar. O nome continua nas escalas antigas.`, 'Remover', true)) return 'skip';
    await patch('pessoas', d.id, { ativo: false }); fecharModal(); toast('Pessoa removida da equipe.');
  },

  // líder: navegação a partir do painel/histórico
  abrirEscala: d => { U.area = d.k; U.mes = mesAtual(); U.view = 'escala'; U.sel = null; },
  abrirEventos: d => { U.area = d.k; U.view = 'eventos'; },
  verMes: d => { U.mes = d.k; U.view = 'escala'; U.sel = null; },
  resetDemo: async () => { if (await confirmar('Apagar tudo o que foi feito nesta demonstração e voltar aos dados de exemplo?', 'Recomeçar', true)) resetDemo(); return 'skip'; },
};
async function setJan(m, a, c) { const doc = mesDoc(m) || { id: m, areas: {} }; await save('meses', m, { areas: { ...doc.areas, [a]: c } }); }

const C = {
  pubMes: el => { U.pubMes = el.value; U.sel = null; },
  mesEscala: el => { U.mes = el.value; U.sel = null; },
  culM: el => { U.culM = el.value; },
  histAno: el => { U.histAno = el.value; },
  jan: async el => {
    const m = mesAtual(), c = { ...jan(m, U.area), [el.dataset.k]: el.value };
    if (c.abre && c.fecha && c.abre > c.fecha) { toast('O dia de abrir precisa ser antes do dia de fechar.'); return; }
    await setJan(m, U.area, c);
  },
  minhaFoto: async el => { const f = el.files[0]; if (!f) return; await patch('pessoas', eu().id, { foto: await fotoDeArquivo(f) }); toast('Foto atualizada!'); },
  fotoPessoa: async el => { const f = el.files[0]; if (!f) return; await patch('pessoas', el.dataset.id, { foto: await fotoDeArquivo(f) }); modalPessoa(el.dataset.id); toast('Foto salva.'); return 'skip'; },
};

document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-act]'); if (!t || t.disabled) return;
  const f = A[t.dataset.act]; if (!f) return;
  ev.preventDefault();
  let r; try { r = f(t.dataset, t); } catch (e) { return toast(e.message); }
  const after = v => { if (v !== 'skip') renderTudo(); };
  if (r && r.then) r.then(after, e => { toast(e.message || 'Não consegui salvar. Tente de novo.'); renderTudo(); }); else after(r);
});
document.addEventListener('change', ev => {
  const t = ev.target.closest('[data-chg]'); if (!t) return;
  const f = C[t.dataset.chg]; if (!f) return;
  const r = f(t);
  if (r && r.then) r.then(v => { if (v !== 'skip') renderTudo(); }, e => toast(e.message || 'Não consegui salvar.')); else renderTudo();
});
document.addEventListener('submit', async ev => {
  if (ev.target.id !== 'fPin') return;
  ev.preventDefault();
  const a = $('#pAtual').value, b = $('#pNovo').value, c = $('#pNovo2').value;
  if (b !== c) return toast('Os dois PINs novos precisam ser iguais.');
  try { await trocarMeuPin(a, b); ev.target.reset(); toast('PIN trocado!'); } catch (e) { toast(e.message); }
});

// ============================ INÍCIO ============================
store.onData(agendarRender);
store.onAuth(estado => {
  fecharModal();
  if (estado === 'app') {
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    U.login = { pid: null, pin: '', err: '' };
    U.view = ehMaster() ? 'painel' : 'inicio'; U.area = eu().area || 'midia'; U.mes = ''; U.sel = null;
    renderTudo(); window.scrollTo(0, 0);
  } else {
    U.setup = estado === 'setup';
    $('#app').classList.add('hidden'); $('#login').classList.remove('hidden');
    renderLogin();
  }
});
$('#login').classList.remove('hidden');
renderLogin();
init().catch(e => { console.error(e); $('#login').innerHTML = `<div class="login-card"><h2>Não consegui conectar</h2><p style="color:#a6a6b0">Verifique a internet e a configuração do Firebase. (${esc(e.message || e)})</p></div>`; });
