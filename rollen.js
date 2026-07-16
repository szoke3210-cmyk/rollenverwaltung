async function showList() {
  let query = "rollen?select=*&order=typ.asc,kennung.asc";

  if (typFilter) {
    query = "rollen?typ=eq." + encodeURIComponent(typFilter) + "&select=*&order=kennung.asc";
  }

  let rollen = await api(query);

const statusFilter =
  sessionStorage.getItem("statusFilter") || "alle";

if (statusFilter === "alle") {

  if (isAdmin) {

    // Admin lát mindent

  } else {

    rollen = rollen.filter(r =>
      r.status === "Im Lager" ||
      r.status === "Electrotherm" ||
      r.status === "Nicht freigegeben"
    );

  }

}

  if (statusFilter === "verbraucht") {
  rollen = rollen.filter(r =>
    r.status === "Verbraucht"
  );
}
  
if (statusFilter === "lager") {
  rollen = rollen.filter(r =>
    r.status === "Im Lager"
  );
}

if (statusFilter === "electrotherm") {
  rollen = rollen.filter(r =>
    r.status === "Electrotherm"
  );
}

if (statusFilter === "nichtfreigegeben") {
  rollen = rollen.filter(r =>
    r.status === "Nicht freigegeben"
  );
}
  let alle = await api("rollen?select=*");
  let typen = {};

  alle.forEach(r => {
  if (!typen[r.typ]) {
    typen[r.typ] = {
      count: 0,
      meter: 0,
      lager: 0,
      electro: 0,
      nichtFreigegeben: 0,
      verbraucht: 0
    };
  }

  typen[r.typ].count++;
  typen[r.typ].meter += Number(r.aktuelle_laenge) || 0;

  if (r.status === "Im Lager") {
    typen[r.typ].lager++;
  }

  if (r.status === "Electrotherm") {
    typen[r.typ].electro++;
  }

  if (r.status === "Nicht freigegeben") {
    typen[r.typ].nichtFreigegeben++;
  }

  if (r.status === "Verbraucht") {
    typen[r.typ].verbraucht++;
  }
});

  let typOptions = Object.keys(typen).sort().map(t => `<option value="${t}">${t}</option>`).join("");

  let html = ``;

  

  
if (!typFilter) {
  html += `
    <div class="top-buttons">

      <div class="box left-buttons-box">
        <button onclick="location.href='?page=statistik'">
          📊 Statistik
        </button>

        <button onclick="location.href='?page=scanner'">
          📷 QR-Code scannen
        </button>

        ${isAdmin ? `
          <button onclick="location.href='?page=kunden'">
            👤 Kunde bearbeiten
          </button>

          <button onclick="location.href='?page=auswahl'">
           🛠️ Rollen bearbeiten
          </button>
          
${isAdmin ? `
<button onclick="backupHerunterladen()">
  💾 Backup herunterladen
</button>
` : ""}
          <button onclick="location.href='?page=aktivitaet'">
            📋 Aktivität
          </button>
        ` : ""}
      </div>

      <div class="box extra-urlaub-box">
        <button
          class="extra-urlaub-button"
          onclick="window.open('extra-urlaub.jpg', '_blank')"
        >
          🌴 Extra Urlaub
        </button>
      </div>

    </div>
  `;
}
  
html += `
  <div class="box">
    <h2>${typFilter ? "Typ: " + typFilter : "Übersicht nach Typ"}</h2>

    ${!typFilter && isAdmin ? `
      <button onclick="location.href='?page=typen'">
        🏷️ Typ bearbeiten
      </button>
    ` : ""}

    <div class="grid">
`;
  
if (!typFilter) {
  Object.keys(typen).sort().forEach(t => {

  const farben = getTypFarben(t);

  html += `
      <div
  class="box"
  onclick="location.href='?typ=${encodeURIComponent(t)}'"
  style="
    background: linear-gradient(90deg, ${farben[0]} 50%, ${farben[1]} 50%);
    cursor:pointer;
  "
>
  <div style="
      background:rgba(255,255,255,0.92);
      border-radius:12px;
      padding:12px;
      color:#111;
  ">
      <h3>${t}</h3>

      <div class="big">${typen[t].meter} m</div>

      <p>${typen[t].count} Rollen insgesamt</p>
<p>Im Lager: ${typen[t].lager}</p>
<p>Nicht freigegeben: ${typen[t].nichtFreigegeben}</p>
<p>Electrotherm: ${typen[t].electro}</p>
<p>Verbraucht: ${typen[t].verbraucht}</p>
  </div>
</div>
    `;
  });
}
html += `
    </div>
  </div>
`;

if (!typFilter && isAdmin) {
  html += `
  <div class="box">
    <h2>Neue Rolle hinzufügen</h2>
    <input id="newKennung" placeholder="Kennung z.B. 2-ABC123">

    <label>Typ auswählen</label>
    <select id="typSelect" onchange="typWechsel()">
      <option value="">Typ auswählen...</option>
      ${typOptions}
      <option value="__neu">+ Neuer Typ</option>
    </select>

    <input id="newTyp" placeholder="Neuer Typ z.B. ABC123" style="display:none">
    <input id="newLaenge" type="number" step="0.01" placeholder="Länge in Meter">
    <label>Status</label>
<select id="newStatus">
  <option value="Nicht freigegeben">Nicht freigegeben</option>
  <option value="Im Lager">Im Lager</option>
  <option value="Verbraucht">Verbraucht</option>
</select>
    <textarea id="newBemerkung" placeholder="Bemerkung"></textarea>
    <button class="green" onclick="neueRolle()">➕ Neue Rolle speichern</button>
  </div>
  `;
}

html += `
  <div class="box">
    <h2>${typFilter ? "Rollen von Typ " + typFilter : "Alle Rollen"}</h2>

    <label>Status auswählen</label>

    <select id="statusFilter" onchange="changeStatusFilter()">

  <option value="alle" ${
    statusFilter === "alle" ? "selected" : ""
  }>
    Alle
  </option>

  <option value="lager" ${
    statusFilter === "lager" ? "selected" : ""
  }>
    Im Lager
  </option>

  <option value="electrotherm" ${
    statusFilter === "electrotherm" ? "selected" : ""
  }>
    Electrotherm
  </option>

  <option value="nichtfreigegeben" ${
    statusFilter === "nichtfreigegeben" ? "selected" : ""
  }>
    Nicht freigegeben
  </option>

  ${isAdmin ? `
    <option value="verbraucht" ${
      statusFilter === "verbraucht" ? "selected" : ""
    }>
      Verbraucht
    </option>
  ` : ""}

</select>

    <input
      id="search"
      placeholder="Suchen..."
      onkeyup="filterTable()"
    >
  </div>
  
  ${isAdmin ? `
  <button onclick="location.href='?page=auswahl'">
    🛠️ Rolle bearbeiten
  </button>

  <br><br>
` : ""}
`;

html += `
  <table id="rollenTable">
    <tr>
      <th>Kennung</th>
      <th>Bemerkung</th>
      <th>Typ</th>
      <th>Länge</th>
      <th>Verlust</th>
      <th>Status</th>
      <th>Auftrag</th>
    </tr>
`;

rollen.forEach(r => {
  const verlust = Number(r.urspruengliche_laenge) - Number(r.aktuelle_laenge);

  html += `
    <tr onclick="location.href='?id=${encodeURIComponent(r.kennung)}'">
      <td>${r.kennung}</td>
      <td>${r.bemerkung || "-"}</td>
      <td>${r.typ}</td>
      <td>${r.aktuelle_laenge} m</td>
      <td>${verlust} m</td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.auftrag || "-"}</td>
    </tr>
  `;
});

html += `</table>`;
document.getElementById("app").innerHTML = html;

}


