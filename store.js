// Camada de dados: Firebase (Auth + Firestore) ou MODO DEMONSTRAÇÃO (localStorage).
// O login é por PIN de 4 números. Por dentro, cada pessoa tem uma conta do
// Firebase Auth com um e-mail interno (ninguém recebe e-mail) e a senha
// derivada do PIN. Quem pode ver o quê fica garantido pelas regras do Firestore.
import { firebaseConfig, DOMINIO_LOGIN, MINISTERIO } from './firebase-config.js';
import { eventosFixos, mesKey, proxMes, hojeStr, addDias, ordenar, dow } from './regras.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const COLS = ['pessoas', 'privado', 'config', 'meses', 'eventos', 'respostas', 'rascunhos', 'publicadas'];

export const store = {
  demo: !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('COLE'),
  me: null, uid: null, authMsg: '',
  data: Object.fromEntries(COLS.map(c => [c, []])),
  _cb: () => {}, _authCb: () => {},
  isMaster() { return this.me?.papel === 'master'; },
  cfg() { return this.data.config.find(c => c.id === 'app') || {}; },
  onData(cb) { this._cb = cb; },
  onAuth(cb) { this._authCb = cb; },
};
const emit = () => store._cb();
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const senhaDe = (pid, pin) => 'pin-' + pin + '-' + pid;        // Firebase exige 6+ caracteres
const emailDe = pid => pid + '.' + Date.now().toString(36) + '@' + DOMINIO_LOGIN;
export const pinValido = p => /^\d{4}$/.test(p) && p !== '0000';

function pidLivre(nome) {
  const b = slug(nome) || 'pessoa'; let id = b, n = 2;
  while (store.data.pessoas.some(p => p.id === id)) id = b + '-' + n++;
  return id;
}

// ======================= MODO DEMONSTRAÇÃO =======================
const DKEY = 'escala_demo_v1', PKEY = 'escala_demo_pins_v1', SKEY = 'escala_demo_sess';
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};
const sess = {
  get() { try { return sessionStorage.getItem(SKEY); } catch (e) { return null; } },
  set(v) { try { sessionStorage.setItem(SKEY, v); } catch (e) { } },
  del() { try { sessionStorage.removeItem(SKEY); } catch (e) { } },
};

function demoSeed() {
  const atual = '2026-11', ant = '2026-10', h = hojeStr();
  const P = [
    ['camila', 'Camila', 'midia', 'master', '(11) 90000-0001'],
    ['isabela-andrade', 'Isabela Andrade', 'midia', 'integrante', '(11) 90000-0002'],
    ['evelyn-felix', 'Evelyn Felix', 'midia', 'integrante', '(11) 90000-0003'],
    ['evelyn-correa', 'Evelyn Correa', 'midia', 'integrante', ''],
    ['beatriz-corti', 'Beatriz Corti', 'midia', 'integrante', '(11) 90000-0005'],
    ['pedro-bonilha', 'Pedro Bonilha', 'iluminacao', 'integrante', '(11) 90000-0006'],
    ['clara', 'Clara', 'iluminacao', 'integrante', '(11) 90000-0007'],
  ];
  const pessoas = P.map(([id, nome, area, papel]) => ({ id, nome, area, papel, foto: '', ativo: true }));
  const privado = P.map(([id, , , , tel]) => ({ id, telefone: tel, obs: '', bloq: id === 'evelyn-felix' ? [4] : [] }));
  const evs = (mes, area) => eventosFixos(mes).filter(e => area === 'midia' || dow(e.data) === 0)
    .map((e, i) => ({ ...e, id: mes + '-' + area + '-' + i, mes, area }));
  const eventos = [...evs(ant, 'midia'), ...evs(ant, 'iluminacao'), ...evs(atual, 'midia'), ...evs(atual, 'iluminacao')];
  // Outubro já publicado (histórico)
  const publicadas = ['midia', 'iluminacao'].map(area => {
    const time = pessoas.filter(p => p.area === area).map(p => p.id), slots = {};
    ordenar(eventos.filter(e => e.mes === ant && e.area === area)).forEach((e, i) => slots[e.id] = [time[i % time.length]]);
    return { id: ant + '_' + area, mes: ant, area, slots, em: ant + '-25' };
  });
  // Respostas de novembro (exemplo)
  const ciclo = ['sim', 'sim', 'nao', 'talvez', 'sim', 'nao', 'sim'];
  const quem = { 'isabela-andrade': [1, 'sim', true], 'evelyn-felix': [2, 'sim', true], 'beatriz-corti': [3, 'imprevisto', true], 'evelyn-correa': [4, null, false], 'pedro-bonilha': [5, 'sim', true], 'clara': [6, 'nao', false] };
  const respostas = Object.entries(quem).map(([pid, [s, culto, completo]]) => {
    const area = pessoas.find(p => p.id === pid).area, disp = {};
    ordenar(eventos.filter(e => e.mes === atual && e.area === area)).forEach((e, i) => { if (completo || i < 4) disp[e.id] = ciclo[(i + s) % ciclo.length]; });
    return { id: atual + '_' + pid, mes: atual, pid, area, disp, enviado: completo, culto, cultoEm: culto ? h : '' };
  });
  const janela = { liberado: true, encerrado: false, abre: addDias(h, -3), fecha: addDias(h, 8) };
  const meses = [
    { id: ant, areas: { midia: { liberado: true, encerrado: true, abre: '2026-09-20', fecha: '2026-09-30' }, iluminacao: { liberado: true, encerrado: true, abre: '2026-09-20', fecha: '2026-09-30' } } },
    { id: atual, areas: { midia: { ...janela }, iluminacao: { ...janela } } },
  ];
  ls.set(PKEY, Object.fromEntries(P.map(([id]) => [id, id === 'camila' ? '1234' : '1111'])));
  return { pessoas, privado, config: [{ id: 'app', mesAtual: atual, ministerio: MINISTERIO }], meses, eventos, respostas, rascunhos: [], publicadas };
}
const demoSave = () => ls.set(DKEY, store.data);

