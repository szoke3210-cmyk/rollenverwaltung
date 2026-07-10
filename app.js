console.log("app.js betöltve");
const params = new URLSearchParams(window.location.search);
const kennung = params.get("id");
const typFilter = params.get("typ");
const page = params.get("page");

let isAdmin = false;
let currentUserRole = "user";
let currentUser = null;
  
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

function showLoggedInUser() {
  const userInfo = document.getElementById("userInfo");

  if (!userInfo) {
    console.error("A userInfo elem nem található.");
    return;
  }

  if (!currentUser?.email) {
    userInfo.innerHTML = "";
    return;
  }

  userInfo.innerHTML = `
  <span class="user-email">
    ${currentUser.email}
    ${isAdmin ? `<small class="user-role">Admin</small>` : ""}
  </span>

  <button class="logout-button" onclick="logoutUser()">
    Logout
  </button>
`;
}

async function logoutUser() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Logout fehlgeschlagen: " + error.message);
    return;
  }

  localStorage.removeItem("adminMode");
  accessToken = null;
  currentUser = null;

  location.href = window.location.pathname;
}


async function loadUserRole() {
  if (!currentUser?.id || !accessToken) {
    isAdmin = false;
    currentUserRole = "user";
    return;
  }

  try {
    const res = await fetch(
      SUPABASE_URL +
        "/rest/v1/profiles?id=eq." +
        encodeURIComponent(currentUser.id) +
        "&select=role",
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + accessToken
        }
      }
    );

    if (!res.ok) {
      console.error("Rolle konnte nicht geladen werden:", await res.text());
      isAdmin = false;
      currentUserRole = "user";
      return;
    }

    const profiles = await res.json();
    const role = profiles[0]?.role || "user";

    currentUserRole = role;
    isAdmin = role === "admin";

    console.log("Benutzerrolle:", currentUserRole);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzerrolle:", error);

    isAdmin = false;
    currentUserRole = "user";
  }
}

async function startApp() {
  const eingeloggt = await initSupabaseSession();

  // A QR-kódról megnyitott nyilvános Rolle
  if (kennung && !eingeloggt) {
    showPublicRolle();
    return;
  }

  // Normál oldal bejelentkezés nélkül
  if (!eingeloggt) {
    showLogin();
    return;
  }

  if (page === "statistik") {
    showStatistik();
  } else if (page === "typen") {
    showTypen();
  } else if (page === "auswahl") {
    showAuswahl();
  } else if (page === "kunden") {
    showKunden();
  } else if (page === "scanner") {
    showScanner();
  } else if (kennung) {
    showDetail();
  } else {
    showList();
  }
}

startApp();