function changeStatusFilter() {
  const select = document.getElementById("statusFilter");

  if (!select) return;

  sessionStorage.setItem(
    "statusFilter",
    select.value
  );

  showList();
}

function filterTable() {
  const input = document.getElementById("search").value.toLowerCase();
  document.querySelectorAll("#rollenTable tr").forEach((row, i) => {
    if (i === 0) return;
    row.style.display = row.innerText.toLowerCase().includes(input) ? "" : "none";
  });
}


function kundeWechsel() {
  const select = document.getElementById("auftragSelect");
  const input = document.getElementById("auftragNeu");
  input.style.display = select.value === "__neu" ? "block" : "none";
}


async function neueRolle() {
  const kennung = document.getElementById("newKennung").value.trim();
  const selectTyp = document.getElementById("typSelect").value;
  const neuerTyp = document.getElementById("newTyp").value.trim();
  const typ = selectTyp === "__neu" ? neuerTyp : selectTyp;
  const laenge = document.getElementById("newLaenge").value;
  const bemerkung = document.getElementById("newBemerkung").value;

  if (!kennung || !typ || !laenge) {
    alert("Kennung, Typ und Länge ausfüllen.");
    return;
  }

  const data = await api("rollen", {
  method: "POST",
  body: JSON.stringify({
    kennung,
    typ,
    urspruengliche_laenge: laenge,
    aktuelle_laenge: laenge,
    status: document.getElementById("newStatus").value,
    bemerkung
  })
});

  if (data.length) {
  await api("historie", {
    method: "POST",
    body: JSON.stringify({
      rollen_id: data[0].id,
      aktion: "Neu angelegt",
      laenge,
      bemerkung
    })
  });

  await logAktion(
    "Neue Rolle erstellt",
    kennung,
    `Typ: ${typ}, Länge: ${laenge} m`
  );
}

  alert("Rolle gespeichert");
  location.reload();
}


