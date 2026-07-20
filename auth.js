async function loginSupabase() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const loginButton = document.getElementById("loginButton");
  const loginError = document.getElementById("loginError");

  if (!emailInput || !passwordInput) {
    console.error("Login Eingabefelder nicht gefunden");
    return false;
  }

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  loginError.textContent = "";

  if (!email || !password) {
    loginError.textContent = "Bitte E-Mail und Passwort eingeben.";
    return false;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Anmeldung läuft...";

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
  console.error("Login Fehler:", error);

  loginError.textContent =
    "Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.";

  return false;
}

accessToken = data.session.access_token;
currentUser = data.session.user;

await logAktion("Anmeldung");

location.reload();
return true;
    
  } catch (error) {
    console.error("Login Fehler:", error);

    loginError.textContent =
      "Bei der Anmeldung ist ein Fehler aufgetreten.";

    return false;

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Anmelden";
  }
}


function showLogin() {
  const app = document.getElementById("app");

  if (!app) return;

  app.innerHTML = `
    <div class="login-page">
      <div class="login-box">

        <h1>Rollenverwaltung</h1>

        <p class="login-description">
          Bitte melden Sie sich an.
        </p>

        <label for="loginEmail">E-Mail-Adresse</label>

        <input
          id="loginEmail"
          type="email"
          autocomplete="username"
          placeholder="name@firma.de"
        >

        <label for="loginPassword">Passwort</label>

        <input
          id="loginPassword"
          type="password"
          autocomplete="current-password"
          placeholder="Passwort"
          onkeydown="loginEnter(event)"
        >

        <div id="loginError" class="login-error"></div>

        <button
          id="loginButton"
          type="button"
          onclick="loginSupabase()"
        >
          Anmelden
        </button>

      </div>
    </div>
  `;

  document.getElementById("loginEmail")?.focus();
}


function loginEnter(event) {
  if (event.key === "Enter") {
    loginSupabase();
  }
}


async function initSupabaseSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session Fehler:", error);

      accessToken = null;
      currentUser = null;
      isAdmin = false;
      currentUserRole = "user";

      showLoggedInUser();
      return false;
    }

    if (data?.session) {
      accessToken = data.session.access_token;
      currentUser = data.session.user;

      await loadUserRole();
      showLoggedInUser();

      return true;
    }

    accessToken = null;
    currentUser = null;
    isAdmin = false;
    currentUserRole = "user";

    showLoggedInUser();
    return false;

  } catch (error) {
    console.error("Session Fehler:", error);

    accessToken = null;
    currentUser = null;
    isAdmin = false;
    currentUserRole = "user";

    showLoggedInUser();
    return false;
  }
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
    localStorage.setItem("savelineUserRole", role);

    console.log("Benutzerrolle:", currentUserRole);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzerrolle:", error);

    const cachedRole = localStorage.getItem("savelineUserRole") || "user";
    currentUserRole = cachedRole;
    isAdmin = cachedRole === "admin";
  }
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
  accessToken = null;
  currentUser = null;

  location.href = window.location.pathname;
}
