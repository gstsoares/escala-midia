// Regras da escala: datas, eventos fixos, robô de sugestão e avisos.
export const AREAS = { midia: 'Mídia', iluminacao: 'Iluminação' };
export const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WDL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WDF = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const CULTO = { sim: 'Sim!', nao: 'Não.', imprevisto: 'Imprevisto, já comunicou' };

export const pad = n => String(n).padStart(2, '0');
export const iso = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);          // m = 1..12
export const parse = s => { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
export const dow = s => parse(s).getDay();
export const dnum = s => Number(s.split('-')[2]);
export const hojeStr = () => { const n = new Date(); return iso(n.getFullYear(), n.getMonth() + 1, n.getDate()); };
export const fmtT = t => { const a = String(t || '00:00').split(':'); return a[1] === '00' ? (+a[0]) + 'h' : (+a[0]) + 'h' + a[1]; };
export const fmtD = s => s ? WD[dow(s)] + ' ' + dnum(s) + '/' + pad(parse(s).getMonth() + 1) : '';
export const fmtDL = s => s ? s.split('-').reverse().join('/') : '';
export const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
export const mesKey = (y, m) => y + '-' + pad(m);
export const mesParts = k => { const a = String(k).split('-').map(Number); return { y: a[0], m: a[1] }; };
export const mesLabel = k => { const p = mesParts(k); return MESES[p.m - 1] + ' de ' + p.y; };
export const mesNome = k => MESES[mesParts(k).m - 1];
export const diasNoMes = k => { const p = mesParts(k); return new Date(p.y, p.m, 0).getDate(); };
export const proxMes = k => { const p = mesParts(k); return p.m === 12 ? mesKey(p.y + 1, 1) : mesKey(p.y, p.m + 1); };
export const addDias = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); };

export const tipo = e => e.ceia ? 'ceia' : /ação/i.test(e.nome) ? 'acao' : /culto/i.test(e.nome) ? 'culto' : 'extra';
export const ordenar = evs => evs.slice().sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

// Cultos de domingo (manhã e noite; Ceia no 2º domingo), quinta à noite e Ação social no 3º sábado.
export function eventosFixos(mes) {
  const { y, m } = mesParts(mes), out = []; let dom = 0, sab = 0;
  for (let d = 1; d <= diasNoMes(mes); d++) {
    const s = iso(y, m, d), w = dow(s);
    if (w === 0) {
      dom++; const c = dom === 2;
      out.push({ data: s, hora: '09:00', nome: c ? 'Culto + Ceia · manhã' : 'Culto domingo · manhã', vagas: 1, ministerio: 'Geral', ceia: c });
      out.push({ data: s, hora: '18:00', nome: c ? 'Culto + Ceia · noite' : 'Culto domingo · noite', vagas: 1, ministerio: 'Geral', ceia: c });
    }
    if (w === 4) out.push({ data: s, hora: '20:00', nome: 'Culto de quinta', vagas: 1, ministerio: 'Geral', ceia: false });
    if (w === 6) { sab++; if (sab === 3) out.push({ data: s, hora: '08:00', nome: 'Ação social', vagas: 1, ministerio: 'Ação social', ceia: false }); }
  }
  return out;
}

// Situação do período de respostas
export function janela(cfg) {
  if (!cfg || !cfg.liberado) return 'prep';
  if (cfg.encerrado) return 'fechado';
  const t = hojeStr();
  if (cfg.abre && t < cfg.abre) return 'breve';
  if (cfg.fecha && t > cfg.fecha) return 'fechado';
  return 'aberto';
}

/*  Robô de sugestão.
    ctx = { eventos, pessoas, resp(pid, evId), bloq(pid) -> [dias], cultoNao(pid) -> bool, hist(pid) -> nº de vezes no ano }
    1ª rodada: só quem marcou "consigo", começando pelos eventos com menos gente disponível.
    2ª rodada: quem marcou "talvez" entra só onde ainda ficou vaga.
    Desempate: menos vezes neste mês, depois menos vezes no ano, depois menos "consigo". */
