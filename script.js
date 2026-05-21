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
const spotIds = new Set(SPOTS.map((spot) => spot.id));
const state = {
  cycleKey: getCycleKey(new Date()),
  entries: {},
  storageMode: supabaseClient ? "shared" : "local",
  isLoading: true
};
const markers = new Map();
let activeSpotId = null;

const map = createCoordinateMap(document.querySelector("#map"), {
  center: { lat: 38.91095, lng: -77.04055 },
  zoom: 16,
  minZoom: 15,
  maxZoom: 19
});

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
const sidePanel = document.querySelector(".side-panel");
const panelToggle = document.querySelector("#panel-toggle");

SPOTS.forEach((spot, index) => {
  const marker = createMarkerElement(spot, index);
  marker.addEventListener("click", () => openSpot(spot.id));
  map.addMarker(marker, spot);
  markers.set(spot.id, marker);

  const node = template.content.cloneNode(true);
  const button = node.querySelector(".spot-item");
  const status = node.querySelector(".spot-status");
  const title = node.querySelector("strong");
  const subtitle = node.querySelector("small");

  button.dataset.spotId = spot.id;
  button.addEventListener("click", () => {
    openSpot(spot.id);
    map.setView({ lat: spot.lat, lng: spot.lng }, 18);
  });
  status.dataset.number = String(index + 1);
  title.textContent = spot.title;
  subtitle.textContent = spot.address;
  spotList.append(node);
});

map.fitSpots(SPOTS);
window.addEventListener("resize", () => map.render());
window.addEventListener("orientationchange", () => window.setTimeout(() => map.render(), 150));

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const spot = getActiveSpot();
  if (!spot) return;

  const existing = getEntryForSpot(spot.id);
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
    await refreshEntriesFromBackend();
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
    return refreshEntriesFromBackend();
  }).then(() => {
    render();
    openSpot(spot.id);
  }).catch((error) => {
    window.alert(error.message || "This spot could not be cleared.");
  });
});

closeDialogButton.addEventListener("click", () => {
  dialog.close();
});

panelToggle.addEventListener("click", () => {
  const isCollapsed = sidePanel.classList.toggle("is-collapsed");
  panelToggle.setAttribute("aria-expanded", String(!isCollapsed));
  panelToggle.querySelector(".panel-toggle-text").textContent = isCollapsed ? "Show list" : "Hide list";
});

manualResetButton.addEventListener("click", () => {
  const target = state.storageMode === "shared" ? "everyone" : "this browser";
  if (!window.confirm(`Clear all marked flyer spots for ${target}?`)) return;
  clearCurrentCycle().then(() => {
    return refreshEntriesFromBackend();
  }).then(() => {
    render();
  }).catch((error) => {
    window.alert(error.message || "The flyer spots could not be reset.");
  });
});

exportButton.addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    cycleKey: state.cycleKey,
    entries: normalizeEntries(state.entries)
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
  const entry = getEntryForSpot(id);
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
  const completed = SPOTS.filter((spot) => getEntryForSpot(spot.id)).length;
  completedCount.textContent = String(completed);
  meterFill.style.width = `${Math.round((completed / SPOTS.length) * 100)}%`;
  resetCopy.textContent = `Auto-resets after the second Monday ends. Next reset: ${formatDate(getNextResetDate())}.`;
  storageNote.textContent = state.storageMode === "shared"
    ? "Shared backend active. Updates are visible to everyone using the site."
    : "Saved on this device only until Supabase is configured.";

  SPOTS.forEach((spot, index) => {
    const entry = getEntryForSpot(spot.id);
    const marker = markers.get(spot.id);
    if (marker) {
      updateMarkerElement(marker, spot, index, entry);
      marker.title = entry
        ? `${spot.title} - marked by ${entry.name}`
        : spot.title;
    }
  });

  document.querySelectorAll(".spot-item").forEach((button) => {
    const spot = SPOTS.find((item) => item.id === button.dataset.spotId);
    const entry = getEntryForSpot(spot.id);
    const subtitle = button.querySelector("small");
    button.classList.toggle("is-complete", Boolean(entry));
    subtitle.textContent = entry
      ? `${entry.name} - ${formatDate(entry.completedAt)}`
      : spot.address;
  });
}

function getEntryForSpot(spotId) {
  const entry = state.entries[spotId];
  if (!entry) return null;

  if (entry.spotId && entry.spotId !== spotId) {
    return null;
  }

  return entry;
}

