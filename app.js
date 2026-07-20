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

    // Először mindig jelenjen meg az alkalmazás. A teljes offline másolat
    // frissítése ezután a háttérben fusson, hogy egy lassú vagy tiltott tábla
    // ne akadályozza a főoldal betöltését.
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

    if (navigator.onLine && window.SavelineOffline) {
      setTimeout(() => {
        window.SavelineOffline.refreshAllData({ quiet: false })
          .catch(error => console.warn("Offline-Daten Aktualisierung fehlgeschlagen:", error));
      }, 500);
    }

  } catch (error) {
    console.error("Fehler in startApp:", error);

    document.getElementById("app").innerHTML = `
      <div class="box">
        <h2>${!navigator.onLine ? "Offline" : "Fehler beim Laden"}</h2>
        <p>${escapeHtml(error?.message || "Unbekannter Fehler")}</p>
        <button type="button" onclick="location.reload()">Erneut versuchen</button>
      </div>
    `;
  }
}

startApp();
