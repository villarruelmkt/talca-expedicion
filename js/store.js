// --- MODULE: GLOBAL STATE & CORE UTILS ---
var V16_SCHEMA_VERSION = 7;
var session = safeJSON(safeGet(sessionStorage, 'talcaSession'), null);
let db=load();

// --- DEFINICIONES DE STOCK REAL VERIFICADO AL 16 DE OCTUBRE (CIERRE 13:14) ---
const VERIFIED_STOCK_OCT16_1300 = {
  "417": 8466,
  "4900": 63780,
  "4910": 35,
  "5051": 21949,
  "5056": 15108,
  "5061": 25770,
  "5066": 12389,
  "5071": 13549,
  "5200": 6193,
  "5205": 4735,
  "5210": 0,
  "5215": 1968,
  "5220": 3690,
  "5670": 216048,
  "5675": 95004,
  "5680": 112314,
  "5685": 41616,
  "5690": 38016,
  "8670": 15900,
  "8680": 64309,
  "8687": 2423
};
const STOCK_BASELINE_DATE = '2026-10-16T16:14:00.000Z';
const CORRECT_PRODUCT_PACKS = {
  "5051": 12, "5056": 12, "5061": 12, "5066": 12, "5071": 12,
  "8680": 12, "417": 12, "8687": 1
};
const OBSOLETE_PRODUCT_IDS = ['4171', 'BIDON'];

function applyVerifiedStockV38() {
  if (!db) return;
  db.products = (db.products || []).filter(p => !OBSOLETE_PRODUCT_IDS.includes(p.id));
  OBSOLETE_PRODUCT_IDS.forEach(id => {
    if (db.stock && db.stock[id] !== undefined) delete db.stock[id];
    if (db.stockBuckets && db.stockBuckets[id] !== undefined) delete db.stockBuckets[id];
  });
  (db.products || []).forEach(p => {
    if (CORRECT_PRODUCT_PACKS[p.id]) p.pack = CORRECT_PRODUCT_PACKS[p.id];
  });
  if (localStorage.getItem('talca_stock_verified_v38') !== '1') {
    db.stock = Object.assign({}, VERIFIED_STOCK_OCT16_1300);
    OBSOLETE_PRODUCT_IDS.forEach(id => {
      delete db.stock[id];
      if (db.stockBuckets) delete db.stockBuckets[id];
    });
    (db.products || []).forEach(p => {
      if (typeof v1EnsureBucket === 'function') {
        v1EnsureBucket(p.id).physical = db.stock[p.id] || 0;
      }
    });
    safeSet(localStorage, 'talcaExpV02', JSON.stringify(db));
    safeSet(localStorage, 'talca_stock_verified_v38', '1');
  }
}
applyVerifiedStockV38();


// --- MODULE: FIREBASE COLLECTIONS SYNC ---
const APP_BUILD_VERSION = 42;

function isAuthorizedWriter(userObjOrName) {
  if (!userObjOrName) return false;
  let name = '';
  if (typeof userObjOrName === 'string') name = userObjOrName;
  else if (typeof userObjOrName === 'object') {
    name = `${userObjOrName.username || ''} ${userObjOrName.displayName || ''} ${userObjOrName.user || ''}`;
  }
  let norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return norm.includes('pablo') || norm.includes('villarruel') || norm.includes('pvillarruel') ||
         norm.includes('raul') || norm.includes('araoz') || norm.includes('raraoz') ||
         norm.includes('andres') || norm.includes('guaymas') || norm.includes('aguaymas');
}

let hasInitialCloudSync = false;
let hasCollectionsInitialSync = {
  orders: false, movements: false, audit: true, materialMoves: false, counts: false
};
let lastCloudUpdatedAt = null;