async function markRolleVerbraucht(id) {
  if (!confirm("Diese Rolle als verbraucht markieren?")) {
    return;
  }

  window.forceStatus = "Verbraucht";

  try {
    await speichern(id);
  } finally {
    window.forceStatus = null;
  }
}


async function showDetail() {
  const daten = await api(
    "rollen?kennung=eq." +
    encodeURIComponent(kennung) +
    "&select=*"
  );

  if (!daten.length) {
    document.getElementById("app").innerHTML =
      "<h2>Rolle nicht gefunden</h2>";
    return;
  }

  const r = daten[0];

  const qrBemerkungen = await loadQrBemerkungen(r.id);

  const verlust =
    Number(r.urspruengliche_laenge) -
    Number(r.aktuelle_laenge);

  const historie = await api(
    "historie?rollen_id=eq." +
    r.id +
    "&select=*&order=datum.desc"
  );

  const kunden = await api(
    "kunden?select=*&order=name.asc"
  );

  const kundenOptions = kunden
    .map(k => `
      <option value="${k.name}">
        ${k.name}
      </option>
    `)
    .join("");

  let html = `
    <div class="box">
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:20px;
          flex-wrap:wrap;
        "
      >
        <div style="flex:1;min-width:250px;">
          <h2>${r.kennung}</h2>

          <p><b>Typ:</b> ${r.typ || ""}</p>

          <p>
            <b>Aktuelle Länge:</b>
            ${r.aktuelle_laenge || 0} m
          </p>

          <p>
            <b>Ursprüngliche Länge:</b>
            ${r.urspruengliche_laenge || 0} m
          </p>

          <p>
            <b>Gesamtverlust:</b>
            ${verlust} m
          </p>

          <p>
            <b>Status:</b>
            ${statusBadge(r.status)}
          </p>
        </div>

        <div style="text-align:center;">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl(r.kennung))}"
            style="max-width:220px;"
            alt="QR-Code"
          >

          <br>

          <button
            onclick="downloadQRMitFarben(
              '${r.kennung}',
              '${r.typ}',
              '${qrUrl(r.kennung)}'
            )"
            style="margin-top:10px;"
          >
           ⬇️ QR-Code herunterladen
          </button>
        </div>
      </div>
    </div>
  `;

  html += `
  <div class="box">
    <h3>Interne Bemerkung</h3>

    ${isAdmin ? `
      <textarea
        id="bemerkungEdit"
        placeholder="Interne Bemerkung eingeben..."
      >${r.bemerkung || ""}</textarea>

      <button onclick="saveInterneBemerkung(${r.id})">
       📝 Interne Bemerkung speichern
      </button>
    ` : `
      <div style="
        padding:10px;
        background:#f8f9fa;
        border-radius:8px;
      ">
        ${escapeHtml(r.bemerkung || "-")}
      </div>
    `}

      ${r.status !== "Nicht freigegeben" &&
  r.status !== "Verbraucht" ? `
  <button
    class="red"
    onclick="markRolleVerbraucht(${r.id})"
  >
   🗑️ Als verbraucht markieren
  </button>
` : ""}

      ${isAdmin && r.status === "Nicht freigegeben" ? `
        <button
          class="green"
          onclick="freigeben(${r.id})"
        >
          ✅ Freigeben
        </button>
      ` : ""}

      ${isAdmin ? `
        <button
          onclick="deleteRolle(${r.id})"
          style="
            background:#dc3545;
            color:white;
            margin-left:10px;
          "
        >
         ❌ Rolle löschen
        </button>
      ` : ""}
    </div>
  `;
  
html += `
  ${isAdmin ? `
    <button onclick="location.href='?page=auswahl&id=${r.id}'">
      ✏️ Rolle bearbeiten
    </button>
  ` : ""}
`;
  
  html += `
    <div class="box">
      <h3>QR-Bemerkungen</h3>

      <div class="qr-bemerkung-liste">
        ${renderQrBemerkungenListe(
          qrBemerkungen,
          isAdmin
        )}
      </div>

      <label>Neue QR-Bemerkung</label>

      <textarea
        id="publicBemerkung"
        placeholder="Neue Bemerkung eingeben..."
      ></textarea>

      <button onclick="savePublicBemerkung(${r.id})">
       ✏️ Bemerkung hinzufügen
      </button>
    </div>
  `;

  if (r.status === "Im Lager") {
    html += `
      <div class="box">
        <h3>Zu Electrotherm senden</h3>

        <p>
          <b>Aktuelle Länge:</b>
          ${r.aktuelle_laenge} m
        </p>

        <label>Auftrag / Kunde</label>

        <select
          id="auftragSelect"
          onchange="kundeWechsel()"
        >
          <option value="">
            Kunde auswählen...
          </option>

          ${kundenOptions}

          <option value="__neu">
            + Neuer Kunde
          </option>
        </select>

        <input
          id="auftragNeu"
          placeholder="Neuer Kunde"
          style="display:none;"
        >

        <button
          class="orange"
          onclick="zuElectrotherm(${r.id})"
        >
         ⬅️🚚 Zu Electrotherm senden
        </button>
      </div>
    `;
  }

  if (r.status === "Electrotherm") {
    html += `
      <div class="box">
        <h3>Von Electrotherm zurück</h3>

        <p>
          <b>Aktuelle Länge:</b>
          ${r.aktuelle_laenge} m
        </p>

        <p>
          <b>Aktueller Kunde:</b>
          ${r.auftrag || "-"}
        </p>

        <label>
          Verbrauch / Verlust in Meter
        </label>

        <input
          id="verbrauch"
          type="number"
          step="0.01"
          min="0"
          placeholder="Verbrauch eingeben"
        >

        <input
          type="hidden"
          id="auftragSelect"
          value="${r.auftrag || ""}"
        >

        <input
          type="hidden"
          id="auftragNeu"
          value=""
        >

        <button
          class="green"
          onclick="zurueck(${r.id})"
        >
         ↩️🚚 Als zurückgekommen markieren
        </button>
      </div>
    `;
  }

  if (r.status === "Nicht freigegeben") {
    html += `
      <div class="box">
        <h3>
          Status: ${statusBadge(r.status)}
        </h3>

        <p>
          Diese Rolle ist noch nicht freigegeben
          und kann nicht zu Electrotherm gesendet
          werden.
        </p>
      </div>
    `;
  }

  if (r.status === "Verbraucht") {
    html += `
      <div class="box">
        <h3>
          Status: ${statusBadge(r.status)}
        </h3>

        <p>
          Diese Rolle ist verbraucht und archiviert.
        </p>
      </div>
    `;
  }

  html += `
    <button onclick="location.href='index.html'">
     🏠 Zur Übersicht
    </button>
  `;

  document.getElementById("app").innerHTML = html;
}