// ======================= FIREBASE =======================
let fb = null, subs = [], subsPublicas = [];
async function loadFirebase() {
  const [app, auth, fs] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]);
  const a = app.initializeApp(firebaseConfig);
  fb = { app, authM: auth, fs, auth: auth.getAuth(a), db: fs.getFirestore(a) };
  // app secundário: cria contas de integrantes sem deslogar a líder
  fb.app2 = app.initializeApp(firebaseConfig, 'secundario');
  fb.auth2 = auth.getAuth(fb.app2);
}
const D = (c, id) => fb.fs.doc(fb.db, c, id);
function ouvir(lista, col, q, key = 'all') {
  const parts = {};
  lista.push(fb.fs.onSnapshot(q, snap => {
    parts[key] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const m = new Map(); Object.values(parts).flat().forEach(d => m.set(d.id, d));
    store.data[col] = [...m.values()]; emit();
  }, err => console.warn(col, err.code || err)));
}
function pararPrivadas() { subs.forEach(u => u()); subs = []; ['privado', 'meses', 'eventos', 'respostas', 'rascunhos', 'publicadas'].forEach(c => store.data[c] = []); }
function ouvirPrivadas() {
  const { fs, db } = fb, col = c => fs.collection(db, c);
  ['meses', 'eventos', 'publicadas'].forEach(c => ouvir(subs, c, col(c)));
  if (store.isMaster()) ['privado', 'respostas', 'rascunhos'].forEach(c => ouvir(subs, c, col(c)));
  else ouvir(subs, 'respostas', fs.query(col('respostas'), fs.where('pid', '==', store.me.id)));
}

// ======================= API =======================
// O callback de login recebe: 'login' | 'setup' | 'app'
export async function init() {
  if (store.demo) {
    store.data = ls.get(DKEY, null) || demoSeed(); demoSave();
    const id = sess.get(), p = id && store.data.pessoas.find(x => x.id === id && x.ativo !== false);
    store.me = p || null; store._authCb(p ? 'app' : 'login'); return;
  }
  await loadFirebase();
  ouvir(subsPublicas, 'pessoas', fb.fs.collection(fb.db, 'pessoas'));
  ouvir(subsPublicas, 'config', fb.fs.collection(fb.db, 'config'));
  fb.authM.onAuthStateChanged(fb.auth, async user => {
    if (store._setup) return;           // primeiro acesso em andamento
    pararPrivadas();
    if (!user) {
      store.me = null; store.uid = null;
      const cfg = await fb.fs.getDoc(D('config', 'app')).catch(() => null);
      store._authCb(cfg && !cfg.exists() ? 'setup' : 'login'); return;
    }
    const ac = await fb.fs.getDoc(D('acessos', user.uid)).catch(() => null);
    const pid = ac?.exists() ? ac.data().pid : null;
    const ps = pid ? await fb.fs.getDoc(D('pessoas', pid)).catch(() => null) : null;
    if (!ps?.exists() || ps.data().ativo === false || ps.data().uid !== user.uid) {
      store.authMsg = 'Esse acesso não vale mais. Peça um PIN novo para a líder.';
      await fb.authM.signOut(fb.auth); return;
    }
    store.uid = user.uid;
    store.me = { id: pid, ...ps.data(), papel: ac.data().papel };
    ouvirPrivadas(); store._authCb('app');
  });
}

