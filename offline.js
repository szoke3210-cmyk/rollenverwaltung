(function () {
  const DB_NAME = "saveline-offline-db";
  const DB_VERSION = 1;
  const STATUS_ID = "connectionStatus";
  let syncing = false;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("records")) {
          const store = db.createObjectStore("records", { keyPath: "key" });
          store.createIndex("table", "table", { unique: false });
        }
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transaction(storeName, mode, callback) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try { result = callback(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function recordKey(table, id) {
    return `${table}:${String(id)}`;
  }

  function getTable(path) {
    return String(path || "").split("?")[0].replace(/^\/+/, "");
  }

  function parsePath(path) {
    const [tablePart, query = ""] = String(path).split("?");
    return { table: tablePart.replace(/^\/+/, ""), params: new URLSearchParams(query) };
  }

  function decodeEq(value) {
    return String(value ?? "").replace(/^eq\./, "");
  }

  function valuesEqual(a, b) {
    if (a == null && b == null) return true;
    return String(a) === String(b);
  }

  function matchesParams(row, params) {
    for (const [field, raw] of params.entries()) {
      if (["select", "order", "limit", "offset"].includes(field)) continue;
      if (raw.startsWith("eq.")) {
        if (!valuesEqual(row[field], decodeEq(raw))) return false;
      }
    }
    return true;
  }

  async function getAllRecords(table) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("records", "readonly");
      const index = tx.objectStore("records").index("table");
      const req = index.getAll(IDBKeyRange.only(table));
      req.onsuccess = () => resolve(req.result.map(item => item.data));
      req.onerror = () => reject(req.error);
    });
  }

  async function putRecord(table, row) {
    if (!row || row.id == null) return;
    await transaction("records", "readwrite", store => {
      store.put({ key: recordKey(table, row.id), table, id: row.id, data: row });
    });
  }

  async function deleteRecord(table, id) {
    await transaction("records", "readwrite", store => store.delete(recordKey(table, id)));
  }

  async function replaceTable(table, rows) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      const store = tx.objectStore("records");
      const index = store.index("table");
      const cursorReq = index.openCursor(IDBKeyRange.only(table));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      rows.forEach(row => {
        if (row?.id != null) store.put({ key: recordKey(table, row.id), table, id: row.id, data: row });
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function isFullTableQuery(params) {
    const filterKeys = [...params.keys()].filter(k => !["select", "order", "limit", "offset"].includes(k));
    return filterKeys.length === 0;
  }

  async function cacheGet(path, rows) {
    const { table, params } = parsePath(path);
    if (!Array.isArray(rows) || !table) return;
    if (isFullTableQuery(params)) await replaceTable(table, rows);
    else for (const row of rows) await putRecord(table, row);
    await setMeta("lastCache", new Date().toISOString());
  }

  async function localGet(path) {
    const { table, params } = parsePath(path);
    let rows = await getAllRecords(table);
    rows = rows.filter(row => matchesParams(row, params));

    const order = params.get("order");
    if (order) {
      const [field, direction = "asc"] = order.split(",")[0].split(".");
      rows.sort((a, b) => {
        const av = a[field] ?? "";
        const bv = b[field] ?? "";
        const result = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "de", { numeric: true });
        return direction === "desc" ? -result : result;
      });
    }

    const offset = Number(params.get("offset") || 0);
    const limit = Number(params.get("limit") || 0);
    if (offset) rows = rows.slice(offset);
    if (limit) rows = rows.slice(0, limit);

    const select = params.get("select");
    if (select && select !== "*") {
      const fields = select.split(",").map(x => x.trim()).filter(Boolean);
      rows = rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    }
    return rows;
  }

  async function nextTempId() {
    const current = Number(await getMeta("tempId")) || -1;
    const next = current - 1;
    await setMeta("tempId", next);
    return current;
  }

  async function applyLocalMutation(path, options = {}) {
    const { table, params } = parsePath(path);
    const method = String(options.method || "GET").toUpperCase();
    let body = options.body ? JSON.parse(options.body) : null;

    if (method === "POST") {
      const inputRows = Array.isArray(body) ? body : [body];
      const result = [];
      for (const original of inputRows) {
        const row = { ...original };
        if (row.id == null) row.id = await nextTempId();
        if (row.datum == null && ["historie", "aktivitaet", "qr_bemerkungen"].includes(table)) {
          row.datum = new Date().toISOString();
        }
        await putRecord(table, row);
        result.push(row);
      }
      return result;
    }

    const matching = (await getAllRecords(table)).filter(row => matchesParams(row, params));
    if (method === "PATCH") {
      const result = [];
      for (const row of matching) {
        const updated = { ...row, ...body };
        await putRecord(table, updated);
        result.push(updated);
      }
      return result;
    }
    if (method === "DELETE") {
      for (const row of matching) await deleteRecord(table, row.id);
      return [];
    }
    return [];
  }

  async function queueMutation(path, options, localResult) {
    await transaction("queue", "readwrite", store => {
      store.add({
        path,
        method: String(options.method || "POST").toUpperCase(),
        body: options.body || null,
        headers: options.headers || {},
        tempResult: localResult || [],
        createdAt: new Date().toISOString(),
        attempts: 0
      });
    });
    await updateConnectionStatus();
  }

  async function getQueue() {
    const db = await openDb();
    return requestPromise(db.transaction("queue", "readonly").objectStore("queue").getAll());
  }

  async function removeQueueItem(id) {
    await transaction("queue", "readwrite", store => store.delete(id));
  }

  async function updateQueueItem(item) {
    await transaction("queue", "readwrite", store => store.put(item));
  }

  async function setMeta(key, value) {
    await transaction("meta", "readwrite", store => store.put({ key, value }));
  }

  async function getMeta(key) {
    const db = await openDb();
    const result = await requestPromise(db.transaction("meta", "readonly").objectStore("meta").get(key));
    return result?.value;
  }

  async function getMappings() {
    return (await getMeta("tempMappings")) || {};
  }

  function replaceMappedValues(value, mappings) {
    if (Array.isArray(value)) return value.map(v => replaceMappedValues(v, mappings));
    if (value && typeof value === "object") {
      const copy = {};
      for (const [key, val] of Object.entries(value)) copy[key] = replaceMappedValues(val, mappings);
      return copy;
    }
    return mappings[String(value)] ?? value;
  }

  function mapPath(path, mappings) {
    let result = path;
    for (const [temp, real] of Object.entries(mappings)) {
      result = result.replaceAll(`eq.${temp}`, `eq.${real}`);
    }
    return result;
  }

  async function remapLocalId(table, tempId, realRow) {
    await deleteRecord(table, tempId);
    await putRecord(table, realRow);
  }

  async function syncQueue() {
    if (syncing || !navigator.onLine) return { synced: 0, pending: (await getQueue()).length };
    const token = window.accessToken || accessToken;
    if (!token) return { synced: 0, pending: (await getQueue()).length };

    syncing = true;
    let synced = 0;
    try {
      const items = (await getQueue()).sort((a, b) => a.id - b.id);
      let mappings = await getMappings();

      for (const item of items) {
        try {
          const mappedPath = mapPath(item.path, mappings);
          let parsedBody = item.body ? JSON.parse(item.body) : null;
          parsedBody = replaceMappedValues(parsedBody, mappings);
          const response = await fetch(`${SUPABASE_URL}/rest/v1/${mappedPath}`, {
            method: item.method,
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
              ...(item.headers || {})
            },
            body: parsedBody == null ? undefined : JSON.stringify(parsedBody)
          });

          if (!response.ok) {
            item.attempts = (item.attempts || 0) + 1;
            item.lastError = await response.text();
            await updateQueueItem(item);
            console.error("Offline-Synchronisierung fehlgeschlagen:", item.lastError);
            break;
          }

          const text = await response.text();
          const serverRows = text ? JSON.parse(text) : [];
          const table = getTable(item.path);

          if (item.method === "POST" && item.tempResult?.length && serverRows?.length) {
            for (let i = 0; i < Math.min(item.tempResult.length, serverRows.length); i++) {
              const tempId = item.tempResult[i]?.id;
              const realId = serverRows[i]?.id;
              if (Number(tempId) < 0 && realId != null) {
                mappings[String(tempId)] = realId;
                await remapLocalId(table, tempId, serverRows[i]);
              } else if (serverRows[i]?.id != null) {
                await putRecord(table, serverRows[i]);
              }
            }
            await setMeta("tempMappings", mappings);
          } else if (Array.isArray(serverRows)) {
            for (const row of serverRows) await putRecord(table, row);
          }

          await removeQueueItem(item.id);
          synced++;
        } catch (error) {
          item.attempts = (item.attempts || 0) + 1;
          item.lastError = error.message;
          await updateQueueItem(item);
          break;
        }
      }
    } finally {
      syncing = false;
      await updateConnectionStatus();
    }
    return { synced, pending: (await getQueue()).length };
  }

  function ensureStatusElement() {
    let element = document.getElementById(STATUS_ID);
    if (element) return element;
    element = document.createElement("div");
    element.id = STATUS_ID;
    element.className = "connection-status";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.title = "Klicken, um Offline-Daten zu aktualisieren";
    element.tabIndex = 0;
    const triggerRefresh = async () => {
      if (!navigator.onLine) return;
      try {
        await refreshAllData();
      } catch (error) {
        console.error(error);
        await updateConnectionStatus("Online · Aktualisierung fehlgeschlagen");
      }
    };
    element.addEventListener("click", triggerRefresh);
    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") triggerRefresh();
    });
    document.body.appendChild(element);
    return element;
  }

  async function updateConnectionStatus(extraText = "") {
    const element = ensureStatusElement();
    const online = navigator.onLine;
    const pending = (await getQueue().catch(() => [])).length;
    let text = online ? (extraText || "Online") : "Offline";
    if (pending) text += ` · ${pending} Änderung${pending === 1 ? "" : "en"} wartet`;
    element.textContent = text;
    element.classList.toggle("is-online", online);
    element.classList.toggle("is-offline", !online);
    element.classList.toggle("has-pending", pending > 0);
    document.documentElement.classList.toggle("app-offline", !online);
  }


  const FULL_SYNC_TABLES = [
    { name: "rollen", important: true },
    { name: "kunden", important: false },
    { name: "historie", important: false },
    { name: "qr_bemerkungen", important: false },
    { name: "aktivitaet", important: false }
  ];

  async function fetchWholeTable(table, token) {
    const pageSize = 1000;
    const allRows = [];

    for (let offset = 0; ; offset += pageSize) {
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${pageSize}&offset=${offset}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(url, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
          },
          cache: "no-store",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`${table}: ${response.status} ${message}`);
      }

      const rows = await response.json();
      allRows.push(...rows);
      if (rows.length < pageSize) break;
    }

    return allRows;
  }

  async function getCurrentToken() {
    if (typeof accessToken !== "undefined" && accessToken) return accessToken;
    try {
      const { data } = await supabaseClient.auth.getSession();
      return data?.session?.access_token || null;
    } catch (_) {
      return null;
    }
  }

  async function refreshAllData(options = {}) {
    if (!navigator.onLine) return { updated: false, offline: true };

    const token = await getCurrentToken();
    if (!token) {
      await updateConnectionStatus("Online · Anmeldung für Offline-Daten fehlt");
      return { updated: false, noSession: true };
    }

    const quiet = options.quiet === true;
    if (!quiet) await updateConnectionStatus("Online · Daten werden aktualisiert…");

    const counts = {};
    const errors = [];

    await syncQueue();

    for (const tableInfo of FULL_SYNC_TABLES) {
      try {
        const rows = await fetchWholeTable(tableInfo.name, token);
        // Csak sikeres, teljes lekérés után cseréljük le a helyi táblát.
        await replaceTable(tableInfo.name, rows);
        counts[tableInfo.name] = rows.length;
      } catch (error) {
        errors.push({ table: tableInfo.name, message: error.message });
        console.warn(`Tabelle ${tableInfo.name} konnte nicht gespeichert werden:`, error);
      }
    }

    const rollenCount = counts.rollen;
    const now = new Date().toISOString();
    await setMeta("lastFullSync", now);
    await setMeta("lastFullSyncCounts", counts);
    await setMeta("lastFullSyncErrors", errors);

    if (!quiet) {
      if (typeof rollenCount === "number") {
        await updateConnectionStatus(`Online · Offline-Daten aktuell (${rollenCount} Rollen)`);
      } else {
        const localRollen = await getAllRecords("rollen").catch(() => []);
        await updateConnectionStatus(`Online · Rollen-Download fehlgeschlagen (${localRollen.length} lokal)`);
      }
    }

    return {
      updated: typeof rollenCount === "number",
      counts,
      errors,
      at: now
    };
  }

  async function getSyncInfo() {
    return {
      lastFullSync: await getMeta("lastFullSync"),
      counts: (await getMeta("lastFullSyncCounts")) || {},
      errors: (await getMeta("lastFullSyncErrors")) || [],
      pending: (await getQueue()).length
    };
  }

  window.SavelineOffline = {
    cacheGet,
    localGet,
    applyLocalMutation,
    queueMutation,
    syncQueue,
    updateConnectionStatus,
    getQueue,
    refreshAllData,
    getSyncInfo
  };

  window.addEventListener("online", async () => {
    await updateConnectionStatus("Online · Synchronisierung…");
    const result = await syncQueue();
    if (result.synced > 0) {
      await updateConnectionStatus(`Online · ${result.synced} Änderung${result.synced === 1 ? "" : "en"} synchronisiert`);
    }
    try {
      await refreshAllData({ quiet: false });
    } catch (error) {
      console.warn("Vollständige Offline-Aktualisierung fehlgeschlagen:", error);
      await updateConnectionStatus("Online · Synchronisierung teilweise fehlgeschlagen");
    }
    if (result.synced > 0) setTimeout(() => location.reload(), 700);
  });
  window.addEventListener("offline", () => updateConnectionStatus());

  document.addEventListener("DOMContentLoaded", async () => {
    await updateConnectionStatus();
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js?v=6", { scope: "./", updateViaCache: "none" });
      await registration.update();
      await navigator.serviceWorker.ready;
      console.log("Service Worker bereit:", registration.scope);
      if (!navigator.serviceWorker.controller && navigator.onLine) {
        const key = "saveline-sw-v6-reload";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          location.reload();
          return;
        }
      }
      setTimeout(() => syncQueue(), 1500);
      await updateConnectionStatus("Online · Offline-Daten aktiv");
    } catch (error) {
      console.error("Service Worker Registrierung fehlgeschlagen:", error);
      await updateConnectionStatus("Online · Offline-Modus fehlerhaft");
    }
  });
})();