async function speichern(id) {
  const daten = await api("rollen?id=eq." + id + "&select=*");
  if (!daten.length) return;

  const r = daten[0];

  const verbrauchInput = document.getElementById("verbrauch");
  const verbrauchText = verbrauchInput
    ? verbrauchInput.value.trim()
    : "";

  const verbrauch =
    verbrauchText === ""
      ? null
      : Number(verbrauchText);

  const status = window.forceStatus || r.status;

  const auftragSelectElement =
    document.getElementById("auftragSelect");

  const auftragNeuElement =
    document.getElementById("auftragNeu");

  const auftragSelect = auftragSelectElement
    ? auftragSelectElement.value
    : (r.auftrag || "");

  const auftragNeu = auftragNeuElement
    ? auftragNeuElement.value.trim()
    : "";

  const auftrag =
    auftragSelect === "__neu"
      ? auftragNeu
      : auftragSelect;

  // Verbrauch darf keine ungültige oder negative Zahl sein
  if (
    verbrauch !== null &&
    (!Number.isFinite(verbrauch) || verbrauch < 0)
  ) {
    alert("Bitte einen gültigen Verbrauch eingeben.");
    return;
  }

  /*
   * Wenn die Rolle bei Electrotherm ist und entweder
   * zurückkommt oder direkt als verbraucht markiert wird,
   * muss ein Verbrauch eingetragen werden.
   *
   * Auch 0 ist erlaubt, muss aber ausdrücklich eingegeben werden.
   */
  if (
    r.status === "Electrotherm" &&
    (status === "Im Lager" || status === "Verbraucht") &&
    verbrauchText === ""
  ) {
    alert(
      "Bitte Verbrauch eintragen. Wenn nichts verbraucht wurde, 0 eingeben."
    );
    return;
  }

  if (
    verbrauch !== null &&
    verbrauch > Number(r.aktuelle_laenge)
  ) {
    alert(
      "Der Verbrauch darf nicht größer als die aktuelle Länge sein."
    );
    return;
  }

  // Neue Länge nur einmal berechnen
  let neueLaenge = Number(r.aktuelle_laenge);

  if (
    r.status === "Electrotherm" &&
    (status === "Im Lager" || status === "Verbraucht")
  ) {
    neueLaenge -= verbrauch || 0;
  }

  if (neueLaenge < 0) {
    alert("Verbrauch größer als die aktuelle Länge!");
    return;
  }

  // Beim Senden zu Electrotherm ist ein Kunde/Auftrag erforderlich
  if (
    status === "Electrotherm" &&
    !auftrag.trim()
  ) {
    alert("Bitte Auftrag / Kunde eingeben.");
    return;
  }

  // Bereits bei Electrotherm: Auftrag nicht einfach ändern
  if (
    r.status === "Electrotherm" &&
    status === "Electrotherm" &&
    (r.auftrag || "") !== auftrag
  ) {
    alert(
      "Diese Rolle ist bereits bei Electrotherm. Erst zurück ins Lager buchen."
    );
    return;
  }

  // Neuen Kunden speichern
  if (
    auftragSelect === "__neu" &&
    auftragNeu
  ) {
    const neuerKunde = await api("kunden", {
      method: "POST",
      headers: {
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        name: auftragNeu
      })
    });

    if (!neuerKunde || neuerKunde.length === 0) {
      alert(
        "Der neue Kunde konnte nicht gespeichert werden."
      );
      return;
    }
  }

  const neuerAuftrag =
    status === "Electrotherm"
      ? auftrag
      : "";

  const nichtsGeaendert =
    Number(r.aktuelle_laenge) === Number(neueLaenge) &&
    r.status === status &&
    (r.auftrag || "") === neuerAuftrag;

  if (nichtsGeaendert) {
    alert("Keine Änderung.");
    return;
  }

  await api("rollen?id=eq." + id, {
    method: "PATCH",
    body: JSON.stringify({
      aktuelle_laenge: neueLaenge,
      status: status,
      auftrag: neuerAuftrag,
      bemerkung: r.bemerkung || ""
    })
  });

  let aktion = "Geändert";

  if (
    r.status !== status &&
    status === "Electrotherm"
  ) {
    aktion = "Zu Electrotherm gesendet";
  }

  if (
    r.status === "Electrotherm" &&
    status === "Im Lager"
  ) {
    aktion = "Von Electrotherm zurück";
  }

  if (
    r.status === "Electrotherm" &&
    status === "Verbraucht"
  ) {
    aktion = "Als verbraucht markiert";
  }

  if (
    auftrag &&
    status === "Electrotherm"
  ) {
    aktion += " | Auftrag: " + auftrag;
  }

  if (
    verbrauch !== null &&
    r.status === "Electrotherm" &&
    (status === "Im Lager" || status === "Verbraucht")
  ) {
    aktion += " | Verbrauch: " + verbrauch + " m";
  }

  await api("historie", {
    method: "POST",
    body: JSON.stringify({
      rollen_id: id,
      aktion: aktion,
      laenge: neueLaenge,
      bemerkung: auftrag,
      verbrauch: verbrauch,
      typ: r.typ,
      auftrag: auftrag
    })
  });

  await logAktion(
    aktion,
    r.kennung,
    `Typ: ${r.typ}, Kunde/Auftrag: ${
      auftrag || "-"
    }, Verbrauch: ${
      verbrauch ?? 0
    } m, Neue Länge: ${neueLaenge} m`
  );

  window.forceStatus = null;

  alert("Gespeichert");
  location.reload();
}


