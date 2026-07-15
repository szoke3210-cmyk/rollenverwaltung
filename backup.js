async function ladeAlleDatensaetze(tabelle) {
  const seitenGroesse = 1000;
  let start = 0;
  let alleDaten = [];

  while (true) {
    const { data, error } = await supabaseClient
      .from(tabelle)
      .select("*")
      .range(start, start + seitenGroesse - 1);

    if (error) {
      throw new Error(
        `Fehler beim Laden der Tabelle "${tabelle}": ${error.message}`
      );
    }

    alleDaten = alleDaten.concat(data || []);

    if (!data || data.length < seitenGroesse) {
      break;
    }

    start += seitenGroesse;
  }

  return alleDaten;
}


async function downloadBackup(button) {
  if (!isAdmin) {
    alert("Nur Administratoren dürfen ein Backup erstellen.");
    return;
  }

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Backup wird erstellt...";
    }

    const [rollen, historie, kunden] = await Promise.all([
      ladeAlleDatensaetze("rollen"),
      ladeAlleDatensaetze("historie"),
      ladeAlleDatensaetze("kunden")
    ]);

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
      .replace(/[:.]/g, "-");

    link.href = url;
    link.download = `rollenverwaltung_backup_${datum}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    await logAktion(
      "Backup erstellt",
      "",
      `Rollen: ${rollen.length}, Historie: ${historie.length}, Kunden: ${kunden.length}`
    );

    alert(
      `Backup erfolgreich erstellt.\n\n` +
      `Rollen: ${rollen.length}\n` +
      `Historie: ${historie.length}\n` +
      `Kunden: ${kunden.length}`
    );

  } catch (error) {
    console.error("Backup-Fehler:", error);
    alert("Backup konnte nicht erstellt werden:\n" + error.message);

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "💾 Backup herunterladen";
    }
  }
}

