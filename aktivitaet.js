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

  const heute = new Date();

  const vorSiebenTagen = new Date();
  vorSiebenTagen.setDate(heute.getDate() - 6);

  const datumZuInput = datum => {
    return (
      datum.getFullYear() +
      "-" +
      String(datum.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(datum.getDate()).padStart(2, "0")
    );
  };

  const gespeichertesVon =
    sessionStorage.getItem("aktivitaetVon") ||
    datumZuInput(vorSiebenTagen);

  const gespeichertesBis =
    sessionStorage.getItem("aktivitaetBis") ||
    datumZuInput(heute);

  const gespeicherterBenutzer =
    sessionStorage.getItem("aktivitaetBenutzer") || "";

  const [
    aktivitaetErgebnis,
    onlineErgebnis
  ] = await Promise.all([
    supabaseClient
      .from("aktivitaet")
      .select("*")
      .order("datum", { ascending: false })
      .limit(2000),

    supabaseClient
      .from("online_users")
      .select("*")
      .order("email", { ascending: true })
  ]);

  if (aktivitaetErgebnis.error) {
    console.error(
      "Fehler beim Laden der Aktivitäten:",
      aktivitaetErgebnis.error
    );

    document.getElementById("app").innerHTML = `
      <div class="box">
        <h2>Aktivitätsprotokoll</h2>

        <p>Fehler beim Laden:</p>

        <p>
          ${escapeHtml(aktivitaetErgebnis.error.message)}
        </p>

        <button onclick="location.href='index.html'">
          Zurück
        </button>
      </div>
    `;
    return;
  }

  if (onlineErgebnis.error) {
    console.error(
      "Fehler beim Laden der Benutzerstatus:",
      onlineErgebnis.error
    );
  }

  const alleAktivitaeten =
    aktivitaetErgebnis.data || [];

  const onlineBenutzer =
    onlineErgebnis.data || [];

  const benutzerSet = new Set();

  alleAktivitaeten.forEach(eintrag => {
    if (eintrag.benutzer) {
      benutzerSet.add(eintrag.benutzer);
    }
  });

  onlineBenutzer.forEach(benutzer => {
    if (benutzer.email) {
      benutzerSet.add(benutzer.email);
    }
  });

  const benutzerListe =
    Array.from(benutzerSet).sort((a, b) =>
      a.localeCompare(b)
    );

  const gefilterteAktivitaeten =
    alleAktivitaeten.filter(eintrag => {
      if (!eintrag.datum) {
        return false;
      }

      const datum = new Date(eintrag.datum);

      if (Number.isNaN(datum.getTime())) {
        return false;
      }

      const lokalesDatum = datumZuInput(datum);

      if (
        gespeichertesVon &&
        lokalesDatum < gespeichertesVon
      ) {
        return false;
      }

      if (
        gespeichertesBis &&
        lokalesDatum > gespeichertesBis
      ) {
        return false;
      }

      if (
        gespeicherterBenutzer &&
        eintrag.benutzer !== gespeicherterBenutzer
      ) {
        return false;
      }

      return true;
    });

  let html = `
    <div class="box">
      <h2>📋 Aktivitätsprotokoll</h2>

      <div class="statistik-filter-grid">

        <div>
          <label for="aktivitaetVon">
            Von
          </label>

          <input
            id="aktivitaetVon"
            type="date"
            value="${escapeHtml(gespeichertesVon)}"
          >
        </div>

        <div>
          <label for="aktivitaetBis">
            Bis
          </label>

          <input
            id="aktivitaetBis"
            type="date"
            value="${escapeHtml(gespeichertesBis)}"
          >
        </div>

        <div>
          <label for="aktivitaetBenutzer">
            Benutzer
          </label>

          <select id="aktivitaetBenutzer">
            <option value="">
              Alle Benutzer
            </option>

            ${benutzerListe.map(email => `
              <option
                value="${escapeHtml(email)}"
                ${
                  email === gespeicherterBenutzer
                    ? "selected"
                    : ""
                }
              >
                ${escapeHtml(email)}
              </option>
            `).join("")}
          </select>
        </div>

      </div>

      <div class="button-row">
        <button
          class="green"
          onclick="anwendenAktivitaetFilter()"
        >
          ✓ Filter anwenden
        </button>

        <button
          class="secondary"
          onclick="letzteSiebenTageAktivitaet()"
        >
          Letzte 7 Tage
        </button>

        <button
          class="secondary"
          onclick="resetAktivitaetFilter()"
        >
          ↻ Zurücksetzen
        </button>

        <button onclick="location.href='index.html'">
          Zurück
        </button>
      </div>
    </div>
  `;

  html += `
    <div class="box">
      <h3>👥 Benutzerstatus</h3>
  `;

  if (onlineBenutzer.length === 0) {
    html += `
      <p>Noch keine Benutzerinformationen vorhanden.</p>
    `;
  } else {
    const jetzt = Date.now();

const heuteBeginn = new Date();
heuteBeginn.setHours(0, 0, 0, 0);

const siebenTageBeginn = new Date();
siebenTageBeginn.setHours(0, 0, 0, 0);
siebenTageBeginn.setDate(siebenTageBeginn.getDate() - 6);

onlineBenutzer.forEach(benutzer => {
      const letzteAktivitaet =
        benutzer.last_seen
          ? new Date(benutzer.last_seen)
          : null;

      const differenz =
        letzteAktivitaet
          ? jetzt - letzteAktivitaet.getTime()
          : Infinity;

      const istOnline =
        differenz <= 90000;

  const benutzerAktivitaeten =
  alleAktivitaeten.filter(eintrag =>
    eintrag.benutzer === benutzer.email
  );

const heuteAnzahl =
  benutzerAktivitaeten.filter(eintrag => {
    if (!eintrag.datum) return false;

    const datum = new Date(eintrag.datum);

    return (
      !Number.isNaN(datum.getTime()) &&
      datum >= heuteBeginn
    );
  }).length;

const siebenTageAnzahl =
  benutzerAktivitaeten.filter(eintrag => {
    if (!eintrag.datum) return false;

    const datum = new Date(eintrag.datum);

    return (
      !Number.isNaN(datum.getTime()) &&
      datum >= siebenTageBeginn
    );
  }).length;

const gesamtAnzahl =
  benutzerAktivitaeten.length;

      const statusSymbol =
        istOnline ? "🟢" : "⚫";

      const statusText =
        istOnline
          ? "Online"
          : letzteAktivitaet
            ? "Zuletzt aktiv: " +
              letzteAktivitaet.toLocaleString("de-DE")
            : "Noch nie aktiv";

      html += `
        <div
          style="
            padding: 12px;
            margin: 8px 0;
            border: 1px solid #dbe3ed;
            border-radius: 10px;
            cursor: pointer;
            background: #f8fafc;
          "
          onclick="aktivitaetBenutzerAuswaehlen(
            '${escapeHtml(
              String(benutzer.email || "")
                .replaceAll("\\", "\\\\")
                .replaceAll("'", "\\'")
            )}'
          )"
        >
          <div>
            <strong>
              ${statusSymbol}
              ${escapeHtml(benutzer.email || "Unbekannt")}
            </strong>
          </div>

          <div style="margin-top: 4px; color: #64748b;">
            ${escapeHtml(statusText)}
          </div>

          ${
  benutzer.aktuelle_seite
    ? `
      <div style="margin-top: 4px;">
        Seite:
        <strong>
          ${escapeHtml(benutzer.aktuelle_seite)}
        </strong>
      </div>
    `
    : ""
}

<div
  style="
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #dbe3ed;
  "
>
  <div>
    <strong>Heute:</strong>
    ${heuteAnzahl} Aktionen
  </div>

  <div style="margin-top: 3px;">
    <strong>Letzte 7 Tage:</strong>
    ${siebenTageAnzahl} Aktionen
  </div>

  <div style="margin-top: 3px;">
    <strong>Gesamt:</strong>
    ${gesamtAnzahl} Aktionen
  </div>
        </div>
      `;
    });
  }

  html += `</div>`;

  html += `
    <div class="box">
      <h3>
        Aktivitäten
        (${gefilterteAktivitaeten.length})
      </h3>
    </div>
  `;

  if (gefilterteAktivitaeten.length === 0) {
    html += `
      <div class="box">
        <p>
          Für den gewählten Zeitraum wurden keine
          Aktivitäten gefunden.
        </p>
      </div>
    `;
  } else {
    gefilterteAktivitaeten.forEach(eintrag => {
      let icon = "📄";

      const aktion =
        eintrag.aktion || "";

      switch (true) {
        case aktion === "Anmeldung":
          icon = "🟢";
          break;

        case aktion === "Abmeldung":
          icon = "🔴";
          break;

        case aktion === "Neue Rolle erstellt":
          icon = "➕";
          break;

        case aktion === "Rolle geändert":
          icon = "✏️";
          break;

        case aktion.startsWith("Zu Electrotherm"):
          icon = "🚚";
          break;

        case aktion.startsWith("Von Electrotherm zurück"):
          icon = "📦";
          break;

        case aktion === "Verbraucht":
          icon = "🗄️";
          break;

        case aktion === "Rolle freigegeben":
          icon = "✅";
          break;

        case aktion === "Rolle gelöscht":
          icon = "🗑️";
          break;

        case aktion === "Backup erstellt":
          icon = "💾";
          break;

        case aktion === "Kunde hinzugefügt":
          icon = "👤";
          break;

        case aktion === "Kunde umbenannt":
          icon = "✏️👤";
          break;

        case aktion === "Kunde gelöscht":
          icon = "❌👤";
          break;
      }

      const datum =
        eintrag.datum
          ? new Date(eintrag.datum)
              .toLocaleString("de-DE")
          : "-";

      html += `
        <div class="box">
          <div style="font-size: 13px; color: #64748b;">
            ${escapeHtml(datum)}
          </div>

          <div style="margin-top: 8px;">
            <strong>Benutzer:</strong>
            ${escapeHtml(
              eintrag.benutzer || "Unbekannt"
            )}
          </div>

          <div style="margin-top: 5px;">
            <strong>
              ${icon}
              ${escapeHtml(aktion || "-")}
            </strong>
          </div>

          ${
            eintrag.rolle
              ? `
                <div>
                  <strong>Rolle:</strong>
                  ${escapeHtml(eintrag.rolle)}
                </div>
              `
              : ""
          }

          ${
            eintrag.details
              ? `
                <div>
                  <strong>Details:</strong>
                  ${escapeHtml(eintrag.details)}
                </div>
              `
              : ""
          }
        </div>
      `;
    });
  }

    document.getElementById("app").innerHTML = html;

  clearTimeout(window.aktivitaetRefresh);

  window.aktivitaetRefresh = setTimeout(() => {
    if (
      new URLSearchParams(location.search).get("page") ===
      "aktivitaet"
    ) {
      showAktivitaet();
    }
  }, 30000);
}

