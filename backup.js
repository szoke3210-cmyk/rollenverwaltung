async function ladeAlleDatensaetze(tabelle) {
  const alleDaten = [];
  const schritt = 1000;
  let von = 0;

  while (true) {
    const daten = await api(
      `${tabelle}?select=*&order=id.asc`,
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
    const rollen = await ladeAlleDatensaetze("rollen");
    const historie = await ladeAlleDatensaetze("historie");
    const kunden = await ladeAlleDatensaetze("kunden");

    const backup = {
      erstellt_am: new Date().toISOString(),
      rollen,
      historie,
      kunden
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const datum = new Date()
      .toISOString()
      .slice(0, 10);

    link.href = url;
    link.download = `saveline_backup_${datum}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    alert("Backup wurde heruntergeladen.");
  } catch (error) {
    console.error("Backup Fehler:", error);
    alert("Backup konnte nicht erstellt werden.");
  }
}
