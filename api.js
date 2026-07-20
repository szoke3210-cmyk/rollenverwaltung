function getHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

async function api(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const offlineStore = window.SavelineOffline;

  try {
    const { data, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) console.error("Session Fehler:", sessionError);
    if (data?.session) accessToken = data.session.access_token;
  } catch (error) {
    console.warn("Session konnte offline nicht aktualisiert werden:", error);
  }

  if (!accessToken) {
    console.error("Keine aktive Sitzung für API-Aufruf:", path);
    if (method === "GET" && offlineStore) return offlineStore.localGet(path);
    return [];
  }

  if (!navigator.onLine) {
    if (!offlineStore) return [];
    if (method === "GET") return offlineStore.localGet(path);

    const localResult = await offlineStore.applyLocalMutation(path, options);
    await offlineStore.queueMutation(path, options, localResult);
    return localResult;
  }

  try {
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
      const message = await res.text();
      alert("Fehler: " + message);
      return [];
    }

    let result = [];
    if (res.status !== 204) {
      const text = await res.text();
      result = text ? JSON.parse(text) : [];
    }

    if (offlineStore) {
      if (method === "GET") {
        await offlineStore.cacheGet(path, result);
      } else {
        // Online-Mutationen ebenfalls lokal nachvollziehen, damit der Cache aktuell bleibt.
        if (Array.isArray(result) && result.length) {
          await offlineStore.cacheGet(path.split("?")[0] + "?select=*", result);
        } else {
          await offlineStore.applyLocalMutation(path, options);
        }
        offlineStore.syncQueue().catch(console.error);
      }
    }
    return result;
  } catch (error) {
    console.warn("Netzwerkfehler, lokale Daten werden verwendet:", error);
    if (!offlineStore) return [];
    if (method === "GET") return offlineStore.localGet(path);

    const localResult = await offlineStore.applyLocalMutation(path, options);
    await offlineStore.queueMutation(path, options, localResult);
    return localResult;
  }
}
