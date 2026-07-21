async function showTypen() {
  const typenDaten = await api("typen?select=*&order=typ.asc");

  const typen = typenDaten
    .map(t => t.typ)
    .filter(Boolean);

  let html = `
    <div class="box">
      <h3>Neuer Typ</h3>

      <label>Typ</label>
      <input id="newTypName">

      <label>ArtN.</label>
      <input id="newTypArtikel">

      <br><br>

      <button onclick="addTyp()">
        ➕ Typ hinzufügen
      </button>
    </div>

    <div class="box">
      <h2>Typen verwalten</h2>

      <select id="typSelect" onchange="loadTypEditor()">
        <option value="">Typ auswählen...</option>
  `;

  typen.forEach(t => {
    html += `
      <option value="${t}">
        ${t}
      </option>
    `;
  });

  html += `
      </select>

      <div id="typEditor"></div>

      <button onclick="location.href='index.html'">
        Zur Übersicht
      </button>
    </div>
  `;

  document.getElementById("app").innerHTML = html;
}

async function loadTypEditor() {
  const typ = document.getElementById("typSelect").value;

  if (!typ) {
    document.getElementById("typEditor").innerHTML = "";
    return;
  }

  const rollen = await api("rollen?typ=eq." + encodeURIComponent(typ) + "&select=*");

  const meter = rollen.reduce((sum, r) => sum + Number(r.aktuelle_laenge), 0);

  document.getElementById("typEditor").innerHTML = `
    <div class="box">
      <h3>${typ}</h3>
      <p>Rollen: ${rollen.length}</p>
      <p>Meter: ${meter.toFixed(2)} m</p>

      <label>Neuer Typname</label>
      <input id="newTypName" value="${typ}">

      <button onclick="renameTyp('${typ}')">
        Typ umbenennen
      </button>

      <button onclick="deleteTyp('${typ}')" style="background:#dc3545;">
        Typ löschen
      </button>
    </div>
  `;
}


async function renameTyp(altTyp) {
  const neuerTyp = document.getElementById("newTypName").value.trim();

  if (!neuerTyp) {
    alert("Neuen Typ eingeben.");
    return;
  }

  await api("rollen?typ=eq." + encodeURIComponent(altTyp), {
    method: "PATCH",
    body: JSON.stringify({
      typ: neuerTyp
    })
  });

  alert("Typ geändert");
  location.reload();
}


async function deleteTyp(typ) {
  if (!confirm("Diesen Typ wirklich löschen? Alle Rollen dieses Typs werden gelöscht.")) return;

  const rollen = await api("rollen?typ=eq." + encodeURIComponent(typ) + "&select=id");

  for (const r of rollen) {
    await api("historie?rollen_id=eq." + r.id, { method: "DELETE" });
    await api("rollen?id=eq." + r.id, { method: "DELETE" });
  }

  alert("Typ und alle Rollen gelöscht");
  location.href = "index.html";
}


function typWechsel() {
  const select = document.getElementById("typSelect");
  const input = document.getElementById("newTyp");
  input.style.display = select.value === "__neu" ? "block" : "none";
}

async function addTyp() {

  const typ = document.getElementById("newTypName").value.trim();
  const artikel = document.getElementById("newTypArtikel").value.trim();

  if (!typ) {
    alert("Typ eingeben");
    return;
  }

  const vorhanden = await api(
    "typen?typ=eq." + encodeURIComponent(typ)
  );

  if (vorhanden.length) {
    alert("Typ existiert bereits");
    return;
  }

  await api("typen", {
    method: "POST",
    body: JSON.stringify({
      typ: typ,
      artikel: artikel
    })
  });

  await logAktion(
    "Typ hinzugefügt",
    "",
    typ
  );

  alert("Typ gespeichert");

  location.reload();
}