export async function entrar(pid, pin) {
  const p = store.data.pessoas.find(x => x.id === pid);
  if (!p || p.ativo === false) throw new Error('Pessoa não encontrada.');
  if (store.demo) {
    if (ls.get(PKEY, {})[pid] !== pin) throw new Error('PIN incorreto. Tente de novo.');
    store.me = p; sess.set(pid); store._authCb('app'); return;
  }
  if (!p.loginEmail) throw new Error('Seu PIN ainda não foi criado. Peça para a líder.');
  try { await fb.authM.signInWithEmailAndPassword(fb.auth, p.loginEmail, senhaDe(pid, pin)); }
  catch (e) { throw new Error(e.code === 'auth/too-many-requests' ? 'Muitas tentativas erradas. Espere alguns minutos e tente de novo.' : e.code === 'auth/network-request-failed' ? 'Sem conexão. Verifique a internet.' : 'PIN incorreto. Tente de novo.'); }
}

export async function sair() {
  if (store.demo) { sess.del(); store.me = null; store._authCb('login'); return; }
  await fb.authM.signOut(fb.auth);
}

const limpa = o => { const x = { ...o }; delete x.id; Object.keys(x).forEach(k => x[k] === undefined && delete x[k]); return x; };

// grava o documento inteiro
export async function save(col, id, obj) {
  const o = limpa(obj);
  if (store.demo) {
    const arr = store.data[col], i = arr.findIndex(x => x.id === id);
    if (i >= 0) arr[i] = { id, ...o }; else arr.push({ id, ...o });
    demoSave(); emit(); return id;
  }
  await fb.fs.setDoc(D(col, id), o); return id;
}
// junta campos ao documento (cria se não existir)
export async function patch(col, id, campos) {
  if (store.demo) {
    const arr = store.data[col], i = arr.findIndex(x => x.id === id);
    if (i >= 0) arr[i] = { ...arr[i], ...limpa(campos) }; else arr.push({ id, ...limpa(campos) });
    if (col === 'pessoas' && store.me?.id === id) store.me = { ...store.me, ...limpa(campos) };
    demoSave(); emit(); return;
  }
  await fb.fs.setDoc(D(col, id), limpa(campos), { merge: true });
  if (col === 'pessoas' && store.me?.id === id) store.me = { ...store.me, ...limpa(campos) };
}
export async function remove(col, id) {
  if (store.demo) { store.data[col] = store.data[col].filter(x => x.id !== id); demoSave(); emit(); return; }
  await fb.fs.deleteDoc(D(col, id));
}
// várias gravações de uma vez: [{ col, id, data, del }]
export async function lote(ops) {
  if (store.demo) {
    ops.forEach(op => {
      const arr = store.data[op.col];
      if (op.del) { store.data[op.col] = arr.filter(x => x.id !== op.id); return; }
      const i = arr.findIndex(x => x.id === op.id), o = limpa(op.data);
      if (i >= 0) arr[i] = { id: op.id, ...o }; else arr.push({ id: op.id, ...o });
    });
    demoSave(); emit(); return;
  }
  for (let i = 0; i < ops.length; i += 400) {
    const b = fb.fs.writeBatch(fb.db);
    ops.slice(i, i + 400).forEach(op => op.del ? b.delete(D(op.col, op.id)) : b.set(D(op.col, op.id), limpa(op.data)));
    await b.commit();
  }
}

// ---- pessoas e PINs ----
async function criarConta(pid, pin) {
  const email = emailDe(pid);
  const cred = await fb.authM.createUserWithEmailAndPassword(fb.auth2, email, senhaDe(pid, pin));
  await fb.authM.signOut(fb.auth2);
  return { email, uid: cred.user.uid };
}