function getSyncCutoffDateISO(days = 15) {
  let d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

let lastMasterHashes = {
  fleteros: null,
  stock: null,
  stockBuckets: null,
  employees: null,
  products: null,
  users: null,
  counters: null
};

let lastSyncedDb = {
  orders: new Map(), movements: new Map(), audit: new Map(), materialMoves: new Map(), counts: new Map()
};
function fastHash(obj) {
  if (!obj) return '';
  if (Array.isArray(obj)) return JSON.stringify(obj);
  if (typeof obj === 'object') {
    let sortedKeys = Object.keys(obj).sort();
    let sortedObj = {};
    for (let i = 0; i < sortedKeys.length; i++) {
      let k = sortedKeys[i];
      sortedObj[k] = obj[k];
    }
    return JSON.stringify(sortedObj);
  }
  return String(obj);
}

function mergeList(local, cloud) {
   if (!cloud || !cloud.length) return (local || []).filter(x => !OBSOLETE_PRODUCT_IDS.includes(x.id));
   if (!local || !local.length) return (cloud || []).filter(x => !OBSOLETE_PRODUCT_IDS.includes(x.id));
   let map = new Map((local || []).filter(x => !OBSOLETE_PRODUCT_IDS.includes(x.id)).map(x => [x.id, x]));
   (cloud || []).filter(x => !OBSOLETE_PRODUCT_IDS.includes(x.id)).forEach(x => map.set(x.id, x));
   return Array.from(map.values());
}

docRef.onSnapshot((doc) => {
  isFirebaseReady = true;
  if (doc.exists) {
    let cloudDb = doc.data();

    // REGLA 2: Detección automática de versión obsoleta en cliente con blindaje anti-bucle
    if (cloudDb.appVersion && Number(cloudDb.appVersion) > APP_BUILD_VERSION) {
      let reloadKey = `talca_reload_v${cloudDb.appVersion}`;
      let nowTime = Date.now();
      let lastReload = Number(localStorage.getItem(reloadKey) || sessionStorage.getItem(reloadKey) || 0);

      // Blindaje anti-bucle: Si ya intentó recargar por esta versión en los últimos 60 segundos, NO volver a recargar
      if (lastReload && (nowTime - lastReload < 60000)) {
        console.warn(`Blindaje anti-bucle activo: Ya se intentó actualizar a v${cloudDb.appVersion} hace menos de 60s. Continuando con la versión actual (v${APP_BUILD_VERSION}) para no bloquear la interfaz.`);
      } else {
        localStorage.setItem(reloadKey, String(nowTime));
        sessionStorage.setItem(reloadKey, String(nowTime));
        console.warn(`Versión obsoleta detectada en este equipo (Local: v${APP_BUILD_VERSION}, Nube: v${cloudDb.appVersion}). Actualizando sistema y recargando...`);
        try {
          if (typeof toast === 'function') toast('Nueva versión del sistema disponible. Actualizando...', 'info');
        } catch(e){}
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            for (let r of regs) r.unregister();
          });
        }
        if ('caches' in window) {
          caches.keys().then(names => {
            for (let n of names) caches.delete(n);
          });
        }
        setTimeout(() => {
          location.reload();
        }, 1500);
        return;
      }
    }

    // REGLA 1 & 3: Registro de sincronización inicial y timestamp de la nube
    hasInitialCloudSync = true;
    lastCloudUpdatedAt = cloudDb.updatedAt || null;

    let isFromCache = Boolean(doc.metadata && doc.metadata.fromCache);
    let cloudStock5670 = Number(cloudDb.stock && cloudDb.stock['5670'] || 0);

    // Blindaje de integridad: detectar si la nube tuviese stock desactualizado, pre-16 de Octubre o degradado
    let isPreOct16Stock = !cloudDb.stock || cloudStock5670 < 200000 || cloudDb.stock['4171'] !== undefined || cloudDb.stock['BIDON'] !== undefined;

    if (isPreOct16Stock) {
      console.warn('Blindaje: Stock en Firestore es anterior a la base verificada del 16-Oct. Reconciliando con base + movimientos posteriores...');
      let reconciledStock = Object.assign({}, VERIFIED_STOCK_OCT16_1300);
      OBSOLETE_PRODUCT_IDS.forEach(id => {
        delete reconciledStock[id];
        if (db.stockBuckets) delete db.stockBuckets[id];
      });
      (db.movements || []).forEach(m => {
        if (m.date && m.date > STOCK_BASELINE_DATE && m.productId && !m._deleted) {
          let delta = m.dir === 'in' ? Number(m.total || 0) : -Number(m.total || 0);
          reconciledStock[m.productId] = (Number(reconciledStock[m.productId]) || 0) + delta;
        }
      });
      db.stock = reconciledStock;
      if (!isFromCache && typeof isAuthorizedWriter === 'function' && isAuthorizedWriter(session) && typeof saveStock === 'function') {
        saveStock();
      }
    } else if (isFromCache) {
      // Si la respuesta viene de la caché offline de IndexedDB (por cuota 429 o desconexión),
      // preservar el stock local si ya contiene datos consistentes para no pisarlo con caché congelada
      if (!db.stock || Object.keys(db.stock).length === 0) {
        db.stock = cloudDb.stock;
      } else {
        console.warn('Blindaje de red: Firestore en caché offline (429/sin red). Se preserva el stock local verificado.');
      }
    } else {
      // Stock fresco confirmado por el servidor de Firestore
      db.stock = cloudDb.stock;
      OBSOLETE_PRODUCT_IDS.forEach(id => {
        if (db.stock && db.stock[id] !== undefined) delete db.stock[id];
        if (db.stockBuckets && db.stockBuckets[id] !== undefined) delete db.stockBuckets[id];
      });
    }

    if (cloudDb.stockBuckets && Object.keys(cloudDb.stockBuckets).length > 0) {
      db.stockBuckets = cloudDb.stockBuckets;
      OBSOLETE_PRODUCT_IDS.forEach(id => {
        if (db.stockBuckets && db.stockBuckets[id] !== undefined) delete db.stockBuckets[id];
      });
    }
    // Asegurar que el saldo físico de cada producto en stockBuckets coincida con db.stock
    (db.products || []).forEach(p => {
      if (typeof v1EnsureBucket === 'function') {
        v1EnsureBucket(p.id).physical = db.stock[p.id] || 0;
      }
    });

    if (cloudDb.products && cloudDb.products.length > 0) {
      db.products = mergeList(db.products, cloudDb.products).filter(p => !OBSOLETE_PRODUCT_IDS.includes(p.id));
      (db.products || []).forEach(p => {
        if (CORRECT_PRODUCT_PACKS[p.id]) p.pack = CORRECT_PRODUCT_PACKS[p.id];
      });
    }
    if (cloudDb.fleteros && cloudDb.fleteros.length >= 10) {
      db.fleteros = sortFleteros(cloudDb.fleteros);
    }
    if (cloudDb.employees && cloudDb.employees.length >= 5) {
      db.employees = cloudDb.employees;
    }
    if (cloudDb.users && cloudDb.users.length > 0) {
      db.users = cloudDb.users;
    }
    if (cloudDb.counters) {
      db.counters = cloudDb.counters;
    }
    
    // Respaldo de seguridad local rotativo cada vez que los datos son consistentes
    if ((db.fleteros || []).length >= 10) {
      safeSet(localStorage, 'talcaExp_last_valid_backup', JSON.stringify(db));
    }
    safeSet(localStorage, 'talcaExpV02', JSON.stringify(db));

    // Inicializar hashes de referencia de la nube para el guardado granular
    lastMasterHashes.fleteros = fastHash(db.fleteros);
    lastMasterHashes.stock = fastHash(db.stock);
    lastMasterHashes.stockBuckets = fastHash(db.stockBuckets);
    lastMasterHashes.employees = fastHash(db.employees);
    lastMasterHashes.products = fastHash(db.products);
    lastMasterHashes.users = fastHash(db.users);
    lastMasterHashes.counters = fastHash(db.counters);
  } else {
    // Blindaje crítico: NUNCA crear el documento maestro en la nube si los datos locales son demo o degradados
    let fleterosCount = (db.fleteros || []).length;
    let hasStock = Object.keys(db.stock || {}).length > 0;
    if (fleterosCount >= 10 && hasStock) {
      let clone = { ...db };
      delete clone.audit; delete clone.movements; delete clone.orders; delete clone.materialMoves; delete clone.counts;
      clone.updatedAt = new Date().toISOString();
      clone.appVersion = APP_BUILD_VERSION;
      clone.lastSavedBy = session?.user || 'Sistema';
      docRef.set(clone).catch(console.error);
    } else {
      console.warn('Blindaje: Se bloqueó la creación de talca/data porque los datos locales son insuficientes (fleteros:', fleterosCount, ')');
    }
  }
  try { if(typeof fillLoginUsers === 'function') fillLoginUsers(); } catch(e){}
  try { if(typeof renderAll === 'function') renderAll(); } catch(e){}
}, (err) => {
  console.warn('Alerta Firestore: Error en listener talca/data (posible cuota excedida u offline):', err);
});

