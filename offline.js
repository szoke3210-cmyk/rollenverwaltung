(function () {
  const STATUS_ID = "connectionStatus";

  function ensureStatusElement() {
    let element = document.getElementById(STATUS_ID);
    if (element) return element;

    element = document.createElement("div");
    element.id = STATUS_ID;
    element.className = "connection-status";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    document.body.appendChild(element);
    return element;
  }

  function updateConnectionStatus(extraText = "") {
    const element = ensureStatusElement();
    const online = navigator.onLine;

    element.textContent = online ? (extraText || "Online") : "Offline";
    element.classList.toggle("is-online", online);
    element.classList.toggle("is-offline", !online);
    document.documentElement.classList.toggle("app-offline", !online);
  }

  window.addEventListener("online", () => updateConnectionStatus("Online"));
  window.addEventListener("offline", () => updateConnectionStatus());

  document.addEventListener("DOMContentLoaded", async () => {
    updateConnectionStatus();

    if (!("serviceWorker" in navigator)) {
      console.warn("Service Worker wird von diesem Browser nicht unterstützt.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js?v=2", {
        scope: "./",
        updateViaCache: "none"
      });

      await registration.update();
      await navigator.serviceWorker.ready;
      console.log("Service Worker bereit:", registration.scope);

      // Az első telepítés után egyszer újratölt, hogy az oldal már a SW ellenőrzése alatt fusson.
      if (!navigator.serviceWorker.controller && navigator.onLine) {
        const key = "saveline-sw-v2-reload";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          location.reload();
          return;
        }
      }

      updateConnectionStatus("Online · Offline mód kész");
    } catch (error) {
      console.error("Service Worker Registrierung fehlgeschlagen:", error);
      updateConnectionStatus("Online · Offline mód hibás");
    }
  });
})();
