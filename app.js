console.log("app.js betöltve");
const params = new URLSearchParams(window.location.search);
const kennung = params.get("id");
const typFilter = params.get("typ");
const page = params.get("page");

let isAdmin = localStorage.getItem("adminMode") === "true";
  
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

  if (!userInfo) return;

  const email = currentUser?.email;

  if (!email) {
    userInfo.innerHTML = "";
    return;
  }

  userInfo.innerHTML = `
    <span class="user-email">${escapeHtml(email)}</span>

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
  location.href = "index.html";
}

function showLoggedInUser() {
  const userInfo = document.getElementById("userInfo");

  if (!userInfo) return;

  const email = currentUser?.email;

  if (!email) {
    userInfo.innerHTML = "";
    return;
  }

  userInfo.innerHTML = `
    <span class="user-email">${email}</span>

    <button class="logout-button" onclick="logoutUser()">
      Logout
    </button>
  `;
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