function setupCollectionListeners() {
  const cutoff15d = getSyncCutoffDateISO(15);
  const cutoff30d = getSyncCutoffDateISO(30);

  const configs = [
    { col: 'orders', query: firestoreDb.collection('orders').where('date', '>=', cutoff15d) },
    { col: 'movements', query: firestoreDb.collection('movements').where('date', '>=', cutoff15d) },
    { col: 'materialMoves', query: firestoreDb.collection('materialMoves').where('date', '>=', cutoff15d) },
    { col: 'counts', query: firestoreDb.collection('counts').where('date', '>=', cutoff30d) }
  ];

  configs.forEach(({ col, query }) => {
    query.onSnapshot(snap => {
       hasCollectionsInitialSync[col] = true;
       let updated = false;
       snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
             let data = change.doc.data();
             if (data._deleted) {
                db[col] = (db[col]||[]).filter(x => x.id !== data.id);
                lastSyncedDb[col].delete(data.id);
                updated = true;
                return;
             }
             let idx = (db[col]||[]).findIndex(x => x.id === data.id);
             if (idx >= 0) {
                // Blindaje de preservación: Si local ya tiene entregas y el cambio entrante no las tiene (posible eco stale), preservar entregas
                if (col === 'orders' && (db[col][idx].deliveries||[]).length > (data.deliveries||[]).length) {
                   data.deliveries = db[col][idx].deliveries;
                   data.requestLines = db[col][idx].requestLines;
                   if (db[col][idx].status === 'Despachada') data.status = 'Despachada';
                }
                db[col][idx] = data;
             } else {
                db[col] = db[col]||[];
                db[col].push(data);

                // Blindaje reactivo de stock en tiempo real:
                // Si llega un movimiento nuevo de otra máquina, impactar el stock físico local de inmediato
                if (col === 'movements' && change.type === 'added' && !lastSyncedDb[col].has(data.id) && data.productId && data.total && !data._deleted) {
                   if (data.date && typeof STOCK_BASELINE_DATE !== 'undefined' && data.date > STOCK_BASELINE_DATE) {
                      let delta = data.dir === 'in' ? Number(data.total) : -Number(data.total);
                      db.stock[data.productId] = (Number(db.stock[data.productId]) || 0) + delta;
                      if (typeof v1EnsureBucket === 'function') {
                         v1EnsureBucket(data.productId).physical = db.stock[data.productId];
                      }
                      lastMasterHashes.stock = fastHash(db.stock);
                   }
                }
             }
             lastSyncedDb[col].set(data.id, fastHash(data));
             updated = true;
          }
          if (change.type === 'removed') {
             let data = change.doc.data();
             // Blindaje de retención histórica: Solo eliminar si el documento fue explícitamente borrado (_deleted: true),
             // NUNCA si simplemente salió del rango de la consulta temporal de 15 días.
             if (data && data._deleted) {
                db[col] = (db[col]||[]).filter(x => x.id !== data.id);
                lastSyncedDb[col].delete(data.id);
                updated = true;
             }
          }
       });
       if (updated) {
          if(col !== 'orders') db[col].sort((a,b) => new Date(a.date||0) - new Date(b.date||0));
          if (col === 'orders' || col === 'movements') {
             if (typeof autoReconcileDispatchedOrders === 'function') autoReconcileDispatchedOrders();
             if (typeof v1SyncOrderBuckets === 'function') v1SyncOrderBuckets();
          }
          safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
          try{renderAll()}catch(e){}
       }
    }, err => {
       console.warn(`Alerta Firestore: Error en listener de colección ${col}:`, err);
    });
  });
}
setupCollectionListeners();

