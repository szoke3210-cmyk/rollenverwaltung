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

  const rollen = await api(
    "rollen?typ=eq." +
    encodeURIComponent(typ) +
    "&select=*"
  );

  const typDaten = await api(
    "typen?typ=eq." +
    encodeURIComponent(typ) +
    "&select=*"
  );

  const meter = rollen.reduce(
    (sum, r) => sum + Number(r.aktuelle_laenge),
    0
  );

  const artikel =
    typDaten.length > 0
      ? (typDaten[0].artikel || "")
      : "";

  document.getElementById("typEditor").innerHTML = `
    <div class="box">
      <h3>${typ}</h3>

      <p>Rollen: ${rollen.length}</p>
      <p>Meter: ${meter.toFixed(2)} m</p>

      <label>Neuer Typname</label>
      <input id="newTypName" value="${typ}">

      <label>ArtN.</label>
      <input id="editArtikel" value="${artikel}">

      <br><br>

      <button onclick="renameTyp('${typ}')">
        💾 Speichern
      </button>

      <button
        onclick="deleteTyp('${typ}')"
        style="background:#dc3545;"
      >
        🗑️ Typ löschen
      </button>
    </div>
  `;
}


async function renameTyp(altTyp) {
  const neuerTyp = document
    .getElementById("newTypName")
    .value
    .trim();

  const neuerArtikel = document
    .getElementById("editArtikel")
    .value
    .trim();

  if (!neuerTyp) {
    alert("Neuen Typ eingeben.");
    return;
  }

  try {
    // Típusnév és ArtN. módosítása a typen táblában
    await api(
      "typen?typ=eq." + encodeURIComponent(altTyp),
      {
        method: "PATCH",
        body: JSON.stringify({
          typ: neuerTyp,
          artikel: neuerArtikel
        })
      }
    );

    // A hozzá tartozó Rollen típusnevének módosítása
    if (neuerTyp !== altTyp) {
      await api(
        "rollen?typ=eq." + encodeURIComponent(altTyp),
        {
          method: "PATCH",
          body: JSON.stringify({
            typ: neuerTyp
          })
        }
      );
    }

    await logAktion(
      "Typ geändert",
      "",
      `Alt: ${altTyp}, Neu: ${neuerTyp}, ArtN.: ${neuerArtikel || "-"}`
    );

    alert("Typ und ArtN. geändert");
    location.reload();

  } catch (error) {
    console.error("Fehler beim Ändern des Typs:", error);
    alert("Typ konnte nicht geändert werden");
  }
}


async function deleteTyp(typ) {
  const bestaetigt = confirm(
    `Typ "${typ}" wirklich löschen?\n\n` +
    `Alle Rollen dieses Typs werden ebenfalls gelöscht.\n` +
    `Die Historie und Statistik bleiben erhalten.`
  );

  if (!bestaetigt) {
    return;
  }

  try {
    // Megnézzük, mely Rollen tartoznak a típushoz
    const rollen = await api(
      "rollen?typ=eq." +
      encodeURIComponent(typ) +
      "&select=id,kennung"
    );

    // A Rollen törlése
    if (rollen.length > 0) {
      await api(
        "rollen?typ=eq." + encodeURIComponent(typ),
        {
          method: "DELETE"
        }
      );
    }

    // Maga a típus törlése a typen táblából
    await api(
      "typen?typ=eq." + encodeURIComponent(typ),
      {
        method: "DELETE"
      }
    );

    await logAktion(
      "Typ gelöscht",
      "",
      `Typ: ${typ}, gelöschte Rollen: ${rollen.length}`
    );

    alert(
      `Typ gelöscht.\n` +
      `${rollen.length} Rolle(n) wurden gelöscht.\n` +
      `Die Historie bleibt erhalten.`
    );

    location.href = "index.html";

  } catch (error) {
    console.error("Fehler beim Löschen des Typs:", error);

    alert(
      "Typ konnte nicht vollständig gelöscht werden:\n" +
      (error.message || error)
    );
  }
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
