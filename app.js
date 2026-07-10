console.log("app.js betöltve");
const params = new URLSearchParams(window.location.search);
const kennung = params.get("id");
const typFilter = params.get("typ");
const page = params.get("page");

let isAdmin = localStorage.getItem("adminMode") === "true";
let mitarbeiterMode = localStorage.getItem("mitarbeiterMode") === "true";
const MITARBEITER_PIN = "2580";
  
async function api(path, options = {}) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("supabaseAccessToken");
    accessToken = null;
    alert("Session abgelaufen. Bitte neu einloggen.");
    location.reload();
    return [];
  }

  if (!res.ok) {
    alert("Fehler: " + await res.text());
    return [];
  }

  return await res.json();
}

async function startApp() {
  await initSupabaseSession();

  if (kennung && !accessToken) {
    showPublicRolle();
  } else if (page === "statistik") showStatistik();
  else if (page === "typen") showTypen();
  else if (page === "auswahl") showAuswahl();
  else if (page === "kunden") showKunden();
  else if (page === "scanner") showScanner();
  else if (kennung) showDetail();
  else showList();
}

startApp();