let lastAuditFetchTime = 0;
let isAuditFetching = false;
function syncAuditOnDemand(force = false) {
  if (!isFirebaseReady || !firestoreDb) return;
  let nowTime = Date.now();
  if (!force && (nowTime - lastAuditFetchTime < 30000)) {
    return;
  }
  if (isAuditFetching) return;
  isAuditFetching = true;
  lastAuditFetchTime = nowTime;

  let auditBody = document.getElementById('auditBody');
  if (auditBody && (!db.audit || db.audit.length === 0)) {
    auditBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#6b7280;">Sincronizando últimos 50 registros de auditoría...</td></tr>';
  }

  firestoreDb.collection('audit')
    .orderBy('date', 'desc')
    .limit(50)
    .get()
    .then(snap => {
      isAuditFetching = false;
      let remoteItems = [];
      snap.forEach(doc => {
        let data = doc.data();
        if (data && !data._deleted) {
          remoteItems.push(data);
          lastSyncedDb.audit.set(data.id, fastHash(data));
        }
      });
      if (remoteItems.length > 0) {
        let map = new Map((db.audit || []).map(x => [x.id, x]));
        remoteItems.forEach(x => map.set(x.id, x));
        db.audit = Array.from(map.values()).sort((a,b) => new Date(a.date||0) - new Date(b.date||0));
        if (db.audit.length > 100) {
          db.audit = db.audit.slice(-100);
        }
        safeSet(localStorage, 'talcaExpV02', JSON.stringify(db));
        if (typeof renderAll === 'function') renderAll();
      }
    })
    .catch(err => {
      isAuditFetching = false;
      console.warn('Alerta Firestore: Error al sincronizar auditoría bajo demanda:', err);
    });
}
window.syncAuditOnDemand = syncAuditOnDemand;

// Blindaje contra saturación de cuota:
// Se eliminó la re-escritura masiva de colecciones a los 5 segundos que provocaba agotamiento de cuota diaria (Error 429).
// La sincronización en tiempo real es manejada de forma eficiente por los listeners y save().

session=safeJSON(safeGet(sessionStorage,'talcaSession'),null);

