async function showStatistik() {
  const historie = await api("historie?select=*");
  const selectedKunde = document.getElementById("kundeFilter") 
  ? document.getElementById("kundeFilter").value 
  : "";
  const kundenListe = [...new Set(
  historie
    .map(h => h.auftrag || h.bemerkung)
    .filter(Boolean)
)].sort();

let kundenFilter = `
  <select id="kundeFilter" onchange="showStatistik()">
    <option value="" ${selectedKunde === "" ? "selected" : ""}>
      Alle Kunden
    </option>
`;

kundenListe.forEach(k => {
  kundenFilter += `
    <option value="${k}" ${selectedKunde === k ? "selected" : ""}>
      ${k}
    </option>
  `;
});

kundenFilter += `</select>`;

window.statistikData = {};
let statistik = window.statistikData;

  historie.forEach(h => {
  if (!h.verbrauch || h.verbrauch <= 0) return;

  const kunde = h.auftrag || h.bemerkung || "Ohne Kunde";
  if (selectedKunde && kunde !== selectedKunde) return;

  const monat = new Date(h.datum).toISOString().slice(0, 7);
  const tag = new Date(h.datum).toLocaleDateString("de-DE");

  if (!statistik[monat]) statistik[monat] = {};
  if (!statistik[monat][tag]) statistik[monat][tag] = {};

  if (!statistik[monat][tag][h.typ]) {
    statistik[monat][tag][h.typ] = {
      meter: 0,
      kunden: {}
    };
  }

  statistik[monat][tag][h.typ].meter += Number(h.verbrauch);

  if (!statistik[monat][tag][h.typ].kunden[kunde]) {
    statistik[monat][tag][h.typ].kunden[kunde] = 0;
  }

  statistik[monat][tag][h.typ].kunden[kunde] += Number(h.verbrauch);
});
  let html = `
  <div class="box">
    <h2>Statistik</h2>

    ${kundenFilter}
    
    <button onclick="downloadStatistikCSV()">
      📊 Excel Export
    </button>
  </div>
`;

  Object.keys(statistik).sort().reverse().forEach(monat => {
    html += `<div class="box"><h3>${monat}</h3>`;

    Object.keys(statistik[monat]).forEach(tag => {

  html += `
    <div style="
      background:#fff7ed;
      padding:8px;
      border-radius:8px;
      margin-bottom:10px;
      font-weight:bold;
    ">
      ${tag}
    </div>
  `;

  Object.keys(statistik[monat][tag])
  .filter(typ =>
    typ !== "meter" &&
    typ !== "kunden" &&
    typ !== "tage"
  )
  .forEach(typ => {

    html += `
      <div style="
        border:1px solid #ddd;
        border-radius:8px;
        padding:10px;
        margin-bottom:10px;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h4>${typ}</h4>

          <div style="
            background:#eef2ff;
            padding:6px 12px;
            border-radius:6px;
            font-weight:bold;
          ">
            ${Number(statistik[monat][tag][typ].meter || 0).toFixed(2)} m
          </div>
        </div>
    `;

    Object.keys(statistik[monat][tag][typ].kunden || {}).forEach(kunde => {
      html += `
        <div style="
          margin-left:20px;
          padding:6px;
          margin-top:4px;
          background:#f8f9fa;
          border-radius:6px;
        ">
          <b>${kunde}</b>:
          ${Number(statistik[monat][tag][typ].kunden[kunde] || 0).toFixed(2)} m
        </div>
      `;
    });

    html += `</div>`;
  });
});

html += `</div>`;
});

html += `<button onclick="location.href='index.html'">Zur Übersicht</button>`;

document.getElementById("app").innerHTML = html;
}


function downloadStatistikCSV() {
  const statistik = window.statistikData || {};
  let csv = "Monat;Tag;Typ;Kunde;Verbrauch\n";

  Object.keys(statistik || {}).forEach(monat => {
  Object.keys(statistik[monat] || {}).forEach(tag => {
    Object.keys(statistik[monat][tag] || {}).forEach(typ => {
      Object.keys((statistik[monat][tag][typ] || {}).kunden || {}).forEach(kunde => {
        csv +=
          monat + ";" +
          tag + ";" +
          typ + ";" +
          kunde + ";" +
          Number(statistik[monat][tag][typ].kunden[kunde] || 0).toFixed(2) +
          "\n";
      });
    });
  });
});
    
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Statistik.csv";
  link.click();
}

