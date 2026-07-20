async function showPublicRolle() {
  const app = document.getElementById("app");

  const publicHeaders = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  let rollen = [];

  if (!navigator.onLine && window.SavelineOffline) {
    rollen = await window.SavelineOffline.localGet(
      "rollen?kennung=eq." + encodeURIComponent(kennung) + "&select=*"
    );
  } else {
    try {
      const res = await fetch(
        SUPABASE_URL + "/rest/v1/rollen?kennung=eq." + encodeURIComponent(kennung),
        { headers: publicHeaders }
      );
      if (!res.ok) throw new Error(await res.text());
      rollen = await res.json();
      if (window.SavelineOffline) {
        await window.SavelineOffline.cacheGet(
          "rollen?kennung=eq." + encodeURIComponent(kennung) + "&select=*",
          rollen
        );
      }
    } catch (error) {
      console.warn("QR-Rolle wird aus Offline-Speicher geladen:", error);
      if (window.SavelineOffline) {
        rollen = await window.SavelineOffline.localGet(
          "rollen?kennung=eq." + encodeURIComponent(kennung) + "&select=*"
        );
      }
    }
  }

  if (!rollen.length) {
    app.innerHTML = "<h2>Rolle nicht gefunden</h2>";
    return;
  }

  const r = rollen[0];
  const qrBemerkungen = await loadQrBemerkungen(r.id);

  app.innerHTML = `
<div class="container">
  <div class="box">
    <h2>Rolle ${r.kennung}</h2>

    <p><b>Typ:</b> ${r.typ || ""}</p>
    <p><b>Aktuelle Länge:</b> ${r.aktuelle_laenge || 0} m</p>
    <p><b>Status:</b> ${r.status || ""}</p>
    <p><b>Bemerkung:</b> ${r.bemerkung || ""}</p>

    <hr>

    <h3>QR-Bemerkungen</h3>

    <div class="qr-bemerkung-liste">
      ${renderQrBemerkungenListe(qrBemerkungen, false)}
    </div>

    <label>Neue Bemerkung</label>

    <textarea
      id="publicBemerkung"
      placeholder="Neue Bemerkung eingeben..."
    ></textarea>

    <button onclick="savePublicBemerkung(${r.id})">
      Bemerkung hinzufügen
    </button>

  </div>
</div>
`;
}


function qrUrl(kennung) {
  return location.origin + location.pathname + "?id=" + encodeURIComponent(kennung);
}


function downloadQRMitFarben(kennung, typ, url) {
  const farben = getTypFarben(typ);

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1000;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bal félkör
ctx.beginPath();
ctx.moveTo(450, 420);
ctx.arc(450, 420, 380, Math.PI / 2, Math.PI * 1.5, false);
ctx.closePath();
ctx.fillStyle = farben[0];
ctx.fill();

// Jobb félkör
ctx.beginPath();
ctx.moveTo(450, 420);
ctx.arc(450, 420, 380, Math.PI * 1.5, Math.PI / 2, false);
ctx.closePath();
ctx.fillStyle = farben[1];
ctx.fill();

// Külső kör kerete
ctx.beginPath();
ctx.arc(450, 420, 380, 0, Math.PI * 2);
ctx.strokeStyle = "#888";
ctx.lineWidth = 4;
ctx.stroke();

  // Külső kör szürke kerete (hogy a fehér fél is látszódjon)
ctx.beginPath();
ctx.arc(450, 420, 380, 0, Math.PI * 2);
ctx.strokeStyle = "#999999";
ctx.lineWidth = 4;
ctx.stroke();

  ctx.beginPath();
  ctx.arc(450, 420, 260, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const qrImg = new Image();
  qrImg.crossOrigin = "anonymous";
  qrImg.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=" +
    encodeURIComponent(url);

  qrImg.onload = function () {
    ctx.drawImage(qrImg, 240, 210, 420, 420);

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";

    ctx.font = "bold 54px Arial";
    ctx.fillText(kennung, 450, 860);

    ctx.font = "bold 42px Arial";
    ctx.fillText(typ, 450, 925);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "QR-" + kennung + ".png";
    a.click();
  };
}


async function savePublicBemerkung(rollenId) {
  const input = document.getElementById("publicBemerkung");
  const text = input?.value.trim();

  if (!text) {
    alert("Bitte eine Bemerkung eingeben.");
    return;
  }

  const body = {
    rollen_id: rollenId,
    bemerkung: text,
    erstellt_von: currentUser?.email || "QR öffentlich"
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/qr_bemerkungen`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) {
  const fehler = await res.text();
  console.error("QR Bemerkung Fehler:", fehler);
  alert("Bemerkung konnte nicht gespeichert werden.");
  return;
}

await logAktion(
  "QR-Bemerkung hinzugefügt",
  kennung || "",
  text,
  currentUser?.email || "Öffentlicher QR-Zugriff"
);

input.value = "";

if (accessToken) {
  await showDetail();
} else {
  await showPublicRolle();
}
  } catch (error) {
    console.error(error);
    alert("Bemerkung konnte nicht gespeichert werden.");
  }
}


async function loadQrBemerkungen(rollenId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/qr_bemerkungen?rollen_id=eq.${rollenId}&select=*&order=erstellt_am.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_KEY}`
        }
      }
    );

    if (!res.ok) {
      console.error("QR Bemerkungen Fehler:", await res.text());
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error("QR Bemerkungen Fehler:", error);
    return [];
  }
}


function renderQrBemerkungenListe(bemerkungen, adminModus = false) {
  if (!bemerkungen.length) {
    return `
      <div class="qr-bemerkung-empty">
        Noch keine QR-Bemerkungen vorhanden.
      </div>
    `;
  }

  return bemerkungen.map(eintrag => {
    const datum = new Date(eintrag.erstellt_am).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return `
      <div class="qr-bemerkung-eintrag">
        <div class="qr-bemerkung-kopf">
          <strong>🕒 ${datum}</strong>

          ${adminModus ? `
            <button
              class="delete-small"
              onclick="deleteQrBemerkung(${eintrag.id})"
              title="Bemerkung löschen"
            >
              Löschen
            </button>
          ` : ""}
        </div>

        <div class="qr-bemerkung-text">
          ${escapeHtml(eintrag.bemerkung)}
        </div>

        ${eintrag.erstellt_von ? `
          <div class="qr-bemerkung-benutzer">
            ${escapeHtml(eintrag.erstellt_von)}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}


async function deleteQrBemerkung(id) {
  if (!isAdmin) {
    alert("Nur Administratoren dürfen Bemerkungen löschen.");
    return;
  }

  const bestaetigt = confirm(
    "Möchtest du diese QR-Bemerkung wirklich löschen?"
  );

  if (!bestaetigt) return;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/qr_bemerkungen?id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!res.ok) {
      console.error("Löschen Fehler:", await res.text());
      alert("Bemerkung konnte nicht gelöscht werden.");
      return;
    }

    await logAktion(
      "QR-Bemerkung gelöscht",
      "",
      `Eintrag-ID: ${id}`
    );

    await showDetail();
  } catch (error) {
    console.error(error);
    alert("Bemerkung konnte nicht gelöscht werden.");
  }
}

