const SPOTS = [
  {
    id: "1615-q-st",
    title: "1615 Q St NW",
    address: "1615 Q St NW, Washington, DC 20009",
    lat: 38.91118,
    lng: -77.03723
  },
  {
    id: "1825-new-hampshire",
    title: "1825 New Hampshire Ave NW",
    address: "1825 New Hampshire Ave NW, Washington, DC 20009",
    lat: 38.91536,
    lng: -77.04102
  },
  {
    id: "1545-18th",
    title: "1545 18th St NW",
    address: "1545 18th St NW, Washington, DC 20036",
    lat: 38.91058,
    lng: -77.04163
  },
  {
    id: "1711-massachusetts",
    title: "1711 Massachusetts Ave NW",
    address: "1711 Massachusetts Ave NW, Washington, DC 20036",
    lat: 38.90873,
    lng: -77.03894
  },
  {
    id: "1701-16th",
    title: "1701 16th St NW",
    address: "1701 16th St NW, Washington, DC 20009",
    lat: 38.91285,
    lng: -77.03614
  },
  {
    id: "1355-17th",
    title: "1355 17th St NW",
    address: "1355 17th St NW, Washington, DC 20036",
    lat: 38.90850,
    lng: -77.03836
  },
  {
    id: "1601-18th",
    title: "1601 18th St NW",
    address: "1601 18th St NW, Washington, DC 20009",
    lat: 38.91142,
    lng: -77.04155
  },
  {
    id: "1525-20th-q-entrance",
    title: "Q Street Dupont entrance",
    address: "1525 20th St NW, Washington, DC 20036",
    lat: 38.91048,
    lng: -77.04488
  },
  {
    id: "1351-19th-south-entrance",
    title: "South Entrance Dupont Circle",
    address: "1351 19th St NW, Washington, DC 20036",
    lat: 38.90875,
    lng: -77.04327
  },
  {
    id: "1616-18th",
    title: "1616 18th St NW",
    address: "1616 18th St NW, Washington, DC 20009",
    lat: 38.91186,
    lng: -77.04194
  },
  {
    id: "1514-17th",
    title: "1514 17th St NW",
    address: "1514 17th St NW, Washington, DC 20036",
    lat: 38.91009,
    lng: -77.03835
  }
];

const STORAGE_KEY = "dupont-flyer-priority-map";
const RESET_HOUR = 0;
const RESET_DAY = 2;
const state = loadState();
const markers = new Map();
let activeSpotId = null;

const map = L.map("map", {
  zoomControl: false
}).setView([38.91095, -77.04055], 16);

L.control.zoom({
  position: "bottomright"
}).addTo(map);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

const bounds = L.latLngBounds(SPOTS.map((spot) => [spot.lat, spot.lng]));
map.fitBounds(bounds.pad(0.22));

const spotList = document.querySelector("#spot-list");
const completedCount = document.querySelector("#completed-count");
const meterFill = document.querySelector("#meter-fill");
const resetCopy = document.querySelector("#reset-copy");
const dialog = document.querySelector("#spot-dialog");
const form = document.querySelector("#spot-form");
const dialogTitle = document.querySelector("#dialog-title");
const dialogAddress = document.querySelector("#dialog-address");
const existingEntry = document.querySelector("#existing-entry");
const entryFields = document.querySelector("#entry-fields");
const entryImage = document.querySelector("#entry-image");
const entryName = document.querySelector("#entry-name");
const entryTime = document.querySelector("#entry-time");
const entryDescription = document.querySelector("#entry-description");
const nameInput = document.querySelector("#name-input");
const imageInput = document.querySelector("#image-input");
const descriptionInput = document.querySelector("#description-input");
const clearSpotButton = document.querySelector("#clear-spot");
const closeDialogButton = document.querySelector("#close-dialog");
const manualResetButton = document.querySelector("#manual-reset");
const exportButton = document.querySelector("#export-data");
const importInput = document.querySelector("#import-data");
const template = document.querySelector("#spot-item-template");

SPOTS.forEach((spot, index) => {
  const marker = L.marker([spot.lat, spot.lng], {
    icon: createMarkerIcon(spot, index)
  }).addTo(map);

  marker.on("click", () => openSpot(spot.id));
  markers.set(spot.id, marker);

  const node = template.content.cloneNode(true);
  const button = node.querySelector(".spot-item");
  const status = node.querySelector(".spot-status");
  const title = node.querySelector("strong");
  const subtitle = node.querySelector("small");

  button.dataset.spotId = spot.id;
  button.addEventListener("click", () => {
    openSpot(spot.id);
    map.flyTo([spot.lat, spot.lng], 18, { duration: 0.5 });
  });
  status.dataset.number = String(index + 1);
  title.textContent = spot.title;
  subtitle.textContent = spot.address;
  spotList.append(node);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const spot = getActiveSpot();
  if (!spot) return;

  const existing = state.entries[spot.id];
  const file = imageInput.files[0];

  if (!existing && !file) {
    imageInput.reportValidity();
    return;
  }

  const image = file ? await resizeImage(file) : existing.image;

  state.entries[spot.id] = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    image,
    completedAt: existing?.completedAt || new Date().toISOString()
  };

  saveState();
  render();
  dialog.close();
});

