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

        <p>
          Diese Seite ist nur für Administratoren verfügbar.
        </p>

        <button onclick="location.href='index.html'">
          Zurück
        </button>
      </div>
    `;

    return;
  }

  const gespeichertesDatum =
    sessionStorage.getItem("aktivitaetDatum");

  const heute = new Date();

  const heuteText =
    heute.getFullYear() +
    "-" +
    String(heute.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(heute.getDate()).padStart(2, "0");

  const ausgewaehltesDatum =
    gespeichertesDatum || heuteText;

  document.getElementById("app").innerHTML = `
    <div class="box">
      <h2>Aktivitätsprotokoll</h2>

      <label for="aktivitaetDatum">
        Datum auswählen
      </label>

      <input
        id="aktivitaetDatum"
        type="date"
        value="${ausgewaehltesDatum}"
        onchange="changeAktivitaetDatum()"
      >

      <button onclick="showAktivitaet()">
        Aktualisieren
      </button>

      <button onclick="location.href='index.html'">
        Zur Übersicht
      </button>
    </div>

    <div class="box">
      <p>Aktivitäten werden geladen...</p>
    </div>
  `;

  const [jahr, monat, tag] =
    ausgewaehltesDatum.split("-").map(Number);

  const startDatum = new Date(
    jahr,
    monat - 1,
    tag,
    0,
    0,
    0,
    0
  );

  const endDatum = new Date(
    jahr,
    monat - 1,
    tag + 1,
    0,
    0,
    0,
    0
  );

  const { data, error } = await supabaseClient
    .from("aktivitaet")
    .select("*")
    .gte("datum", startDatum.toISOString())
    .lt("datum", endDatum.toISOString())
    .order("datum", { ascending: false });

  if (error) {
    console.error(
      "Fehler beim Laden der Aktivitäten:",
      error
    );

    document.getElementById("app").innerHTML = `
      <div class="box">
        <h2>Aktivitätsprotokoll</h2>

        <label for="aktivitaetDatum">
          Datum auswählen
        </label>

        <input
          id="aktivitaetDatum"
          type="date"
          value="${ausgewaehltesDatum}"
          onchange="changeAktivitaetDatum()"
        >

        <p>
          Fehler beim Laden:
          ${escapeHtml(error.message)}
        </p>

        <button onclick="location.href='index.html'">
          Zur Übersicht
        </button>
      </div>
    `;

    return;
  }

  const anzeigeDatum =
    startDatum.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

  let html = `
    <div class="box">
      <h2>Aktivitätsprotokoll</h2>

      <label for="aktivitaetDatum">
        Datum auswählen
      </label>

      <input
        id="aktivitaetDatum"
        type="date"
        value="${ausgewaehltesDatum}"
        onchange="changeAktivitaetDatum()"
      >

      <button onclick="showAktivitaet()">
        Aktualisieren
      </button>

      <button onclick="location.href='index.html'">
        Zur Übersicht
      </button>
    </div>

    <div class="box">
      <h3>${escapeHtml(anzeigeDatum)}</h3>

      <p>
        ${data?.length || 0}
        Aktivitäten an diesem Tag
      </p>
    </div>
  `;

  if (!data || data.length === 0) {
    html += `
      <div class="box">
        <p>
          Für diesen Tag sind keine Aktivitäten vorhanden.
        </p>
      </div>
    `;
  } else {
    data.forEach(eintrag => {
      const icon =
        getAktivitaetIcon(eintrag.aktion);

      const zeit = eintrag.datum
        ? new Date(eintrag.datum).toLocaleTimeString(
            "de-DE",
            {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            }
          )
        : "-";

      html += `
        <div class="box">
          <div
            style="
              font-size:13px;
              color:#666;
              margin-bottom:8px;
            "
          >
            🕒 ${escapeHtml(zeit)}
          </div>

          <div>
            <strong>Benutzer:</strong>
            ${escapeHtml(
              eintrag.benutzer || "Unbekannt"
            )}
          </div>

          <div style="margin-top:6px;">
            <strong>
              ${icon}
              ${escapeHtml(eintrag.aktion || "-")}
            </strong>
          </div>

          ${eintrag.rolle ? `
            <div style="margin-top:6px;">
              <strong>Rolle:</strong>
              ${escapeHtml(eintrag.rolle)}
            </div>
          ` : ""}

          ${eintrag.details ? `
            <div style="margin-top:6px;">
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

function changeAktivitaetDatum() {
  const input =
    document.getElementById("aktivitaetDatum");

  if (!input?.value) return;

  sessionStorage.setItem(
    "aktivitaetDatum",
    input.value
  );

  showAktivitaet();
}

function getAktivitaetIcon(aktion) {
  const text = aktion || "";

  if (text === "Anmeldung") {
    return "🟢";
  }

  if (text === "Abmeldung") {
    return "🔴";
  }

  if (text === "Neue Rolle erstellt") {
    return "➕";
  }

  if (text === "Rolle geändert") {
    return "✏️";
  }

  if (text.startsWith("Zu Electrotherm")) {
    return "🚚";
  }

  if (text.startsWith("Von Electrotherm zurück")) {
    return "📦";
  }

  if (text === "Verbraucht") {
    return "🗄️";
  }

  if (text === "Rolle freigegeben") {
    return "✅";
  }

  if (text === "Rolle gelöscht") {
    return "🗑️";
  }

  if (text === "Backup erstellt") {
    return "💾";
  }

  if (text === "Kunde hinzugefügt") {
    return "👤";
  }

  if (text === "Kunde umbenannt") {
    return "✏️👤";
  }

  if (text === "Kunde gelöscht") {
    return "❌👤";
  }

  if (text === "QR-Bemerkung hinzugefügt") {
    return "💬";
  }

  if (text === "QR-Bemerkung gelöscht") {
    return "🗑️💬";
  }

  if (text === "Interne Bemerkung geändert") {
    return "📝";
  }

  return "📄";
}

