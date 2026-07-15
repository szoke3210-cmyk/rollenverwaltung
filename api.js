function getHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

async function api(path, options = {}) {
  const { data, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) console.error("Session Fehler:", sessionError);
  if (data?.session) accessToken = data.session.access_token;

  if (!accessToken) {
    console.error("Keine aktive Sitzung für API-Aufruf:", path);
    return [];
  }

  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) }
  });

  if (res.status === 401 || res.status === 403) {
    console.error("Sitzung oder Berechtigung ungültig:", await res.text());
    accessToken = null;
    currentUser = null;
    isAdmin = false;
    currentUserRole = "user";
    showLoggedInUser();
    showLogin();
    return [];
  }

  if (!res.ok) {
    alert("Fehler: " + await res.text());
    return [];
  }

  if (res.status === 204) return [];
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}