export async function novaPessoa({ nome, area, pin, telefone }) {
  const id = pidLivre(nome);
  const pessoa = { nome, area, papel: 'integrante', foto: '', ativo: true };
  if (store.demo) {
    const pins = ls.get(PKEY, {}); if (pin) pins[id] = pin; ls.set(PKEY, pins);
    await lote([{ col: 'pessoas', id, data: pessoa }, { col: 'privado', id, data: { telefone: telefone || '', obs: '', bloq: [] } }]);
    return id;
  }
  let conta = null;
  if (pin) conta = await criarConta(id, pin);
  const b = fb.fs.writeBatch(fb.db);
  b.set(D('pessoas', id), { ...pessoa, loginEmail: conta?.email || '', uid: conta?.uid || '' });
  b.set(D('privado', id), { telefone: telefone || '', obs: '', bloq: [] });
  if (conta) b.set(D('acessos', conta.uid), { pid: id, papel: 'integrante' });
  await b.commit();
  return id;
}

// A líder define um PIN novo para alguém (cria uma conta nova e desliga a antiga)
export async function definirPin(pid, pin) {
  if (!pinValido(pin)) throw new Error('O PIN precisa ter 4 números (diferente de 0000).');
  if (store.demo) { const pins = ls.get(PKEY, {}); pins[pid] = pin; ls.set(PKEY, pins); return; }
  const p = store.data.pessoas.find(x => x.id === pid);
  const conta = await criarConta(pid, pin);
  const b = fb.fs.writeBatch(fb.db);
  b.set(D('acessos', conta.uid), { pid, papel: p.papel === 'master' ? 'master' : 'integrante' });
  b.set(D('pessoas', pid), { loginEmail: conta.email, uid: conta.uid }, { merge: true });
  if (p.uid && p.uid !== store.uid) b.delete(D('acessos', p.uid));
  await b.commit();
}

// Cada pessoa troca o próprio PIN
export async function trocarMeuPin(atual, nova) {
  if (!pinValido(nova)) throw new Error('O PIN novo precisa ter 4 números (diferente de 0000).');
  const pid = store.me.id;
  if (store.demo) {
    const pins = ls.get(PKEY, {}); if (pins[pid] !== atual) throw new Error('PIN atual incorreto.');
    pins[pid] = nova; ls.set(PKEY, pins); return;
  }
  const u = fb.auth.currentUser;
  const cred = fb.authM.EmailAuthProvider.credential(u.email, senhaDe(pid, atual));
  await fb.authM.reauthenticateWithCredential(u, cred).catch(() => { throw new Error('PIN atual incorreto.'); });
  await fb.authM.updatePassword(u, senhaDe(pid, nova));
}

// Primeiro acesso do Firebase: cria a líder (master), o mês atual e a configuração
export async function primeiroAcesso(nome, pin) {
  if (!pinValido(pin)) throw new Error('O PIN precisa ter 4 números (diferente de 0000).');
  const id = slug(nome) || 'lider', email = emailDe(id);
  store._setup = true;
  const cred = await fb.authM.createUserWithEmailAndPassword(fb.auth, email, senhaDe(id, pin));
  const n = new Date(), mes = mesKey(n.getFullYear(), n.getMonth() + 1), mesAtual = n.getDate() > 15 ? proxMes(mes) : mes;
  const vazio = { liberado: false, encerrado: false, abre: '', fecha: '' };
  const b = fb.fs.writeBatch(fb.db);
  b.set(D('acessos', cred.user.uid), { pid: id, papel: 'master' });
  b.set(D('pessoas', id), { nome, area: 'midia', papel: 'master', foto: '', ativo: true, loginEmail: email, uid: cred.user.uid });
  b.set(D('privado', id), { telefone: '', obs: '', bloq: [] });
  b.set(D('meses', mesAtual), { areas: { midia: { ...vazio }, iluminacao: { ...vazio } } });
  b.set(D('config', 'app'), { mesAtual, ministerio: MINISTERIO, criadoEm: new Date().toISOString() });
  await b.commit();
  // o onAuthStateChanged já disparou antes do lote; recarrega para entrar como líder
  location.reload();
}

export function resetDemo() { ls.del(DKEY); ls.del(PKEY); sess.del(); location.reload(); }