async function zuElectrotherm(id) {
  window.forceStatus = "Electrotherm";
  await speichern(id);
}


async function zurueck(id) {
  window.forceStatus = "Im Lager";
  await speichern(id);
}


async function saveBemerkung(id) {
  const bemerkungInput = document.getElementById("bemerkungEdit");

  if (!bemerkungInput) {
    alert("Interne Bemerkung nicht gefunden.");
    return;
  }

  const bemerkung = bemerkungInput.value.trim();

  await api("rollen?id=eq." + id, {
    method: "PATCH",
    body: JSON.stringify({
      bemerkung: bemerkung
    })
  });

  await logAktion(
    "Interne Bemerkung geändert",
    kennung || "",
    bemerkung
  );

  alert("Interne Bemerkung gespeichert");

  await showDetail();
}


async function rolleFreigeben(id) {
  if (!confirm("Diese Rolle freigeben?")) return;

  const daten = await api("rollen?id=eq." + id + "&select=*");

  if (!daten.length) {
    alert("Rolle nicht gefunden.");
    return;
  }

  const rolle = daten[0];

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
      datum: new Date().toISOString(),
      aktion: "Freigegeben",
      bemerkung: "Rolle wurde freigegeben"
    })
  });

  await logAktion(
    "Rolle freigegeben",
    rolle.kennung,
    `Typ: ${rolle.typ}, Status: Im Lager`
  );

  alert("Rolle wurde freigegeben.");
  showAuswahl();
}


