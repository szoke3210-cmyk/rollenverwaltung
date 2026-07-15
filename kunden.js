async function showKunden() {
  const kunden = await api("kunden?select=*&order=name.asc");

  let html = `
    <div class="box">
      <h2>Kunde bearbeiten</h2>

<div class="box">
  <label>Neuer Kunde</label>
  <input id="neuerKundeName" placeholder="Kundenname">

  <button onclick="addKunde()">
    Kunde hinzufügen
  </button>
</div>

<select id="kundeEditSelect" onchange="loadKundeEditor()">
        <option value="">Kunde auswählen...</option>
  `;

  kunden.forEach(k => {
    html += `<option value="${k.id}">${k.name}</option>`;
  });

  html += `
      </select>

      <div id="kundeEditor"></div>

      <button onclick="location.href='index.html'">
        Zur Übersicht
      </button>
    </div>
  `;

  document.getElementById("app").innerHTML = html;
}


async function loadKundeEditor() {
  const id = document.getElementById("kundeEditSelect").value;
  if (!id) {
    document.getElementById("kundeEditor").innerHTML = "";
    return;
  }

  const daten = await api("kunden?id=eq." + id + "&select=*");
  if (!daten.length) return;

  const k = daten[0];

  document.getElementById("kundeEditor").innerHTML = `
    <div class="box">
      <h3>${k.name}</h3>

      <label>Neuer Kundenname</label>
      <input id="newKundeName" value="${k.name}">

      <button onclick="renameKunde(${k.id}, '${k.name}')">
        Kunde umbenennen
      </button>

      <button onclick="deleteKunde(${k.id}, '${k.name}')" style="background:#dc3545;">
        Kunde löschen
      </button>
    </div>
  `;
}


async function renameKunde(id, alterName) {
  const neuerName = document.getElementById("newKundeName").value.trim();

  if (!neuerName) {
    alert("Kundenname eingeben.");
    return;
  }

  await api("kunden?id=eq." + id, {
    method: "PATCH",
    body: JSON.stringify({ name: neuerName })
  });

  await api("rollen?auftrag=eq." + encodeURIComponent(alterName), {
    method: "PATCH",
    body: JSON.stringify({ auftrag: neuerName })
  });

  await api("historie?auftrag=eq." + encodeURIComponent(alterName), {
    method: "PATCH",
    body: JSON.stringify({
      auftrag: neuerName,
      bemerkung: neuerName
    })
  });

  await logAktion(
    "Kunde umbenannt",
    "",
    `Alter Name: ${alterName}, Neuer Name: ${neuerName}`
  );

  alert("Kunde geändert");
  location.reload();
}


async function deleteKunde(id, name) {
  if (!confirm("Diesen Kunden wirklich löschen? Historie bleibt erhalten.")) {
    return;
  }

  await api("kunden?id=eq." + id, {
    method: "DELETE"
  });

  await logAktion(
    "Kunde gelöscht",
    "",
    `Name: ${name}`
  );

  alert("Kunde gelöscht");
  location.reload();
}


async function addKunde() {
  const name = document.getElementById("neuerKundeName").value.trim();

  if (!name) {
    alert("Kundenname eingeben.");
    return;
  }

  const vorhanden = await api(
    "kunden?name=eq." + encodeURIComponent(name) + "&select=id"
  );

  if (vorhanden.length) {
    alert("Kunde existiert bereits.");
    return;
  }

  await api("kunden", {
    method: "POST",
    body: JSON.stringify({
      name: name
    })
  });

  await logAktion(
    "Kunde hinzugefügt",
    "",
    `Name: ${name}`
  );

  alert("Kunde hinzugefügt");
  location.reload();
}