clearSpotButton.addEventListener("click", () => {
  const spot = getActiveSpot();
  if (!spot) return;
  delete state.entries[spot.id];
  saveState();
  render();
  openSpot(spot.id);
});

closeDialogButton.addEventListener("click", () => {
  dialog.close();
});

manualResetButton.addEventListener("click", () => {
  if (!window.confirm("Clear all marked flyer spots for this browser?")) return;
  state.entries = {};
  state.cycleKey = getCycleKey(new Date());
  saveState();
  render();
});

exportButton.addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    cycleKey: state.cycleKey,
    entries: state.entries
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dupont-flyer-spots-${state.cycleKey}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async () => {
  const file = importInput.files[0];
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    state.entries = imported.entries || {};
    state.cycleKey = imported.cycleKey || getCycleKey(new Date());
    saveState();
    render();
  } catch {
    window.alert("That file could not be imported.");
  } finally {
    importInput.value = "";
  }
});

render();

function openSpot(id) {
  const spot = SPOTS.find((item) => item.id === id);
  if (!spot) return;

  activeSpotId = id;
  const entry = state.entries[id];
  dialogTitle.textContent = spot.title;
  dialogAddress.textContent = spot.address;
  clearSpotButton.hidden = !entry;

  nameInput.value = entry?.name || "";
  descriptionInput.value = entry?.description || "";
  imageInput.required = !entry;
  imageInput.value = "";

  if (entry) {
    existingEntry.hidden = false;
    entryFields.hidden = false;
    entryImage.src = entry.image;
    entryImage.alt = `Flyer proof uploaded by ${entry.name}`;
    entryName.textContent = entry.name;
    entryTime.textContent = formatDate(entry.completedAt);
    entryDescription.textContent = entry.description;
    document.querySelector("#save-spot").textContent = "Update entry";
  } else {
    existingEntry.hidden = true;
    entryFields.hidden = false;
    document.querySelector("#save-spot").textContent = "Mark complete";
  }

  dialog.showModal();
}

function getActiveSpot() {
  return SPOTS.find((spot) => spot.id === activeSpotId);
}

function render() {
  const completed = Object.keys(state.entries).length;
  completedCount.textContent = String(completed);
  meterFill.style.width = `${Math.round((completed / SPOTS.length) * 100)}%`;
  resetCopy.textContent = `Auto-resets after the second Monday ends. Next reset: ${formatDate(getNextResetDate())}.`;

  SPOTS.forEach((spot, index) => {
    const entry = state.entries[spot.id];
    const marker = markers.get(spot.id);
    if (marker) {
      marker.setIcon(createMarkerIcon(spot, index));
      marker.bindPopup(createPopup(spot, entry));
    }
  });

  document.querySelectorAll(".spot-item").forEach((button) => {
    const spot = SPOTS.find((item) => item.id === button.dataset.spotId);
    const entry = state.entries[spot.id];
    const subtitle = button.querySelector("small");
    button.classList.toggle("is-complete", Boolean(entry));
    subtitle.textContent = entry
      ? `${entry.name} · ${formatDate(entry.completedAt)}`
      : spot.address;
  });
}

function createMarkerIcon(spot, index) {
  const complete = Boolean(state.entries[spot.id]);
  return L.divIcon({
    className: "",
    html: `<span class="marker-pin ${complete ? "is-complete" : ""}">${complete ? "&#10003;" : index + 1}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

function createPopup(spot, entry) {
  if (!entry) {
    return `<div class="popup-copy"><strong>${escapeHtml(spot.title)}</strong><span>${escapeHtml(spot.address)}</span></div>`;
  }

  return `
    <div class="popup-copy">
      <strong>${escapeHtml(spot.title)}</strong>
      <span>Marked by ${escapeHtml(entry.name)}</span>
      <span>${escapeHtml(formatDate(entry.completedAt))}</span>
    </div>
  `;
}

function loadState() {
  const cycleKey = getCycleKey(new Date());
  const fallback = { cycleKey, entries: {} };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.cycleKey !== cycleKey) return fallback;
    return {
      cycleKey,
      entries: saved.entries || {}
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCycleKey(date) {
  const reset = getMostRecentResetDate(date);
  return reset.toISOString().slice(0, 10);
}

function getMostRecentResetDate(date) {
  const thisMonthReset = getMonthlyResetDate(date.getFullYear(), date.getMonth());
  if (date >= thisMonthReset) return thisMonthReset;

  const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return getMonthlyResetDate(previousMonth.getFullYear(), previousMonth.getMonth());
}

function getNextResetDate() {
  const now = new Date();
  const thisMonthReset = getMonthlyResetDate(now.getFullYear(), now.getMonth());
  if (now < thisMonthReset) return thisMonthReset;

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return getMonthlyResetDate(nextMonth.getFullYear(), nextMonth.getMonth());
}

function getMonthlyResetDate(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const daysUntilMonday = (1 - firstOfMonth.getDay() + 7) % 7;
  const secondMonday = 1 + daysUntilMonday + 7;
  return new Date(year, month, secondMonday + 1, RESET_HOUR, 0, 0, 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image."));
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}
