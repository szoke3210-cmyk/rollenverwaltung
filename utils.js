function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(status) {
  let background = "#6c757d";
  if (status === "Im Lager") background = "#198754";
  else if (status === "Electrotherm") background = "#fd7e14";
  else if (status === "Verbraucht") background = "#dc3545";
  else if (status === "Nicht freigegeben") {
  background = "#d97706";
}

  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${background};color:white;font-weight:bold;font-size:13px;">${escapeHtml(status || "-")}</span>`;
}
