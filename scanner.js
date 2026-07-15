function showScanner() {
  document.getElementById("app").innerHTML = `
    <div class="box">
      <h2>QR-Code scannen</h2>
      <div id="reader" style="width:100%; max-width:400px;"></div>
      <button onclick="location.href='index.html'">Zur Übersicht</button>
    </div>
  `;

  const scanner = new Html5Qrcode("reader");

  scanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: 250
    },
    decodedText => {
      scanner.stop();

      try {
        const url = new URL(decodedText);
        const id = url.searchParams.get("id");

        if (id) {
          location.href = "?id=" + encodeURIComponent(id);
        } else {
          alert("Kein Rollen-ID im QR-Code gefunden.");
        }
      } catch (e) {
        location.href = "?id=" + encodeURIComponent(decodedText);
      }
    }
  );
}
