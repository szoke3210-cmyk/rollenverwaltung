async function ladeAlleDatensaetze(tabelle, sortierung = "id.asc") {
  const alleDaten = [];
  const schritt = 1000;
  let von = 0;

  while (true) {
    const daten = await api(
      `${tabelle}?select=*&order=${sortierung}`,
      {
        headers: {
          Range: `${von}-${von + schritt - 1}`,
          Prefer: "count=exact"
        }
      }
    );

    if (!Array.isArray(daten)) {
      throw new Error(
        `Fehler beim Laden der Tabelle: ${tabelle}`
      );
    }

    alleDaten.push(...daten);

    if (daten.length < schritt) {
      break;
    }

    von += schritt;
  }

  return alleDaten;
}

async function backupHerunterladen() {
  try {
    const [
      rollen,
      typen,
      historie,
      kunden,
      aktivitaet,
      qrBemerkungen
    ] = await Promise.all([
      ladeAlleDatensaetze("rollen"),
      ladeAlleDatensaetze("typen", "typ.asc"),
      ladeAlleDatensaetze("historie"),
      ladeAlleDatensaetze("kunden"),
      ladeAlleDatensaetze("aktivitaet"),
      ladeAlleDatensaetze("qr_bemerkungen")
    ]);

    const backup = {
      backup_version: 2,
      app: "Saveline Rollenverwaltung",
      erstellt_am: new Date().toISOString(),

      tabellen: {
        rollen,
        typen,
        historie,
        kunden,
        aktivitaet,
        qr_bemerkungen: qrBemerkungen
      },

      anzahl: {
        rollen: rollen.length,
        typen: typen.length,
        historie: historie.length,
        kunden: kunden.length,
        aktivitaet: aktivitaet.length,
        qr_bemerkungen: qrBemerkungen.length
      }
    };

    const json = JSON.stringify(backup, null, 2);

    const blob = new Blob([json], {
      type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const jetzt = new Date();

    const datum = [
      jetzt.getFullYear(),
      String(jetzt.getMonth() + 1).padStart(2, "0"),
      String(jetzt.getDate()).padStart(2, "0")
    ].join("-");

    const uhrzeit = [
      String(jetzt.getHours()).padStart(2, "0"),
      String(jetzt.getMinutes()).padStart(2, "0"),
      String(jetzt.getSeconds()).padStart(2, "0")
    ].join("-");

    link.href = url;
    link.download =
      `saveline_vollbackup_${datum}_${uhrzeit}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    console.log("Vollbackup erstellt:", backup);

    alert(
      "Vollbackup wurde heruntergeladen.\n\n" +
      `Rollen: ${rollen.length}\n` +
      `Typen: ${typen.length}\n` +
      `Historie: ${historie.length}\n` +
      `Kunden: ${kunden.length}\n` +
      `Aktivität: ${aktivitaet.length}\n` +
      `QR-Bemerkungen: ${qrBemerkungen.length}`
    );
  } catch (error) {
    console.error("Backup Fehler:", error);

    alert(
      "Backup konnte nicht erstellt werden.\n\n" +
      (error?.message || "Unbekannter Fehler")
    );
  }
}
