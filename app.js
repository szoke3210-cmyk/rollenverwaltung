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

    document.getElementById("app").innerHTML = `
      <div class="box">
        <h2>Fehler beim Laden</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

startApp();
