async function startApp() {
  try {
    const eingeloggt = await initSupabaseSession();

    if (kennung && !eingeloggt) {
      await showPublicRolle();
      return;
    }

    if (!eingeloggt) {
      showLogin();
      return;
    }

    if (navigator.onLine && window.SavelineOffline) {
      try {
        await window.SavelineOffline.refreshAllData();
      } catch (error) {
        console.warn("Offline-Daten konnten nicht vollständig aktualisiert werden:", error);
      }
    }

    if (page === "statistik") {
      await showStatistik();
    } else if (page === "typen") {
      await showTypen();
    } else if (page === "auswahl") {
      await showAuswahl();
    } else if (page === "kunden") {
      await showKunden();
    } else if (page === "aktivitaet") {
      await showAktivitaet();
    } else if (page === "scanner") {
      showScanner();
    } else if (kennung) {
      await showDetail();
    } else {
      await showList();
    }

  } catch (error) {
    console.error("Fehler in startApp:", error);

    const offline = !navigator.onLine;

    document.getElementById("app").innerHTML = `
      <div class="box">
        <h2>${offline ? "Offline" : "Fehler beim Laden"}</h2>
        <p>${offline
          ? "Die Anwendung wurde offline geöffnet. Für Rollen- und Kundendaten ist in dieser ersten Offline-Stufe noch eine Internetverbindung erforderlich."
          : escapeHtml(error.message)}</p>
        ${offline ? `<button type="button" onclick="location.reload()">Erneut versuchen</button>` : ""}
      </div>
    `;
  }
}

startApp();
