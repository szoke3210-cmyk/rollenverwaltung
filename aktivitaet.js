async function logAktion(
  aktion,
  rolle = "",
  details = "",
  benutzerOverride = null
) {
  try {
    const benutzer =
      benutzerOverride ||
      currentUser?.email ||
      "Öffentlicher QR-Zugriff";

    const token = accessToken || SUPABASE_KEY;

    const res = await fetch(
      SUPABASE_URL + "/rest/v1/aktivitaet",
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          datum: new Date().toISOString(),
          benutzer: benutzer,
          aktion: aktion,
          rolle: rolle,
          details: details
        })
      }
    );

    if (!res.ok) {
      console.error(
        "Aktivitätsprotokoll Fehler:",
        await res.text()
      );
    }
  } catch (error) {
    console.error("Aktivitätsprotokoll Fehler:", error);
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
