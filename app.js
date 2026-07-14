console.log("app.js betöltve");
const params = new URLSearchParams(window.location.search);
const kennung = params.get("id");
const typFilter = params.get("typ");
const page = params.get("page");

let isAdmin = false;
let currentUserRole = "user";
let currentUser = null;
  
async function freigeben(id) {
  if (!confirm("Diese Rolle freigeben?")) return;

  await api("rollen?id=eq." + id, {
    method: "PATCH",
    body: JSON.stringify({
      status: "Im Lager"
    })
  });

  await api("historie", {
    method: "POST",
    body: JSON.stringify({
      rollen_id: id,
      aktion: "Freigegeben",
      datum: new Date().toISOString()
    })
  });

  await logAktion(
    "Rolle freigegeben",
    "",
    `Rollen-ID: ${id}`
  );

  alert("Rolle wurde freigegeben.");
  location.reload();
}

async function api(path, options = {}) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("supabaseAccessToken");
    accessToken = null;
    alert("Session abgelaufen. Bitte neu einloggen.");
    location.reload();
    return [];
  }

  if (!res.ok) {
    alert("Fehler: " + await res.text());
    return [];
  }

  return await res.json();
}

function showLoggedInUser() {
  const userInfo = document.getElementById("userInfo");

  if (!userInfo) {
    console.error("A userInfo elem nem található.");
    return;
  }

  if (!currentUser?.email) {
    userInfo.innerHTML = "";
    return;
  }

  userInfo.innerHTML = `
  <span class="user-email">
    ${currentUser.email}
    ${isAdmin ? `<small class="user-role">Admin</small>` : ""}
  </span>

  <button class="logout-button" onclick="logoutUser()">
    Logout
  </button>
`;
}

async function logoutUser() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Logout fehlgeschlagen: " + error.message);
    return;
  }
  accessToken = null;
  currentUser = null;

  location.href = window.location.pathname;
}


async function loadUserRole() {
  if (!currentUser?.id || !accessToken) {
    isAdmin = false;
    currentUserRole = "user";
    return;
  }

  try {
    const res = await fetch(
      SUPABASE_URL +
        "/rest/v1/profiles?id=eq." +
        encodeURIComponent(currentUser.id) +
        "&select=role",
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + accessToken
        }
      }
    );

    if (!res.ok) {
      console.error("Rolle konnte nicht geladen werden:", await res.text());
      isAdmin = false;
      currentUserRole = "user";
      return;
    }

    const profiles = await res.json();
    const role = profiles[0]?.role || "user";

    currentUserRole = role;
    isAdmin = role === "admin";

    console.log("Benutzerrolle:", currentUserRole);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzerrolle:", error);

    isAdmin = false;
    currentUserRole = "user";
  }
}

async function ladeAlleDatensaetze(tabelle) {
  const seitenGroesse = 1000;
  let start = 0;
  let alleDaten = [];

  while (true) {
    const { data, error } = await supabaseClient
      .from(tabelle)
      .select("*")
      .range(start, start + seitenGroesse - 1);

    if (error) {
      throw new Error(
        `Fehler beim Laden der Tabelle "${tabelle}": ${error.message}`
      );
    }

    alleDaten = alleDaten.concat(data || []);

    if (!data || data.length < seitenGroesse) {
      break;
    }

    start += seitenGroesse;
  }

  return alleDaten;
}

