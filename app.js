console.log("app.js betöltve");
const params = new URLSearchParams(window.location.search);
const kennung = params.get("id");
const typFilter = params.get("typ");
const page = params.get("page");

let isAdmin = localStorage.getItem("adminMode") === "true";
let mitarbeiterMode = localStorage.getItem("mitarbeiterMode") === "true";
const MITARBEITER_PIN = "2580";
  
