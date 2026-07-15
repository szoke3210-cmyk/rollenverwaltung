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


function downloadStatistikCSV() {
  const statistik =
    window.statistikData || {};

  let csv =
    "\uFEFFMonat;Tag;Typ;Kunde;Verbrauch\n";

  Object.keys(statistik)
    .sort()
    .forEach(monat => {
      Object.keys(statistik[monat])
        .forEach(tag => {
          Object.keys(statistik[monat][tag])
            .forEach(typ => {
              const kunden =
                statistik[monat][tag][typ]
                  .kunden || {};

              Object.keys(kunden)
                .sort()
                .forEach(kunde => {
                  csv +=
                    monat + ";" +
                    tag + ";" +
                    typ + ";" +
                    kunde + ";" +
                    Number(
                      kunden[kunde] || 0
                    ).toFixed(2) +
                    "\n";
                });
            });
        });
    });

  const blob = new Blob(
    [csv],
    {
      type: "text/csv;charset=utf-8;"
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const von =
    sessionStorage.getItem("statistikVon") ||
    "alle";

  const bis =
    sessionStorage.getItem("statistikBis") ||
    "alle";

  link.href = url;
  link.download =
    `Statistik_${von}_bis_${bis}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