async function downloadBackup(button) {
  if (!isAdmin) {
    alert("Nur Administratoren dürfen ein Backup erstellen.");
    return;
  }

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Backup wird erstellt...";
    }

    const [rollen, historie, kunden] = await Promise.all([
      ladeAlleDatensaetze("rollen"),
      ladeAlleDatensaetze("historie"),
      ladeAlleDatensaetze("kunden")
    ]);

    const backup = {
      erstellt_am: new Date().toISOString(),
      rollen,
      historie,
      kunden
    };

    const json = JSON.stringify(backup, null, 2);

    const blob = new Blob([json], {
      type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const datum = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    link.href = url;
    link.download = `rollenverwaltung_backup_${datum}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    await logAktion(
      "Backup erstellt",
      "",
      `Rollen: ${rollen.length}, Historie: ${historie.length}, Kunden: ${kunden.length}`
    );

    alert(
      `Backup erfolgreich erstellt.\n\n` +
      `Rollen: ${rollen.length}\n` +
      `Historie: ${historie.length}\n` +
      `Kunden: ${kunden.length}`
    );

  } catch (error) {
    console.error("Backup-Fehler:", error);
    alert("Backup konnte nicht erstellt werden:\n" + error.message);

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "💾 Backup herunterladen";
    }
  }
}

async function logAktion(aktion, rolle = "", details = "") {
  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from("aktivitaet")
      .insert([{
        benutzer: user?.email || "Unbekannt",
        aktion,
        rolle,
        details
      }]);

    if (error) console.error(error);

  } catch (e) {
    console.error(e);
  }
}

async function showAktivitaet() {
  if (!isAdmin) {
    document.getElementById("app").innerHTML = `
      <div class="box">
        <h2>Kein Zugriff</h2>
        <p>Diese Seite ist nur für Administratoren verfügbar.</p>
        <button onclick="location.href='index.html'">
          Zurück
        </button>
      </div>
    `;
    return;
  }

  document.getElementById("app").innerHTML = `
    <div class="box">
      <h2>Aktivitätsprotokoll</h2>
      <p>Wird geladen...</p>
    </div>
  `;

  const { data, error } = await supabaseClient
    .from("aktivitaet")
    .select("*")
    .order("datum", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Fehler beim Laden der Aktivitäten:", error);

    document.getElementById("app").innerHTML = `
      <div class="box">
        <h2>Aktivitätsprotokoll</h2>
        <p>Fehler beim Laden:</p>
        <p>${escapeHtml(error.message)}</p>

        <button onclick="location.href='index.html'">
          Zurück
        </button>
      </div>
    `;
    return;
  }

  let html = `
    <div class="box">
      <h2>Aktivitätsprotokoll</h2>

      <button onclick="location.href='index.html'">
        Zurück
      </button>

      <button onclick="showAktivitaet()">
        Aktualisieren
      </button>
    </div>
  `;

  if (!data || data.length === 0) {
    html += `
      <div class="box">
        <p>Noch keine Aktivitäten vorhanden.</p>
      </div>
    `;
  } else {
data.forEach(eintrag => {
  let icon = "📄";

  switch (true) {
    case eintrag.aktion === "Anmeldung":
      icon = "🟢";
      break;

    case eintrag.aktion === "Abmeldung":
      icon = "🔴";
      break;

    case eintrag.aktion === "Neue Rolle erstellt":
      icon = "➕";
      break;

    case eintrag.aktion === "Rolle geändert":
      icon = "✏️";
      break;

    case eintrag.aktion.startsWith("Zu Electrotherm"):
      icon = "🚚";
      break;

    case eintrag.aktion.startsWith("Von Electrotherm zurück"):
      icon = "📦";
      break;

    case eintrag.aktion === "Verbraucht":
      icon = "🗄️";
      break;

    case eintrag.aktion === "Rolle freigegeben":
      icon = "✅";
      break;

    case eintrag.aktion === "Rolle gelöscht":
      icon = "🗑️";
      break;

    case eintrag.aktion === "Backup erstellt":
      icon = "💾";
      break;

    case eintrag.aktion === "Kunde hinzugefügt":
      icon = "👤";
      break;

    case eintrag.aktion === "Kunde umbenannt":
      icon = "✏️👤";
      break;

    case eintrag.aktion === "Kunde gelöscht":
      icon = "❌👤";
      break;
  }

  const datum = eintrag.datum
    ? new Date(eintrag.datum).toLocaleString("de-DE")
    : "-";

      html += `
        <div class="box">
          <div style="font-size: 13px; color: #666;">
            ${escapeHtml(datum)}
          </div>

          <div style="margin-top: 8px;">
            <strong>Benutzer:</strong>
            ${escapeHtml(eintrag.benutzer || "Unbekannt")}
          </div>

          <div>
            <strong>${icon} ${escapeHtml(eintrag.aktion || "-")}</strong>
          </div>

          ${eintrag.rolle ? `
            <div>
              <strong>Rolle:</strong>
              ${escapeHtml(eintrag.rolle)}
            </div>
          ` : ""}

          ${eintrag.details ? `
            <div>
              <strong>Details:</strong>
              ${escapeHtml(eintrag.details)}
            </div>
          ` : ""}
        </div>
      `;
    });
  }

  document.getElementById("app").innerHTML = html;
}

function statusBadge(status) {
  let background = "#6c757d";

  if (status === "Im Lager") {
    background = "#198754";
  } else if (status === "Electrotherm") {
    background = "#fd7e14";
  } else if (status === "Nicht freigegeben") {
    background = "#6c757d";
  } else if (status === "Verbraucht") {
    background = "#dc3545";
  }

  return `
    <span style="
      display:inline-block;
      padding:4px 10px;
      border-radius:999px;
      background:${background};
      color:white;
      font-weight:bold;
      font-size:13px;
    ">
      ${escapeHtml(status || "-")}
    </span>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


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