async function showAuswahl() {
  const editId = new URLSearchParams(window.location.search).get("id");

  let rollen = await api("rollen?select=*&order=typ.asc,kennung.asc");
    const filter = localStorage.getItem("rolleFilter") || "aktiv";

if (filter === "aktiv") {
  rollen = rollen.filter(r =>
    r.status === "Im Lager" || r.status === "Electrotherm"
  );
}

if (filter === "nichtfrei") {
  rollen = rollen.filter(r => r.status === "Nicht freigegeben");
}

if (filter === "archiv") {
  rollen = rollen.filter(r => r.status === "Verbraucht");
}
  let html = `
    <div class="box">
      <h2>Rolle bearbeiten</h2>
      <label>Ansicht</label>
<select id="rolleFilter" onchange="changeRolleFilter()">
  <option value="aktiv" ${filter === "aktiv" ? "selected" : ""}>Aktive Rollen</option>
  <option value="nichtfrei" ${filter === "nichtfrei" ? "selected" : ""}>Nicht freigegeben</option>
  <option value="archiv" ${filter === "archiv" ? "selected" : ""}>Archivierte Rollen</option>
  <option value="alle" ${filter === "alle" ? "selected" : ""}>Alle Rollen</option>
</select>

      <select id="rolleSelect" onchange="loadRolleEditor()">
        <option value="">Rolle auswählen...</option>
  `;

  rollen.forEach(r => {
    html += `
      <option value="${r.id}">
        ${r.kennung} - ${r.typ} - ${r.aktuelle_laenge} m - ${r.status}
      </option>
    `;
  });

    html += `
      </select>

      <div id="rolleEditor"></div>

      <button onclick="location.href='index.html'">
        🔚 Zur Übersicht
      </button>
    </div>
  `;

  document.getElementById("app").innerHTML = html;

  if (editId) {
    const select = document.getElementById("rolleSelect");

    if (select) {
      select.value = editId;
      await loadRolleEditor();
    }
  }
}