function save(){
 db.schemaVersion = V16_SCHEMA_VERSION;
 if (typeof v1SyncOrderBuckets === 'function') {
   try { v1SyncOrderBuckets(); } catch(e) { console.warn('v1SyncOrderBuckets diferido:', e); }
 }
 (db.products||[]).forEach(p=>v1EnsureBucket(p.id));
 safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
 
 // Si los datos locales son ricos, renovar el respaldo de emergencia
 if ((db.fleteros || []).length >= 10) {
   safeSet(localStorage, 'talcaExp_last_valid_backup', JSON.stringify(db));
 }
 
 if (isFirebaseReady) {
   // REGLA DE SEGURIDAD: Solo usuarios autorizados (Andrés, Raúl, Pablo) tienen permisos de escritura en la nube
   if (!isAuthorizedWriter(session)) {
     console.warn('Acceso denegado: El usuario activo está en modo SOLO LECTURA. No se suben cambios a Firestore.');
     try{renderAll()}catch(err){}
     return;
   }

   // REGLA 3: Bloquear cualquier subida a Firestore si aún no se recibió la sincronización inicial de talca/data
   if (!hasInitialCloudSync) {
     console.warn('Guardado en Firestore en pausa: esperando sincronización inicial desde la nube...');
     return;
   }

    const cutoff15d = getSyncCutoffDateISO(15);
    // Diff & Sync: Solo subimos a colecciones los items modificados o nuevos
    ['orders', 'movements', 'materialMoves', 'counts'].forEach(col => {
       // Blindaje: NUNCA subir a Firestore si esta colección específica no ha recibido su primer snapshot de la nube
       if (!hasCollectionsInitialSync[col]) {
          return;
       }
       let currentIds = new Set();
       (db[col] || []).forEach(item => {
          if (!item.id) return;
          currentIds.add(item.id);
          let hash = fastHash(item);

          // Blindaje histórico: Si el item es anterior a los últimos 15 días y no está registrado en lastSyncedDb,
          // proviene del historial local de localStorage. Lo registramos en lastSyncedDb para evitar re-subir
          // documentos antiguos a Firestore innecesariamente.
          if (!lastSyncedDb[col].has(item.id) && item.date && item.date < cutoff15d) {
             lastSyncedDb[col].set(item.id, hash);
             return;
          }

          // Blindaje contra degradación de órdenes:
          // Si la orden local no tiene entregas o está en PENDIENTE, pero en la nube ya estaba despachada o con entregas,
          // NO sobreescribir la versión de la nube con la versión local degradada.
          if (col === 'orders') {
             let lastSyncedHash = lastSyncedDb[col].get(item.id);
             if (lastSyncedHash) {
                try {
                   let lastSyncedObj = JSON.parse(lastSyncedHash);
                   let remoteHasDeliveries = Boolean((lastSyncedObj.deliveries || []).length);
                   let localHasDeliveries = Boolean((item.deliveries || []).length);
                   let remoteIsDispatched = lastSyncedObj.status === 'Despachada' || lastSyncedObj.status === 'Completa';
                   let localIsPending = item.status === 'PENDIENTE' || item.status === 'Pendiente de despacho';
                   if ((remoteHasDeliveries && !localHasDeliveries) || (remoteIsDispatched && localIsPending)) {
                      console.warn(`Blindaje de orden: Se bloqueó sobreescritura de orden N.° ${item.number} con estado local degradado.`);
                      return;
                   }
                } catch(e){}
             }
          }

          if (lastSyncedDb[col].get(item.id) !== hash) {
             firestoreDb.collection(col).doc(item.id).set(item).catch(console.error);
             lastSyncedDb[col].set(item.id, hash);
          }
       });
       
       for (let id of lastSyncedDb[col].keys()) {
          if (!currentIds.has(id)) {
             let dRef = firestoreDb.collection(col).doc(id);
             dRef.set({ _deleted: true }, { merge: true }).catch(console.error);
             lastSyncedDb[col].delete(id);
          }
       }
    });

    // Sincronización saliente de auditoría (solo los eventos recientes de la sesión activa para evitar subir histórico)
    if (isFirebaseReady && firestoreDb && isAuthorizedWriter(session)) {
      (db.audit || []).slice(-15).forEach(entry => {
        if (entry && entry.id && !lastSyncedDb.audit.has(entry.id)) {
          let hash = fastHash(entry);
          firestoreDb.collection('audit').doc(entry.id).set(entry).catch(console.error);
          lastSyncedDb.audit.set(entry.id, hash);
        }
      });
    }

   // CAMINO A: Guardado granular y desacoplado mediante diffing de campos en talca/data
    let updatePayload = {};

    let currentFleterosHash = fastHash(db.fleteros);
    if (lastMasterHashes.fleteros !== null && currentFleterosHash !== lastMasterHashes.fleteros && (db.fleteros || []).length >= 10) {
      updatePayload.fleteros = db.fleteros;
      lastMasterHashes.fleteros = currentFleterosHash;
    }

    // DESACOPLE CRÍTICO: stock físico y stockBuckets se evalúan por separado.
    // Si un usuario administrativo solo carga órdenes o modifica reservas, SOLO se envían buckets;
    // NUNCA se empaqueta ni pisa el stock físico del galpón.
    let currentStockHash = fastHash(db.stock);
    if (lastMasterHashes.stock !== null && currentStockHash !== lastMasterHashes.stock) {
      if (db.stock && Object.keys(db.stock).length > 0) {
        updatePayload.stock = db.stock;
        lastMasterHashes.stock = currentStockHash;
      }
    }

    let currentBucketsHash = fastHash(db.stockBuckets);
    if (lastMasterHashes.stockBuckets !== null && currentBucketsHash !== lastMasterHashes.stockBuckets) {
      if (db.stockBuckets && Object.keys(db.stockBuckets).length > 0) {
        updatePayload.stockBuckets = db.stockBuckets;
        lastMasterHashes.stockBuckets = currentBucketsHash;
      }
    }

    let currentEmployeesHash = fastHash(db.employees);
    if (lastMasterHashes.employees !== null && currentEmployeesHash !== lastMasterHashes.employees && (db.employees || []).length >= 5) {
      updatePayload.employees = db.employees;
      lastMasterHashes.employees = currentEmployeesHash;
    }

    let currentProductsHash = fastHash(db.products);
    if (lastMasterHashes.products !== null && currentProductsHash !== lastMasterHashes.products && (db.products || []).length > 0) {
      updatePayload.products = db.products;
      lastMasterHashes.products = currentProductsHash;
    }

    let currentUsersHash = fastHash(db.users);
    if (lastMasterHashes.users !== null && currentUsersHash !== lastMasterHashes.users && (db.users || []).length > 0) {
      updatePayload.users = db.users;
      lastMasterHashes.users = currentUsersHash;
    }

    let currentCountersHash = fastHash(db.counters);
    if (lastMasterHashes.counters !== null && currentCountersHash !== lastMasterHashes.counters && db.counters) {
      updatePayload.counters = db.counters;
      lastMasterHashes.counters = currentCountersHash;
    }

    // Solo escribir a Firestore si realmente cambió algún campo maestro
    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updatedAt = new Date().toISOString();
      updatePayload.appVersion = APP_BUILD_VERSION;
      updatePayload.lastSavedBy = (session && session.user && (session.user.displayName || session.user.username || session.user.email)) || (typeof session?.user === 'string' ? session.user : 'Desconocido');
      lastCloudUpdatedAt = updatePayload.updatedAt;

      docRef.set(updatePayload, { merge: true }).catch(err => {
        console.warn('Error al actualizar campos parciales en talca/data:', err);
      });
    }
 }
 
 try{renderAll()}
 catch(err){
   console.error('Error al actualizar la interfaz:',err);
 }
}
function now(){return new Date().toISOString()}
function fmtDate(x){if(typeof x==='string'&&x.length===10&&x.indexOf('-')===4){let [y,m,d]=x.split('-');return `${d}/${m}/${y}`}return new Date(x).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}
function uid(p='id'){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function fillLoginUsers(){
 let select=document.getElementById('loginUser');if(!select)return;
 let users=(db.users&&db.users.length?db.users:[]).filter(u=>u.active!==false);
 if(users.length)select.innerHTML=users.map(u=>`<option value="${u.id}">${u.displayName} (${u.username})</option>`).join('');
}
function doLogin(){
 let userEl=document.getElementById('loginUser');
 let passwordEl=document.getElementById('loginPassword');
 let shiftEl=document.getElementById('loginShift');
 let users=(db.users&&db.users.length?db.users:[]);
 let u=users.find(x=>x.id===userEl.value&&x.active!==false);
 if(!u||u.password!==passwordEl.value)return alert('Usuario o clave incorrectos.');
 session={userId:u.id,user:u.displayName,username:u.username,shift:shiftEl.value};
 safeSet(sessionStorage,'talcaSession',JSON.stringify(session));start()
}
function logout(){safeRemove(sessionStorage,'talcaSession');location.reload()}
function changeShift(){
  modal(`<div class="headrow"><div><h2>Cambiar turno</h2><div class="muted">Seleccione el turno activo.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><select id="shiftSelect" class="field"><option value="Mañana" ${session.shift==='Mañana'?'selected':''}>Mañana</option><option value="Tarde" ${session.shift==='Tarde'?'selected':''}>Tarde</option></select></div><div class="right"><button class="btn btn-primary" onclick="confirmShift()">Guardar</button></div>`);
  window.confirmShift = function() {
    session.shift = document.getElementById('shiftSelect').value;
    safeSet(sessionStorage,'talcaSession',JSON.stringify(session));
    closeModal();
    start();
  };
}
function start(){
  login.classList.add('hidden');
  app.classList.remove('hidden');
  let isReadOnly = !isAuthorizedWriter(session);
  let roleBadge = isReadOnly 
    ? ' <span style="background:#f59e0b;color:#000;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle;">SOLO LECTURA</span>'
    : ' <span style="background:#10b981;color:#fff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle;">ACCESO TOTAL</span>';
  sessionBadge.innerHTML = session.user + ' · ' + session.shift + roleBadge;
  todayText.textContent = new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  renderAll();
}
document.addEventListener('DOMContentLoaded',()=>{
 fillLoginUsers();
 let warning=document.getElementById('mobileFileWarning');
 if(warning&&location.protocol==='file:'&&/iPhone|iPad|iPod/i.test(navigator.userAgent))warning.classList.remove('hidden');
 if(session)start();
 
 window.addEventListener('offline', () => {
   let banner = document.getElementById('offlineBanner');
   if (banner) banner.classList.remove('hidden');
 });
 window.addEventListener('online', () => {
   let banner = document.getElementById('offlineBanner');
   if (banner) banner.classList.add('hidden');
 });

 document.addEventListener('click', (e) => {
   let t = e.target.closest('button, a.btn');
   if (!t) return;

   if (session && !isAuthorizedWriter(session)) {
     let text = (t.innerText || t.textContent || '').toLowerCase();
     let isWhitelisted = text.includes('cerrar') || text.includes('cancelar') || 
                         text.includes('imprimir') || text.includes('ver') || 
                         text.includes('exportar') || text.includes('filtro') || 
                         text.includes('limpiar') || t.classList.contains('navbtn') ||
                         t.id === 'stockUnitToggle';
     let isAction = text.includes('guardar') || text.includes('confirmar') || 
                    text.includes('generar') || text.includes('despachar') || 
                    text.includes('eliminar') || text.includes('anular') || 
                    text.includes('agregar') || text.includes('ajuste') ||
                    text.includes('nueva orden') || text.includes('modificar') ||
                    text.includes('cambiar turno') || text.includes('calibrar') ||
                    text.includes('reconciliar');
     if (isAction && !isWhitelisted) {
       e.stopPropagation();
       e.preventDefault();
       alert('Acceso restringido: Tu usuario está configurado en modo SOLO LECTURA. Solo Andrés Guaymas, Raúl Araoz y Pablo Villarruel tienen permisos de modificación.');
       return;
     }
   }

   if (!navigator.onLine) {
     let text = (t.innerText || t.textContent || '').toLowerCase();
     if (text.includes('guardar') || text.includes('confirmar') || text.includes('generar') || text.includes('despachar')) {
       e.stopPropagation();
       e.preventDefault();
       alert('Acción bloqueada preventivamente: No tienes conexión a internet. Espera a que desaparezca el cartel rojo para evitar sobreescribir y perder datos de otros usuarios.');
     }
   }
 }, true);

 document.addEventListener('wheel', (e) => {
   if (document.activeElement && document.activeElement.type === 'number') {
     document.activeElement.blur();
   }
 });

 document.addEventListener('keydown', (e) => {
   if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
     let focusable = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea, button:not(.navbtn)'))
       .filter(el => !el.disabled && el.offsetParent !== null);
     let index = focusable.indexOf(e.target);
     if (index > -1 && index + 1 < focusable.length) {
       e.preventDefault();
       focusable[index + 1].focus();
       if(focusable[index + 1].select) focusable[index + 1].select();
     }
   }
 });
});
document.querySelectorAll('.navbtn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
function showPage(id){
  if(id!=='employees'&&typeof currentPrintKind!=='undefined'&&currentPrintKind==='receipt'){
    currentPrintBody='';
    currentPrintTitle='';
    currentPrintKind='report';
    let p=document.getElementById('printArea');if(p)p.innerHTML='';
  }
  document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
  if (id === 'audit') {
    syncAuditOnDemand();
  }
  renderAll();
}
function modal(content){
 let dialogEl=document.getElementById('dialog');
 let modalEl=document.getElementById('modal');
 if(!dialogEl||!modalEl){
   alert('No se pudo abrir el comprobante por un error de interfaz.');
   return;
 }
 dialogEl.innerHTML=content;
 modalEl.classList.remove('hidden');
}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
document.getElementById('modal').onclick=e=>{if(e.target.id==='modal')closeModal()}
window.addEventListener('beforeprint',()=>{if(currentPrintBody)renderPrintArea()});
window.addEventListener('afterprint',()=>{let a=document.getElementById('printArea');if(a)a.innerHTML=''});
function productOptions(){return db.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${p.id} · ${p.name}</option>`).join('')}
function fleteroOptions(){
  let active = (db.fleteros || []).filter(f => f.active !== false);
  return sortFleteros(active).map(f => {
    let fullName = `${f.name}${f.surname ? ' ' + f.surname : ''}`.trim();
    return `<option value="${f.id}">${fullName}</option>`;
  }).join('');
}
function employeeOptions(){return db.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${e.legajo} · ${e.name} ${e.surname}</option>`).join('')}
function normalize(packs,units,prod){let total=Number(packs||0)*prod.pack+Number(units||0);return {total,packs:Math.floor(total/prod.pack),units:total%prod.pack}}
var v1StockUnit = 'fardos';
function toggleStockUnit() {
  v1StockUnit = v1StockUnit === 'fardos' ? 'pallets' : 'fardos';
  let btn = document.getElementById('stockUnitToggle');
  if (btn) btn.innerText = v1StockUnit === 'fardos' ? 'Ver en Pallets' : 'Ver en Fardos';
  if(typeof renderStockV1 === 'function') renderStockV1();
}
function equivalent(total, prod) {
  if (!prod || !prod.pack) return `${total} un.`;
  if (typeof v1StockUnit !== 'undefined' && v1StockUnit === 'pallets') {
    let perPallet = prod.pack * (prod.perCut || 20) * (prod.cuts || 4);
    if (perPallet > 0) {
      let pallets = Math.floor(total / perPallet);
      let rem = total % perPallet;
      let fardos = Math.floor(rem / prod.pack);
      let un = rem % prod.pack;
      let parts = [];
      if (pallets > 0) parts.push(`${pallets} pl`);
      if (fardos > 0) parts.push(`${fardos} fardos`);
      if (un > 0) parts.push(`${un} un.`);
      return parts.join(' + ') || '0 fardos';
    }
  }
  return `${Math.floor(total/prod.pack)} fardos${total%prod.pack?' + '+total%prod.pack+' un.':''}`;
}
function audit(action,entity,ref,detail=''){
  db.audit=db.audit||[];
  let entry = {
    id: uid('a'),
    date: now(),
    user: session?.user || 'Sistema',
    action,
    entity,
    ref,
    detail
  };
  db.audit.push(entry);
  if (isFirebaseReady && firestoreDb && isAuthorizedWriter(session)) {
    let hash = fastHash(entry);
    firestoreDb.collection('audit').doc(entry.id).set(entry).catch(console.error);
    lastSyncedDb.audit.set(entry.id, hash);
  }
}