function anwendenAktivitaetFilter() {
  const von =
    document.getElementById("aktivitaetVon").value;

  const bis =
    document.getElementById("aktivitaetBis").value;

  const benutzer =
    document.getElementById("aktivitaetBenutzer").value;

  if (von && bis && von > bis) {
    alert(
      "Das Von-Datum darf nicht nach dem Bis-Datum liegen."
    );
    return;
  }

  sessionStorage.setItem(
    "aktivitaetVon",
    von
  );

  sessionStorage.setItem(
    "aktivitaetBis",
    bis
  );

  sessionStorage.setItem(
    "aktivitaetBenutzer",
    benutzer
  );

  showAktivitaet();
}

function resetAktivitaetFilter() {
  sessionStorage.removeItem("aktivitaetVon");
  sessionStorage.removeItem("aktivitaetBis");
  sessionStorage.removeItem("aktivitaetBenutzer");

  showAktivitaet();
}

function letzteSiebenTageAktivitaet() {
  const heute = new Date();

  const von = new Date();
  von.setDate(heute.getDate() - 6);

  const datumZuInput = datum => {
    return (
      datum.getFullYear() +
      "-" +
      String(datum.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(datum.getDate()).padStart(2, "0")
    );
  };

  sessionStorage.setItem(
    "aktivitaetVon",
    datumZuInput(von)
  );

  sessionStorage.setItem(
    "aktivitaetBis",
    datumZuInput(heute)
  );

  showAktivitaet();
}

function aktivitaetBenutzerAuswaehlen(email) {
  sessionStorage.setItem(
    "aktivitaetBenutzer",
    email
  );

  showAktivitaet();
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

