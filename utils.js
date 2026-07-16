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
  let icon = "⚪";

  if (status === "Im Lager") {
    background = "#198754";
    icon = "🏠";
  } else if (status === "Electrotherm") {
    background = "#fd7e14";
    icon = "🚚";
  } else if (status === "Verbraucht") {
    background = "#dc3545";
    icon = "🗑️";
  } else if (status === "Nicht freigegeben") {
    background = "#7c3aed";
    icon = "🔒";
  }

  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${background};color:white;font-weight:bold;font-size:13px;">${icon} ${escapeHtml(status || "-")}</span>`;
}
