(function () {
  const TABLES = [
  "rollen",
  "typen",
  "kunden",
  "historie",
  "qr_bemerkungen",
  "aktivitaet"
];
  let channel = null;
  let refreshTimer = null;
  let started = false;

  function hasEditingFocus() {
    const element = document.activeElement;
    if (!element) return false;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable;
  }

  function canRefreshCurrentView() {
    if (document.visibilityState !== "visible" || hasEditingFocus()) return false;
    if (
  page === "scanner" ||
  page === "auswahl" ||
  page === "kunden"
) {
  return false;
}
    return true;
  }

  async function refreshCurrentView() {
    if (!navigator.onLine || !canRefreshCurrentView()) return;

    try {
      if (page === "statistik") {
  await showStatistik();
} else if (page === "aktivitaet") {
  await showAktivitaet();
} else if (page === "typen") {
  await showTypen();
} else if (kennung) {
  await showDetail();
} else {
  await showList();
}
    } catch (error) {
      console.warn("Live-Aktualisierung der Ansicht fehlgeschlagen:", error);
    }
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshCurrentView, 450);
  }

  async function handleChange(table, payload) {
    try {
      const result = await window.SavelineOffline?.applyRealtimeChange(
        table,
        payload.eventType,
        payload.new,
        payload.old
      );

      // Bei einer eigenen noch wartenden Offline-Änderung bleibt die lokale
      // Version erhalten, bis die Queue erfolgreich synchronisiert wurde.
      if (result?.reason === "pending-local-change") return;

      scheduleRefresh();
    } catch (error) {
      console.warn(`Realtime-Verarbeitung für ${table} fehlgeschlagen:`, error);
    }
  }

  async function start() {
    if (started || !navigator.onLine || typeof supabaseClient === "undefined" || !currentUser) return;
    started = true;

    channel = supabaseClient.channel("saveline-database-live-v1");

    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        payload => handleChange(table, payload)
      );
    }

   channel.subscribe((status, error) => {
  console.log("Saveline Realtime:", status, error || "");

  if (status === "SUBSCRIBED") {
    window.SavelineOffline?.updateConnectionStatus(
      "Online · Live"
    );
    return;
  }

  if (
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT"
  ) {
    started = false;

    window.SavelineOffline?.updateConnectionStatus(
      "Online · Live-Verbindung gestört"
    );

    setTimeout(async () => {
      await stop();
      await start();
    }, 3000);
  }
});

  async function stop() {
    started = false;
    clearTimeout(refreshTimer);
    if (channel && typeof supabaseClient !== "undefined") {
      try { await supabaseClient.removeChannel(channel); } catch (_) {}
    }
    channel = null;
  }

  window.SavelineRealtime = { start, stop };
  window.addEventListener("online", () => setTimeout(start, 1000));
  window.addEventListener("offline", stop);
})();