function changeRolleFilter() {
  const filter = document.getElementById("rolleFilter").value;
  localStorage.setItem("rolleFilter", filter);
  showAuswahl();
}


async function loadRolleEditor() {
  const id = document.getElementById("rolleSelect").value;

  if (!id) {
    document.getElementById("rolleEditor").innerHTML = "";
    return;
  }

  const daten = await api("rollen?id=eq." + id + "&select=*");
  if (!daten.length) return;

  const r = daten[0];

  document.getElementById("rolleEditor").innerHTML = `
    <div class="box">
      <h3>${r.kennung}</h3>

      <label>Kennung</label>
      <input id="editKennung" value="${r.kennung}">

      <label>Typ</label>
      <input id="editTyp" value="${r.typ}">

      <label>Ursprüngliche Länge</label>
      <input id="editUrsprung" type="number" step="0.01" value="${r.urspruengliche_laenge}">

      <label>Aktuelle Länge</label>
      <input id="editAktuell" type="number" step="0.01" value="${r.aktuelle_laenge}">

      <label>Status</label>
<select id="editStatus">
  <option value="Nicht freigegeben" ${r.status === "Nicht freigegeben" ? "selected" : ""}>Nicht freigegeben</option>
  <option value="Im Lager" ${r.status === "Im Lager" ? "selected" : ""}>Im Lager</option>
  <option value="Verbraucht" ${r.status === "Verbraucht" ? "selected" : ""}>Verbraucht</option>
</select>

      <label>Bemerkung</label>
      <textarea id="editBemerkung">${r.bemerkung || ""}</textarea>

            <label>Auftrag</label>
      <input id="editAuftrag" value="${r.auftrag || ""}">

            <button onclick="saveRolleEditor(${r.id})">
       💾 Änderungen speichern
      </button>

      ${isAdmin ? `
      ${r.status === "Nicht freigegeben" ? `
  <button onclick="rolleFreigeben(${r.id})" style="background:#28a745;color:white;margin-left:10px;">
   🔓 Freigeben
  </button>
` : ""}
        ${r.status !== "Verbraucht" ? `
  <button class="red" onclick="markRolleVerbraucht(${r.id})">
  🗑️ Als verbraucht markieren
  </button>
` : ""}

        <button onclick="deleteRolle(${r.id})" style="background:#dc3545;color:white;margin-left:10px;">
         ❌ Rolle löschen
        </button>
      ` : ""}
    </div>
  `;
}