// Auto-repair: Eliminar movimientos de materiales con fleteroId inválido
setTimeout(() => {
  if (typeof db !== 'undefined' && db.materialMoves && (db.fleteros || []).length >= 10) {
    let originalLength = db.materialMoves.length;
    db.materialMoves = db.materialMoves.filter(m => {
      return db.fleteros.some(f => f.id === m.fleteroId);
    });
    if (db.materialMoves.length !== originalLength) {
      if (typeof save === 'function') save();
      if (document.getElementById('materialsTotals')) {
        if (typeof window.renderMaterials === 'function') window.renderMaterials();
        else if (typeof window.renderMaterialsV11 === 'function') window.renderMaterialsV11();
      }
    }
  }
}, 3500);

// Blindaje de auto-reconciliación proactiva: Reconciliar órdenes que tienen salidas confirmadas
function autoReconcileDispatchedOrders() {
  if (!db || !db.orders || !db.movements) return;
  let modified = false;
  let movesByRef = new Map();
  (db.movements || []).forEach(m => {
    if (m.ref && String(m.type || '').includes('Orden') && m.dir === 'out') {
      if (!movesByRef.has(m.ref)) movesByRef.set(m.ref, []);
      movesByRef.get(m.ref).push(m);
    }
  });

  (db.orders || []).forEach(o => {
    if (!o || !o.number) return;
    let moves = movesByRef.get(o.number) || [];
    let delCount = (o.deliveries || []).length;
    
    // Si la orden ya tiene entregas pero status quedó en PENDIENTE o outstanding es 0
    if (Array.isArray(o.requestLines) && delCount > 0 && o.status === 'PENDIENTE') {
      let req = o.requestLines.reduce((s, l) => s + Number(l.total || 0), 0);
      let res = o.requestLines.reduce((s, l) => s + Math.min(Number(l.total || 0), Number(l.resolvedTotal || 0)), 0);
      if (req - res <= 0) {
        o.status = 'Despachada';
        modified = true;
      }
    }

    // Si tiene movimientos de salida registrados pero no tiene entregas cargadas
    if (moves.length > 0 && delCount === 0) {
      let firstMove = moves[0];
      let delLines = moves.map(m => ({ productId: m.productId, sourceProductId: m.productId, total: m.total }));
      o.deliveries = [{
        id: uid('d'),
        date: firstMove.date || now(),
        lines: delLines,
        result: 'Salida confirmada',
        note: 'Reconciliación de salida confirmada',
        user: firstMove.user || 'Encargado',
        shift: firstMove.shift || 'Mañana'
      }];
      if (Array.isArray(o.requestLines)) {
        let moveQty = {};
        moves.forEach(m => { moveQty[m.productId] = (moveQty[m.productId] || 0) + m.total; });
        o.requestLines.forEach(l => {
          let delivered = moveQty[l.productId] || l.total;
          l.resolvedTotal = Math.min(Number(l.total || 0), delivered);
        });
      }
      o.status = 'Despachada';
      modified = true;
    }
  });

  if (modified) {
    safeSet(localStorage, 'talcaExpV02', JSON.stringify(db));
  }
}
autoReconcileDispatchedOrders();

window.saveFleteros = function() {
  if (typeof lastMasterHashes !== 'undefined') lastMasterHashes.fleteros = '';
  save();
};
window.saveStock = function() {
  if (typeof lastMasterHashes !== 'undefined') lastMasterHashes.stock = '';
  save();
};
window.saveEmployees = function() {
  if (typeof lastMasterHashes !== 'undefined') lastMasterHashes.employees = '';
  save();
};