function createCoordinateMap(container, options) {
  const tileSize = 256;
  const tilePane = document.createElement("div");
  const markerLayer = document.createElement("div");
  const controls = document.createElement("div");
  const status = document.createElement("div");
  const attribution = document.createElement("div");
  const markersOnMap = [];
  const activePointers = new Map();
  let center = { ...options.center };
  let zoom = options.zoom;
  let isDragging = false;
  let dragStart = null;
  let pinchStart = null;

  tilePane.className = "tile-pane";
  markerLayer.className = "map-marker-layer";
  controls.className = "map-controls";
  status.className = "map-status";
  attribution.className = "map-attribution";
  status.textContent = "Drag or zoom the map. Markers stay locked to address coordinates.";
  attribution.innerHTML = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const zoomIn = document.createElement("button");
  const zoomOut = document.createElement("button");
  zoomIn.type = "button";
  zoomOut.type = "button";
  zoomIn.textContent = "+";
  zoomOut.textContent = "-";
  zoomIn.setAttribute("aria-label", "Zoom in");
  zoomOut.setAttribute("aria-label", "Zoom out");
  controls.append(zoomIn, zoomOut);
  container.append(tilePane, markerLayer, controls, status, attribution);

  zoomIn.addEventListener("click", () => setView(center, zoom + 1));
  zoomOut.addEventListener("click", () => setView(center, zoom - 1));

  container.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    container.setPointerCapture(event.pointerId);

    if (activePointers.size === 1) {
      isDragging = true;
      pinchStart = null;
      dragStart = {
        x: event.clientX,
        y: event.clientY,
        centerPixel: latLngToPixel(center.lat, center.lng, zoom)
      };
      return;
    }

    if (activePointers.size === 2) {
      isDragging = false;
      dragStart = null;
      pinchStart = createPinchState();
    }
  });

  container.addEventListener("pointermove", (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.size === 2 && pinchStart) {
      updatePinchZoom();
      return;
    }

    if (!isDragging || !dragStart) return;
    const nextCenterPixel = {
      x: dragStart.centerPixel.x - (event.clientX - dragStart.x),
      y: dragStart.centerPixel.y - (event.clientY - dragStart.y)
    };
    center = pixelToLatLng(nextCenterPixel.x, nextCenterPixel.y, zoom);
    render();
  });

  container.addEventListener("pointerup", (event) => {
    activePointers.delete(event.pointerId);
    pinchStart = null;
    isDragging = activePointers.size === 1;

    if (isDragging) {
      const point = [...activePointers.values()][0];
      dragStart = {
        x: point.x,
        y: point.y,
        centerPixel: latLngToPixel(center.lat, center.lng, zoom)
      };
    } else {
      dragStart = null;
    }

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
  });

  container.addEventListener("pointercancel", (event) => {
    activePointers.delete(event.pointerId);
    isDragging = false;
    dragStart = null;
    pinchStart = null;
  });

  container.addEventListener("wheel", (event) => {
    event.preventDefault();
    setView(center, zoom + (event.deltaY < 0 ? 1 : -1));
  }, { passive: false });

  function addMarker(element, spot) {
    markerLayer.append(element);
    markersOnMap.push({ element, spot });
    render();
  }

  function setView(nextCenter, nextZoom = zoom) {
    center = { ...nextCenter };
    zoom = Math.max(options.minZoom, Math.min(options.maxZoom, nextZoom));
    render();
  }

  function fitSpots(spots) {
    const average = spots.reduce((sum, spot) => ({
      lat: sum.lat + spot.lat,
      lng: sum.lng + spot.lng
    }), { lat: 0, lng: 0 });
    setView({
      lat: average.lat / spots.length,
      lng: average.lng / spots.length
    }, options.zoom);
  }

  function render() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const centerPixel = latLngToPixel(center.lat, center.lng, zoom);
    const startX = Math.floor((centerPixel.x - width / 2) / tileSize);
    const endX = Math.floor((centerPixel.x + width / 2) / tileSize);
    const startY = Math.floor((centerPixel.y - height / 2) / tileSize);
    const endY = Math.floor((centerPixel.y + height / 2) / tileSize);
    const fragment = document.createDocumentFragment();
    const maxTile = 2 ** zoom;

    for (let x = startX; x <= endX; x += 1) {
      for (let y = startY; y <= endY; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const tile = document.createElement("img");
        tile.className = "map-tile";
        tile.alt = "";
        tile.decoding = "async";
        tile.draggable = false;
        tile.src = `https://a.basemaps.cartocdn.com/light_all/${zoom}/${wrappedX}/${y}.png`;
        tile.onload = () => {
          status.hidden = true;
        };
        tile.onerror = () => {
          tile.onerror = null;
          tile.src = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`;
          status.hidden = false;
          status.textContent = "Map tiles are loading. Markers are still locked to the address coordinates.";
        };
        tile.style.left = `${x * tileSize - centerPixel.x + width / 2}px`;
        tile.style.top = `${y * tileSize - centerPixel.y + height / 2}px`;
        fragment.append(tile);
      }
    }

    tilePane.replaceChildren(fragment);

    markersOnMap.forEach(({ element, spot }) => {
      const pixel = latLngToPixel(spot.lat, spot.lng, zoom);
      element.style.left = `${pixel.x - centerPixel.x + width / 2}px`;
      element.style.top = `${pixel.y - centerPixel.y + height / 2}px`;
    });
  }

  function createPinchState() {
    const points = [...activePointers.values()];
    const midpoint = getMidpoint(points[0], points[1]);
    const centerPixel = latLngToPixel(center.lat, center.lng, zoom);
    const mapRect = container.getBoundingClientRect();
    return {
      distance: getDistance(points[0], points[1]),
      midpoint,
      zoom,
      centerPixel,
      anchorPixel: {
        x: centerPixel.x + midpoint.x - mapRect.left - container.clientWidth / 2,
        y: centerPixel.y + midpoint.y - mapRect.top - container.clientHeight / 2
      }
    };
  }

  function updatePinchZoom() {
    const points = [...activePointers.values()];
    const distance = getDistance(points[0], points[1]);
    if (!pinchStart || !distance || !pinchStart.distance) return;

    const zoomDelta = Math.round(Math.log2(distance / pinchStart.distance));
    const nextZoom = Math.max(options.minZoom, Math.min(options.maxZoom, pinchStart.zoom + zoomDelta));
    const scale = 2 ** (nextZoom - pinchStart.zoom);
    const midpoint = getMidpoint(points[0], points[1]);
    const mapRect = container.getBoundingClientRect();
    const nextCenterPixel = {
      x: pinchStart.anchorPixel.x * scale - (midpoint.x - mapRect.left - container.clientWidth / 2),
      y: pinchStart.anchorPixel.y * scale - (midpoint.y - mapRect.top - container.clientHeight / 2)
    };

    zoom = nextZoom;
    center = pixelToLatLng(nextCenterPixel.x, nextCenterPixel.y, zoom);
    render();
  }

  return { addMarker, fitSpots, render, setView };
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getMidpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function latLngToPixel(lat, lng, zoom) {
  const scale = 256 * 2 ** zoom;
  const sinLat = Math.sin(lat * Math.PI / 180);
  return {
    x: (lng + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function pixelToLatLng(x, y, zoom) {
  const scale = 256 * 2 ** zoom;
  const lng = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function createMarkerElement(spot, index) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "marker-pin";
  marker.dataset.label = spot.title;
  marker.setAttribute("aria-label", `Open ${spot.title}`);
  updateMarkerElement(marker, spot, index, getEntryForSpot(spot.id));
  return marker;
}

function updateMarkerElement(marker, spot, index, entry) {
  marker.classList.toggle("is-complete", Boolean(entry));
  marker.dataset.label = entry ? `${spot.title} - ${entry.name}` : spot.title;
  marker.textContent = entry ? "\u2713" : String(index + 1);
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

async function refreshEntriesFromBackend() {
  if (!supabaseClient) return;
  state.entries = await loadEntries();
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
    if (!spotIds.has(row.spot_id)) return entries;

    entries[row.spot_id] = {
      spotId: row.spot_id,
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
      spotId: spot.id,
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
    spotId: row.spot_id,
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

function loadLocalState() {
  const cycleKey = getCycleKey(new Date());
  const fallback = { cycleKey, entries: {} };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.cycleKey !== cycleKey) return fallback;
    return {
      cycleKey,
      entries: normalizeEntries(saved.entries || {})
    };
  } catch {
    return fallback;
  }
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    cycleKey: state.cycleKey,
    entries: normalizeEntries(state.entries)
  }));
}

function normalizeEntries(entries) {
  return Object.entries(entries).reduce((cleanEntries, [spotId, entry]) => {
    if (!spotIds.has(spotId) || !entry) return cleanEntries;

    cleanEntries[spotId] = {
      ...entry,
      spotId
    };
    return cleanEntries;
  }, {});
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