export function sugerir(ctx) {
  const evs = ordenar(ctx.eventos), slots = {}, cnt = {};
  evs.forEach(e => slots[e.id] = []);
  ctx.pessoas.forEach(p => cnt[p.id] = 0);
  const sims = pid => evs.filter(e => ctx.resp(pid, e.id) === 'sim').length;
  const base = (p, e) => !ctx.cultoNao(p.id) && !(ctx.bloq(p.id) || []).includes(dow(e.data));
  const elSim = (p, e) => ctx.resp(p.id, e.id) === 'sim' && base(p, e);
  const elTalvez = (p, e) => ctx.resp(p.id, e.id) === 'talvez' && base(p, e);
  const encher = (e, i, el) => {
    while (slots[e.id].length < e.vagas) {
      let c = ctx.pessoas.filter(p => el(p, e) && !slots[e.id].includes(p.id) && !evs.some(x => x.id !== e.id && x.data === e.data && slots[x.id].includes(p.id)));
      const perto = pid => [evs[i - 1], evs[i + 1]].some(x => x && x.data !== e.data && slots[x.id].includes(pid));
      const estrito = c.filter(p => !perto(p.id)); if (estrito.length) c = estrito;
      c.sort((a, b) => cnt[a.id] - cnt[b.id] || (ctx.hist(a.id) - ctx.hist(b.id)) || sims(a.id) - sims(b.id) || a.nome.localeCompare(b.nome));
      if (!c[0]) break;
      slots[e.id].push(c[0].id); cnt[c[0].id]++;
    }
  };
  evs.map((e, i) => ({ e, i, n: ctx.pessoas.filter(p => elSim(p, e)).length }))
    .sort((a, b) => a.n - b.n || a.i - b.i).forEach(o => encher(o.e, o.i, elSim));
  evs.forEach((e, i) => { if (slots[e.id].length < e.vagas) encher(e, i, elTalvez); });
  evs.forEach(e => slots[e.id] = Array.from({ length: e.vagas }, (_, k) => slots[e.id][k] || ''));
  return slots;
}

// Avisos de conflito da escala montada
export function avisos(ctx, slots) {
  const out = [], evs = ordenar(ctx.eventos), nome = pid => (ctx.pessoas.find(p => p.id === pid) || {}).nome || '?';
  const esc = e => (slots[e.id] || []).filter(Boolean);
  evs.forEach((e, i) => {
    const a = esc(e), lab = fmtD(e.data) + ' · ' + fmtT(e.hora) + ' · ' + e.nome;
    if (a.length < e.vagas) out.push({ k: 'bad', t: lab + ': falta' + (e.vagas - a.length > 1 ? 'm ' : ' ') + (e.vagas - a.length) + ' pessoa' + (e.vagas - a.length > 1 ? 's' : '') });
    a.forEach(pid => {
      const r = ctx.resp(pid, e.id);
      if (r === 'talvez') out.push({ k: 'warn', t: lab + ': ' + nome(pid) + ' marcou "talvez". Confirme.' });
      else if (r !== 'sim') out.push({ k: 'warn', t: lab + ': ' + nome(pid) + ' não marcou "consigo"' });
      if (ctx.cultoNao(pid)) out.push({ k: 'warn', t: lab + ': ' + nome(pid) + ' respondeu "Não" sobre culto e ceia' });
      if ((ctx.bloq(pid) || []).includes(dow(e.data))) out.push({ k: 'warn', t: lab + ': ' + nome(pid) + ' tem restrição neste dia da semana' });
      evs.forEach((o, j) => { if (j > i && o.data === e.data && esc(o).includes(pid)) out.push({ k: 'warn', t: fmtD(e.data) + ': ' + nome(pid) + ' serve duas vezes no mesmo dia' }); });
      const nx = evs[i + 1];
      if (nx && nx.data !== e.data && esc(nx).includes(pid)) out.push({ k: 'warn', t: nome(pid) + ' escalada em eventos seguidos (' + fmtD(e.data) + ' e ' + fmtD(nx.data) + ')' });
    });
  });
  return out;
}
