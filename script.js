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
const backendConfig = window.FLYER_BACKEND_CONFIG || {};
const supabaseClient = createSupabaseClient();
const state = {
  cycleKey: getCycleKey(new Date()),
  entries: {},
  storageMode: supabaseClient ? "shared" : "local",
  isLoading: true
};
const markers = new Map();
let activeSpotId = null;

const map = L.map("map", {
  zoomControl: false
}).setView([38.91095, -77.04055], 16);

L.control.zoom({
  position: "bottomright"
}).addTo(map);

const tileLayers = {
  standard: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ["a", "b", "c"]
  }),
  light: L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: ["a", "b", "c", "d"]
  })
};

let activeTileLayer = tileLayers.standard;
let tileErrorCount = 0;
activeTileLayer.addTo(map);

activeTileLayer.on("tileerror", () => {
  tileErrorCount += 1;
  if (tileErrorCount < 4 || activeTileLayer === tileLayers.light) return;

  map.removeLayer(activeTileLayer);
  activeTileLayer = tileLayers.light;
  activeTileLayer.addTo(map);
});

const bounds = L.latLngBounds(SPOTS.map((spot) => [spot.lat, spot.lng]));
map.fitBounds(bounds.pad(0.22));
refreshMapLayout();
window.addEventListener("resize", refreshMapLayout);
window.addEventListener("orientationchange", refreshMapLayout);
window.addEventListener("pageshow", refreshMapLayout);

const spotList = document.querySelector("#spot-list");
const completedCount = document.querySelector("#completed-count");
const meterFill = document.querySelector("#meter-fill");
const resetCopy = document.querySelector("#reset-copy");
const storageNote = document.querySelector(".storage-note");
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
    refreshMapLayout();
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

  setFormSaving(true);

  try {
    await saveEntry(spot, {
      name: nameInput.value.trim(),
      description: descriptionInput.value.trim(),
      file,
      existing
    });
    render();
    dialog.close();
  } catch (error) {
    window.alert(error.message || "This spot could not be saved.");
  } finally {
    setFormSaving(false);
  }
});

clearSpotButton.addEventListener("click", () => {
  const spot = getActiveSpot();
  if (!spot) return;
  clearEntry(spot).then(() => {
    render();
    openSpot(spot.id);
  }).catch((error) => {
    window.alert(error.message || "This spot could not be cleared.");
  });
});

closeDialogButton.addEventListener("click", () => {
  dialog.close();
});

manualResetButton.addEventListener("click", () => {
  const target = state.storageMode === "shared" ? "everyone" : "this browser";
  if (!window.confirm(`Clear all marked flyer spots for ${target}?`)) return;
  clearCurrentCycle().then(() => {
    render();
  }).catch((error) => {
    window.alert(error.message || "The flyer spots could not be reset.");
  });
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
    if (state.storageMode === "shared") {
      window.alert("Import is only for local backup files. Shared mode loads from Supabase automatically.");
      return;
    }
    state.entries = imported.entries || {};
    state.cycleKey = imported.cycleKey || getCycleKey(new Date());
    saveLocalState();
    render();
  } catch {
    window.alert("That file could not be imported.");
  } finally {
    importInput.value = "";
  }
});

initializeApp();

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
  storageNote.textContent = state.storageMode === "shared"
    ? "Shared backend active. Updates are visible to everyone using the site."
    : "Saved on this device only until Supabase is configured.";

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
      ? `${entry.name} - ${formatDate(entry.completedAt)}`
      : spot.address;
  });
}

function refreshMapLayout() {
  requestAnimationFrame(() => {
    map.invalidateSize();
  });

  window.setTimeout(() => {
    map.invalidateSize();
  }, 250);
}

async function initializeApp() {
  try {
    state.entries = await loadEntries();
  } catch (error) {
    console.warn(error);
    state.storageMode = "local";
    state.entries = loadLocalState().entries;
    window.alert("The shared backend could not be reached, so this session is using local browser storage.");
  } finally {
    state.isLoading = false;
    render();
  }
}

