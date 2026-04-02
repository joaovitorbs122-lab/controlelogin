/* ═══════════════════════════════════════════════════════
   Controle de Estudo — db.js  (Firestore wrapper)
   Substitui IndexedDB por Firebase Firestore.
   Dados ficam na nuvem e sincronizam entre dispositivos.
   ═══════════════════════════════════════════════════════ */

// O Firestore e o uid do usuário são injetados pelo index.html
// após o login, via window.__firestoreDB e window.__currentUID

function _fs()  { return window.__firestoreDB; }
function _uid() { return window.__currentUID;  }

function _col(store) {
  const { collection } = window.__fsLib;
  return collection(_fs(), 'usuarios', _uid(), store);
}

/* ─── openDB: compatibilidade — não faz nada no Firestore ─── */
function openDB() {
  return Promise.resolve(true);
}

/* ─── dbSave ─── */
async function dbSave(store, obj) {
  const { doc, setDoc, addDoc, updateDoc } = window.__fsLib;

  if (store === 'config') {
    const ref = doc(_fs(), 'usuarios', _uid(), store, obj.key);
    await setDoc(ref, obj);
    return obj.key;
  }

  if (obj.id) {
    const ref = doc(_fs(), 'usuarios', _uid(), store, String(obj.id));
    await setDoc(ref, obj);
    return obj.id;
  } else {
    const ref = await addDoc(_col(store), obj);
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  }
}

/* ─── dbGetAll ─── */
async function dbGetAll(store) {
  const { getDocs } = window.__fsLib;
  const snap = await getDocs(_col(store));
  return snap.docs.map(d => d.data());
}

/* ─── dbGet ─── */
async function dbGet(store, id) {
  const { doc, getDoc } = window.__fsLib;
  const ref  = doc(_fs(), 'usuarios', _uid(), store, String(id));
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : undefined;
}

/* ─── dbDelete ─── */
async function dbDelete(store, id) {
  const { doc, deleteDoc } = window.__fsLib;
  const ref = doc(_fs(), 'usuarios', _uid(), store, String(id));
  await deleteDoc(ref);
}

/* ─── dbExportAll ─── */
async function dbExportAll() {
  const stores = ['simulados','enem','fuvest','revisoes','erros','config',
                  'redacoes_enem','redacoes_gerais','repertorios','simulados_discursivos'];
  const data = {};
  for (const s of stores) { data[s] = await dbGetAll(s); }
  return data;
}

/* ─── dbImportAll ─── */
async function dbImportAll(data) {
  const stores = ['simulados','enem','fuvest','revisoes','erros','config',
                  'redacoes_enem','redacoes_gerais','repertorios','simulados_discursivos'];
  const { doc, deleteDoc, getDocs } = window.__fsLib;

  for (const s of stores) {
    if (!data[s]) continue;
    const snap = await getDocs(_col(s));
    for (const d of snap.docs) { await deleteDoc(d.ref); }
    for (const item of data[s]) { await dbSave(s, item); }
  }
}
