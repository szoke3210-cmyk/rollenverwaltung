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
  let reconnectTimer = null;
  let started = false;

  function hasEditingFocus() {
    const element = document.activeElement;

    if (!element) {
      return false;
    }

    return (
      ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) ||
      element.isContentEditable
    );
  }

  function canRefreshCurrentView() {
  if (document.visibilityState !== "visible") {
    return false;
  }

  if (page === "scanner") {
    return false;
  }

  return true;
}
  
  async function refreshCurrentView() {
  if (!navigator.onLine) {
    return;
  }

  console.log(
    "LIVE OLDALFRISSÍTÉS:",
    {
      page,
      kennung,
      visible: document.visibilityState
    }
  );

  try {
    if (page === "statistik") {
      await showStatistik();
    } else if (page === "aktivitaet") {
      await showAktivitaet();
    } else if (page === "typen") {
      await showTypen();
    } else if (page === "auswahl") {
      await showAuswahl();
    } else if (page === "kunden") {
      await showKunden();
    } else if (kennung) {
      await showDetail();
    } else {
      await showList();
    }

    console.log("LIVE OLDAL FRISSÍTVE");
  } catch (error) {
    console.error(
      "Live-Aktualisierung der Ansicht fehlgeschlagen:",
      error
    );
  }
}
  function scheduleRefresh() {
    clearTimeout(refreshTimer);

    refreshTimer = setTimeout(
      refreshCurrentView,
      450
    );
  }

  async function handleChange(table, payload) {
  console.log(
    "LIVE ADATVÁLTOZÁS:",
    table,
    payload.eventType,
    payload
  );

  try {
    const result = await window.SavelineOffline?.applyRealtimeChange(
      table,
      payload.eventType,
      payload.new,
      payload.old
    );

    if (result?.reason === "pending-local-change") {
      return;
    }

    scheduleRefresh();
  } catch (error) {
    console.warn(
      `Realtime-Verarbeitung für ${table} fehlgeschlagen:`,
      error
    );
  }
}
  async function start() {
    if (
      started ||
      !navigator.onLine ||
      typeof supabaseClient === "undefined" ||
      !currentUser
    ) {
      return;
    }

    started = true;

    channel = supabaseClient.channel(
      "saveline-database-live-v1"
    );

    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table
        },
        payload => handleChange(table, payload)
      );
    }

    channel.subscribe((status, error) => {
      console.log(
        "Saveline Realtime:",
        status,
        error || ""
      );

      if (status === "SUBSCRIBED") {
        clearTimeout(reconnectTimer);

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

        clearTimeout(reconnectTimer);

        reconnectTimer = setTimeout(
          async () => {
            await stop();
            await start();
          },
          3000
        );
      }
    });
  }

  async function stop() {
    started = false;

    clearTimeout(refreshTimer);
    clearTimeout(reconnectTimer);

    if (
      channel &&
      typeof supabaseClient !== "undefined"
    ) {
      try {
        await supabaseClient.removeChannel(channel);
      } catch (error) {
        console.warn(
          "Realtime-Kanal konnte nicht entfernt werden:",
          error
        );
      }
    }

    channel = null;
  }

  window.SavelineRealtime = {
    start,
    stop
  };

  window.addEventListener(
    "online",
    () => setTimeout(start, 1000)
  );

  window.addEventListener(
    "offline",
    stop
  );
})();