async function saveRolleEditor(id) {
  const kennung = document.getElementById("editKennung").value.trim();
  const typ = document.getElementById("editTyp").value.trim();
  const ursprung = Number(document.getElementById("editUrsprung").value);
  const aktuell = Number(document.getElementById("editAktuell").value);
  const bemerkung = document.getElementById("editBemerkung").value;
  const auftrag = document.getElementById("editAuftrag").value;
  const status = document.getElementById("editStatus").value;

  if (!kennung || !typ) {
    alert("Kennung und Typ ausfüllen.");
    return;
  }

  if (ursprung < 0 || aktuell < 0) {
    alert("Länge darf nicht negativ sein.");
    return;
  }

  await api("rollen?id=eq." + id, {
  method: "PATCH",
  body: JSON.stringify({
    kennung: kennung,
    typ: typ,
    urspruengliche_laenge: ursprung,
    aktuelle_laenge: aktuell,
    status: status,
    bemerkung: bemerkung,
    auftrag: auftrag
  })
});

await logAktion(
  "Rolle geändert",
  kennung,
  `Typ: ${typ}, Status: ${status}, Aktuell: ${aktuell} m`
);

alert("Rolle geändert");
location.reload();
}


async function deleteRolle(id) {
  if (!confirm("Diese Rolle wirklich löschen? Die Historie wird auch gelöscht.")) return;

  const daten = await api("rollen?id=eq." + id + "&select=*");

  if (!daten.length) {
    alert("Rolle nicht gefunden.");
    return;
  }

  const rolle = daten[0];

  await logAktion(
    "Rolle gelöscht",
    rolle.kennung,
    `Typ: ${rolle.typ}, Status: ${rolle.status}, Länge: ${rolle.aktuelle_laenge} m`
  );

  await api("historie?rollen_id=eq." + id, {
    method: "DELETE"
  });

  await api("rollen?id=eq." + id, {
    method: "DELETE"
  });

  alert("Rolle gelöscht");
  location.href = "index.html";
}

async function freigeben(id) {
  if (!confirm("Diese Rolle freigefben?")) return;

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

async function saveInterneBemerkung(id) {

  if (!isAdmin) {
    alert("Nur Administratoren dürfen die interne Bemerkung ändern.");
    return;
  }

  const input = document.getElementById("bemerkungEdit");

  if (!input) {
    alert("Bemerkungsfeld nicht gefunden.");
    return;
  }

  const bemerkung = input.value.trim();

  const res = await fetch(
    SUPABASE_URL + "/rest/v1/rollen?id=eq." + id,
    {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        bemerkung: bemerkung
      })
    }
  );

  if (!res.ok) {
    const fehler = await res.text();
    console.error("Bemerkung speichern Fehler:", fehler);
    alert("Bemerkung konnte nicht gespeichert werden.");
    return;
  }

 await logAktion(
  "Interne Bemerkung geändert",
  kennung || "",
  bemerkung
);

  alert("Interne Bemerkung gespeichert.");

  await showDetail();
}
