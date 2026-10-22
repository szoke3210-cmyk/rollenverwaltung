async function showStatistik() {
  const gespeichertesVon =
    sessionStorage.getItem("statistikVon") || "";

  const gespeichertesBis =
    sessionStorage.getItem("statistikBis") || "";

  const historie = await api(
    "historie?select=*&order=datum.desc"
  );

  window.statistikData = {};
  const statistik = window.statistikData;

  historie.forEach(h => {
    const verbrauch = Number(h.verbrauch);

    if (!verbrauch || verbrauch <= 0) {
      return;
    }

    if (!h.datum) {
      return;
    }

    const datum = new Date(h.datum);

    if (Number.isNaN(datum.getTime())) {
      return;
    }

    const lokalesDatum =
      datum.getFullYear() +
      "-" +
      String(datum.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(datum.getDate()).padStart(2, "0");

    if (
      gespeichertesVon &&
      lokalesDatum < gespeichertesVon
    ) {
      return;
    }

    if (
      gespeichertesBis &&
      lokalesDatum > gespeichertesBis
    ) {
      return;
    }

    const kunde =
      h.auftrag ||
      h.bemerkung ||
      "Ohne Kunde";

    const monat = lokalesDatum.slice(0, 7);

    const tag = datum.toLocaleDateString(
      "de-DE"
    );

    const typ = h.typ || "Ohne Typ";

    if (!statistik[monat]) {
      statistik[monat] = {};
    }

    if (!statistik[monat][tag]) {
      statistik[monat][tag] = {};
    }

    if (!statistik[monat][tag][typ]) {
      statistik[monat][tag][typ] = {
        meter: 0,
        kunden: {}
      };
    }

    statistik[monat][tag][typ].meter +=
      verbrauch;

    if (
      !statistik[monat][tag][typ].kunden[kunde]
    ) {
      statistik[monat][tag][typ].kunden[kunde] =
        0;
    }

    statistik[monat][tag][typ].kunden[kunde] +=
      verbrauch;
  });

  let html = `
    <div class="box">
      <h2>📊 Statistik</h2>

      <div class="statistik-filter-grid">

        <div>
          <label for="statistikVon">
            Von
          </label>

          <input
            id="statistikVon"
            type="date"
            value="${gespeichertesVon}"
          >
        </div>

        <div>
          <label for="statistikBis">
            Bis
          </label>

          <input
            id="statistikBis"
            type="date"
            value="${gespeichertesBis}"
          >
        </div>

     <div class="button-row">
  <button
    class="green"
    onclick="anwendenStatistikZeitraum()"
  >
    ✓ Zeitraum anwenden
  </button>

  <button
    class="secondary"
    onclick="resetStatistikZeitraum()"
  >
    ↻ Zurücksetzen
  </button>

    <button
    class="excel"
    onclick="downloadStatistikCSV()"
  >
    📊 Excel Export
  </button>
</div>

      </div>
    </div>

    <div class="statistik-grid">
  `;
  const monate =
    Object.keys(statistik)
      .sort()
      .reverse();

  if (!monate.length) {
    html += `
      <div class="box">
        <p>
          Für den ausgewählten Zeitraum sind
          keine Verbrauchsdaten vorhanden.
        </p>
      </div>
    `;
  }

  monate.forEach(monat => {
    html += `
      <div class="box">
        <h3>${escapeHtml(monat)}</h3>
    `;

    Object.keys(statistik[monat])
      .sort((a, b) => {
        const datumA =
          a.split(".").reverse().join("-");

        const datumB =
          b.split(".").reverse().join("-");

        return datumB.localeCompare(datumA);
      })
      .forEach(tag => {
        html += `
          <div style="
            background:#fff7ed;
            padding:8px;
            border-radius:8px;
            margin-bottom:10px;
            font-weight:bold;
          ">
            ${escapeHtml(tag)}
          </div>
        `;

        Object.keys(statistik[monat][tag])
          .forEach(typ => {
            const typDaten =
              statistik[monat][tag][typ];

            html += `
              <div style="
                border:1px solid #ddd;
                border-radius:8px;
                padding:10px;
                margin-bottom:10px;
              ">
                <div style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:10px;
                ">
                  <h4>
                    ${escapeHtml(typ)}
                  </h4>

                  <div style="
                    background:#eef2ff;
                    padding:6px 12px;
                    border-radius:6px;
                    font-weight:bold;
                  ">
                    ${Number(
                      typDaten.meter || 0
                    ).toFixed(2)} m
                  </div>
                </div>
            `;

            Object.keys(
              typDaten.kunden || {}
            )
              .sort()
              .forEach(kunde => {
                html += `
                  <div style="
                    margin-left:20px;
                    padding:6px;
                    margin-top:4px;
                    background:#f8f9fa;
                    border-radius:6px;
                  ">
                    <b>
                      ${escapeHtml(kunde)}
                    </b>:
                    ${Number(
                      typDaten.kunden[kunde] || 0
                    ).toFixed(2)} m
                  </div>
                `;
              });

            html += `</div>`;
          });
      });

    html += `</div>`;
  });

 html += `
  </div>

  <div class="statistik-back-area">
    <button
      class="back-button"
      onclick="location.href='index.html'"
    >
      Zur Übersicht
    </button>
  </div>
`;

  document.getElementById("app").innerHTML = html;
}

function anwendenStatistikZeitraum() {
  const vonInput =
    document.getElementById("statistikVon");

  const bisInput =
    document.getElementById("statistikBis");

  const von = vonInput?.value || "";
  const bis = bisInput?.value || "";

  if (von && bis && von > bis) {
    alert(
      "Das Von-Datum darf nicht nach dem Bis-Datum liegen."
    );
    return;
  }

  sessionStorage.setItem(
    "statistikVon",
    von
  );

  sessionStorage.setItem(
    "statistikBis",
    bis
  );

  showStatistik();
}


function resetStatistikZeitraum() {
  sessionStorage.removeItem("statistikVon");
  sessionStorage.removeItem("statistikBis");

  showStatistik();
}



async function downloadStatistikCSV() {
  if (typeof XLSX === "undefined") {
    alert("Excel-Bibliothek nicht geladen.");
    return;
  }

  try {
    const historie = [];
    const schritt = 1000;
    let von = 0;

    while (true) {
      const teil = await api(
        "historie?select=*&order=id.asc",
        {
          headers: {
            Range: `${von}-${von + schritt - 1}`
          }
        }
      );

      if (!Array.isArray(teil)) {
        throw new Error("Historie konnte nicht geladen werden.");
      }

      historie.push(...teil);

      if (teil.length < schritt) break;
      von += schritt;
    }

    const daten = historie.flatMap(h => {
      const meter = Number(h.verbrauch);

      if (!Number.isFinite(meter) || meter <= 0 || !h.datum) {
        return [];
      }

      const d = new Date(h.datum);
      if (Number.isNaN(d.getTime())) return [];

      return [{
        jahr: d.getFullYear(),
        monat: d.getFullYear() + "-" +
          String(d.getMonth() + 1).padStart(2, "0"),
        datum: d.toLocaleDateString("de-DE"),
        zeit: d.getTime(),
        typ: h.typ || "Ohne Typ",
        kunde: h.auftrag || h.bemerkung || "Ohne Kunde",
        meter: meter
      }];
    });

    const typen = [...new Set(daten.map(x => x.typ))]
      .sort((a, b) => a.localeCompare(b, "de", {numeric: true}));

    const monate = [...new Set(daten.map(x => x.monat))].sort();
    const jahre = [...new Set(daten.map(x => x.jahr))].sort((a, b) => a - b);

    const runden = n => Math.round((n + Number.EPSILON) * 100) / 100;

    const summe = (typ, feld, wert) =>
      daten.reduce((s, x) =>
        s + (x.typ === typ &&
          (!feld || x[feld] === wert) ? x.meter : 0), 0);

    // 1. Verbrauch
    const details = [
      ["Monat", "Datum", "Typ", "Auftrag / Kunde", "Verbrauch (m)"]
    ];

    for (const typ of typen) {
      const zeilen = daten
        .filter(x => x.typ === typ)
        .sort((a, b) => a.zeit - b.zeit);

      for (const x of zeilen) {
        details.push([
          x.monat, x.datum, x.typ, x.kunde, runden(x.meter)
        ]);
      }

      details.push([
        "", "", typ + " - Gesamt", "", runden(summe(typ))
      ]);
      details.push([]);
    }

    // 2. Monatsübersicht
    const monatTabelle = [
      ["Typ", ...monate, "Gesamt (m)"]
    ];

    for (const typ of typen) {
      monatTabelle.push([
        typ,
        ...monate.map(m => runden(summe(typ, "monat", m))),
        runden(summe(typ))
      ]);
    }

    monatTabelle.push([
      "Gesamt (m)",
      ...monate.map(m => runden(
        daten.filter(x => x.monat === m)
          .reduce((s, x) => s + x.meter, 0)
      )),
      runden(daten.reduce((s, x) => s + x.meter, 0))
    ]);

    // 3. Jahresübersicht
    const jahrTabelle = [
      ["Typ", ...jahre.map(String), "Gesamt (m)"]
    ];

    for (const typ of typen) {
      jahrTabelle.push([
        typ,
        ...jahre.map(j => runden(summe(typ, "jahr", j))),
        runden(summe(typ))
      ]);
    }

    jahrTabelle.push([
      "Gesamt (m)",
      ...jahre.map(j => runden(
        daten.filter(x => x.jahr === j)
          .reduce((s, x) => s + x.meter, 0)
      )),
      runden(daten.reduce((s, x) => s + x.meter, 0))
    ]);

    // 4. Kundenübersicht
    const aktuellesJahr = new Date().getFullYear();

    const kunden = [...new Set(daten.map(x => x.kunde))]
      .sort((a, b) => a.localeCompare(b, "de"));

    const kundenTabelle = [
      ["Kunde", "Typ", "Gesamt (m)", `${aktuellesJahr} (m)`]
    ];

    for (const kunde of kunden) {
      const kundenDaten = daten.filter(x => x.kunde === kunde);

      const kundenTypen = [...new Set(kundenDaten.map(x => x.typ))]
        .sort((a, b) => a.localeCompare(b, "de", { numeric: true }));

      for (const typ of kundenTypen) {
        const typDaten = kundenDaten.filter(x => x.typ === typ);

        const gesamt = typDaten.reduce(
          (summe, x) => summe + x.meter, 0
        );

        const jahresverbrauch = typDaten
          .filter(x => x.jahr === aktuellesJahr)
          .reduce((summe, x) => summe + x.meter, 0);

        kundenTabelle.push([
          kunde,
          typ,
          runden(gesamt),
          runden(jahresverbrauch)
        ]);
      }

      const kundenGesamt = kundenDaten.reduce(
        (summe, x) => summe + x.meter, 0
      );

      const kundenJahr = kundenDaten
        .filter(x => x.jahr === aktuellesJahr)
        .reduce((summe, x) => summe + x.meter, 0);

      kundenTabelle.push([
        kunde + " - Gesamt",
        "",
        runden(kundenGesamt),
        runden(kundenJahr)
      ]);

      kundenTabelle.push([]);
    }

    const alleGesamt = daten.reduce(
      (summe, x) => summe + x.meter, 0
    );

    const alleJahr = daten
      .filter(x => x.jahr === aktuellesJahr)
      .reduce((summe, x) => summe + x.meter, 0);

    kundenTabelle.push([
      "Gesamtverbrauch",
      "",
      runden(alleGesamt),
      runden(alleJahr)
    ]);

    const wb = XLSX.utils.book_new();

    function addSheet(rows, name, widths, numericFrom) {
      const ws = XLSX.utils.aoa_to_sheet(rows);

      ws["!cols"] = widths.map(wch => ({ wch }));

      for (const address of Object.keys(ws)) {
        if (address.startsWith("!")) continue;

        const cell = ws[address];
        const pos = XLSX.utils.decode_cell(address);

        if (pos.r > 0 && pos.c >= numericFrom && cell.t === "n") {
          cell.z = "0.00";
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    addSheet(details, "Verbrauch",
      [14, 16, 24, 36, 18], 4);

    addSheet(monatTabelle, "Monatsübersicht",
      [24, ...monate.map(() => 16), 18], 1);

    addSheet(jahrTabelle, "Jahresübersicht",
      [24, ...jahre.map(() => 16), 18], 1);
    
    addSheet(kundenTabelle, "Kundenübersicht",
  [36, 24, 18, 18], 2);

    XLSX.writeFile(
      wb,
      "Rollenverwaltung_Statistik_Gesamt.xlsx"
    );

  } catch (error) {
    console.error("Excel Export Fehler:", error);
    alert("Excel-Export fehlgeschlagen: " + error.message);
  }
}