function createSupabaseClient() {
  const hasConfig = backendConfig.supabaseUrl && backendConfig.supabaseAnonKey;
  if (!hasConfig || !window.supabase) return null;

  return window.supabase.createClient(
    backendConfig.supabaseUrl,
    backendConfig.supabaseAnonKey
  );
}

async function loadEntries() {
  if (!supabaseClient) {
    return loadLocalState().entries;
  }

  const { data, error } = await supabaseClient
    .from(getTableName())
    .select("spot_id, name, description, image_url, image_path, completed_at")
    .eq("cycle_key", state.cycleKey);

  if (error) throw error;

  return (data || []).reduce((entries, row) => {
    entries[row.spot_id] = {
      name: row.name,
      description: row.description,
      image: row.image_url,
      imagePath: row.image_path,
      completedAt: row.completed_at
    };
    return entries;
  }, {});
}

async function saveEntry(spot, entry) {
  if (!supabaseClient) {
    const image = entry.file ? await resizeImage(entry.file) : entry.existing.image;
    state.entries[spot.id] = {
      name: entry.name,
      description: entry.description,
      image,
      completedAt: entry.existing?.completedAt || new Date().toISOString()
    };
    saveLocalState();
    return;
  }

  const completedAt = entry.existing?.completedAt || new Date().toISOString();
  const imageUpload = entry.file
    ? await uploadSharedImage(spot, entry.file)
    : {
        imageUrl: entry.existing.image,
        imagePath: entry.existing.imagePath
      };

  const row = {
    spot_id: spot.id,
    cycle_key: state.cycleKey,
    name: entry.name,
    description: entry.description,
    image_url: imageUpload.imageUrl,
    image_path: imageUpload.imagePath,
    completed_at: completedAt,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from(getTableName())
    .upsert(row, { onConflict: "spot_id,cycle_key" });

  if (error) throw error;

  state.entries[spot.id] = {
    name: row.name,
    description: row.description,
    image: row.image_url,
    imagePath: row.image_path,
    completedAt: row.completed_at
  };
}

async function uploadSharedImage(spot, file) {
  const imageFile = await resizeImageToFile(file);
  const safeFileName = imageFile.name.replace(/[^a-z0-9.-]/gi, "-").toLowerCase();
  const imagePath = `${state.cycleKey}/${spot.id}-${Date.now()}-${safeFileName}`;

  const { error } = await supabaseClient
    .storage
    .from(getBucketName())
    .upload(imagePath, imageFile, {
      cacheControl: "3600",
      upsert: true
    });

  if (error) throw error;

  const { data } = supabaseClient
    .storage
    .from(getBucketName())
    .getPublicUrl(imagePath);

  return {
    imageUrl: data.publicUrl,
    imagePath
  };
}

async function clearEntry(spot) {
  if (!supabaseClient) {
    delete state.entries[spot.id];
    saveLocalState();
    return;
  }

  const { error } = await supabaseClient
    .from(getTableName())
    .delete()
    .eq("cycle_key", state.cycleKey)
    .eq("spot_id", spot.id);

  if (error) throw error;
  delete state.entries[spot.id];
}

async function clearCurrentCycle() {
  if (!supabaseClient) {
    state.entries = {};
    state.cycleKey = getCycleKey(new Date());
    saveLocalState();
    return;
  }

  const { error } = await supabaseClient
    .from(getTableName())
    .delete()
    .eq("cycle_key", state.cycleKey);

  if (error) throw error;
  state.entries = {};
}

function setFormSaving(isSaving) {
  const saveButton = document.querySelector("#save-spot");
  saveButton.disabled = isSaving;
  clearSpotButton.disabled = isSaving;

  if (isSaving) {
    saveButton.dataset.previousText = saveButton.textContent;
    saveButton.textContent = "Saving...";
    return;
  }

  saveButton.textContent = saveButton.dataset.previousText || "Mark complete";
}

function getTableName() {
  return backendConfig.tableName || "flyer_entries";
}

function getBucketName() {
  return backendConfig.bucketName || "flyer-photos";
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

function loadLocalState() {
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

function saveLocalState() {
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

async function resizeImageToFile(file) {
  const dataUrl = await resizeImage(file);
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const baseName = file.name.replace(/\.[^.]+$/, "") || "flyer-photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
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
