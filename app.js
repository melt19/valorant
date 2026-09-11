// Theme per agent. Add an entry here when you add a new agent's first
// lineup to data/lineups.js — anything not listed falls back to `default`.
const agentThemes = {
  Vyse: {
    bg: "#150F1C",
    bgRaised: "#1E1626",
    bgCard: "#241A2D",
    line: "#382C46",
    accent: "#E64FC4",
    accent2: "#8B6FE0",
    accentWash: "rgba(230, 79, 196, 0.12)",
  },
  Brimstone: {
    bg: "#231E21",
    bgRaised: "#292327",
    bgCard: "#2b2226",
    line: "#5C4B4C",
    accent: "#A52F17",
    accent2: "#7F3319",
    accentWash: "#a52f1733",
  },
  default: {
    bg: "#0F1512",
    bgRaised: "#171F1B",
    bgCard: "#1C2620",
    line: "#2B3830",
    accent: "#4FE6A0",
    accent2: "#2E8B6F",
    accentWash: "rgba(79, 230, 160, 0.12)",
  },
};

const state = {
  lineups: [],
  agent: null,
  view: "maps",
  map: null,
  side: null,
  search: "",
};

const els = {
  agentTabs: document.getElementById("agentTabs"),
  mapView: document.getElementById("mapView"),
  mapViewSub: document.getElementById("mapViewSub"),
  mapGrid: document.getElementById("mapGrid"),
  clipView: document.getElementById("clipView"),
  clipViewTitle: document.getElementById("clipViewTitle"),
  clipViewSub: document.getElementById("clipViewSub"),
  clipGrid: document.getElementById("clipGrid"),
  backBtn: document.getElementById("backBtn"),
  searchInput: document.getElementById("searchInput"),
  resultCount: document.getElementById("resultCount"),
  emptyState: document.getElementById("emptyState"),
  lightbox: document.getElementById("lightbox"),
  lightboxVideo: document.getElementById("lightboxVideo"),
  lightboxMeta: document.getElementById("lightboxMeta"),
  lightboxClose: document.getElementById("lightboxClose"),
};

init();

async function init() {
  try {
    const { default: lineupData } = await import("./data/lineups.js");
    state.lineups = lineupData;
  } catch (err) {
    console.error("Couldn't load data/lineups.js:", err);

    els.mapGrid.innerHTML = `
      <p style="color:var(--text-dim)">
        Couldn't load data/lineups.js. Make sure the file exists and
        that you're running the site through a local server.
      </p>
    `;
    return;
  }

  const agents = Object.keys(state.lineups).sort();
  state.agent = agents[0] || null;

  buildAgentTabs(agents);
  applyTheme(state.agent);
  bindControls();
  renderMapView();
}


/**
 * Converts the nested lineups.js structure:
 *
 * {
 *   Vyse: {
 *     ascent: {
 *       ...
 *     }
 *   },
 *   Brimstone: {
 *     ascent: {
 *       ...
 *     }
 *   }
 * }
 *
 * into the flat array the rest of the UI expects:
 *
 * [
 *   {
 *     agent: "Vyse",
 *     map: "Ascent",
 *     ...
 *   }
 * ]
 */
function flattenLineups(data) {
  const result = [];

  for (const [agent, maps] of Object.entries(data || {})) {
    if (!maps || typeof maps !== "object") continue;

    for (const [map, lineups] of Object.entries(maps)) {
      if (!Array.isArray(lineups)) continue;

      for (const lineup of lineups) {
        result.push({
          ...lineup,
          agent,
          map: formatMapName(map),
        });
      }
    }
  }

  return result;
}

function formatMapName(map) {
  return String(map)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function buildAgentTabs(agents) {
  els.agentTabs.innerHTML = agents.map(agent => `
    <button
      class="agent-tab"
      role="tab"
      data-agent="${escapeAttr(agent)}"
      aria-selected="${agent === state.agent}">
      ${escapeHtml(agent)}
    </button>
  `).join("");

  els.agentTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".agent-tab");
    if (!btn) return;

    state.agent = btn.dataset.agent;

    [...els.agentTabs.children].forEach(c =>
      c.setAttribute("aria-selected", c === btn)
    );

    applyTheme(state.agent);
    showMapView();
  });
}

function applyTheme(agent) {
  const theme = agentThemes[agent] || agentThemes.default;
  const root = document.documentElement.style;

  root.setProperty("--bg", theme.bg);
  root.setProperty("--bg-raised", theme.bgRaised);
  root.setProperty("--bg-card", theme.bgCard);
  root.setProperty("--line", theme.line);
  root.setProperty("--accent", theme.accent);
  root.setProperty("--accent-2", theme.accent2);
  root.setProperty("--accent-wash", theme.accentWash);
}

function bindControls() {
  els.backBtn.addEventListener("click", showMapView);

  els.searchInput.addEventListener("input", () => {
    state.search = els.searchInput.value.trim().toLowerCase();
    renderClipGrid();
  });

  els.lightboxClose.addEventListener("click", closeLightbox);

  els.lightbox.addEventListener("click", (e) => {
    if (e.target === els.lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
}

function agentLineups() {
  const maps = state.lineups[state.agent] || {};

  return Object.entries(maps).flatMap(([map, lineups]) =>
    lineups.map(lineup => ({
      ...lineup,
      agent: state.agent,
      map: formatMapName(map),
    }))
  );
}


function showMapView() {
  state.view = "maps";
  state.map = null;
  state.search = "";
  els.searchInput.value = "";
  els.mapView.hidden = false;
  els.clipView.hidden = true;
  renderMapView();
}

function renderMapView() {
  const lineups = agentLineups();
  const maps = uniqueSorted(lineups.map(l => l.map));

  els.mapViewSub.textContent =
    `${state.agent} · ${lineups.length} clip${lineups.length === 1 ? "" : "s"} across ${maps.length} map${maps.length === 1 ? "" : "s"}`;

  els.mapGrid.innerHTML = maps.map(map => {
    const count = lineups.filter(l => l.map === map).length;
    const attackCount = lineups.filter(l => l.map === map && l.side == "attack").length;
    const defenseCount = lineups.filter(l => l.map === map && l.side == "defense").length;

    return `
      <div class="map-card" data-map="${escapeAttr(map)}">
        <img
          src="data/${String(map).toLowerCase()}.webp"
          class="map-card-image"
        />

        <span class="map-card-header">
          <span class="map-card-name">${escapeHtml(map)}</span>
          <span class="map-card-count">
            <strong>${count}</strong>
            lineup${count === 1 ? "" : "s"}
          </span>
        </span>

        <div class="map-side-selector">
          <button
            type="button"
            class="map-side-btn"
            data-side="Attack">
            Attack · ${attackCount}
          </button>

          <button
            type="button"
            class="map-side-btn"
            data-side="Defence">
            Defence · ${defenseCount}
          </button>
        </div>
      </div>
    `;
  }).join("");

  [...els.mapGrid.querySelectorAll(".map-card")].forEach(card => {
    const map = card.dataset.map;

    // Clicking the map itself could still open the map with no side filter.
    card.addEventListener("click", (e) => {
      if (e.target.closest(".map-side-btn")) return;

      openMap(map, null);
    });

    card.querySelectorAll(".map-side-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();

        openMap(map, btn.dataset.side);
      });
    });
  });

}

function openMap(map, side = null) {
  state.view = "clips";
  state.map = map;
  state.side = side;
  state.search = "";

  els.searchInput.value = "";
  els.mapView.hidden = true;
  els.clipView.hidden = false;

  els.clipViewTitle.textContent = map;

  els.clipViewSub.textContent =
    side ? `${state.agent} · ${side}` : state.agent;

  renderClipGrid();
  els.searchInput.focus();
}


function renderClipGrid() {
  const filtered = agentLineups().filter(l => {
    if (l.map !== state.map) return false;

    if (state.side && l.side !== state.side) {
      return false;
    }

    if (state.search) {
      const haystack =
        `${l.title || ""} ${l.ability || ""} ${l.note || ""}`.toLowerCase();

      if (!haystack.includes(state.search)) {
        return false;
      }
    }

    return true;
  });


  els.resultCount.textContent =
    `${filtered.length} clip${filtered.length === 1 ? "" : "s"}`;

  els.emptyState.hidden = filtered.length !== 0;

  els.clipGrid.innerHTML = filtered.map(l => `
    <button class="card" data-id="${escapeAttr(l.id)}">
      <div class="card-title">${escapeHtml(l.title)}</div>
      <div class="card-agent">${escapeHtml(l.ability)}</div>
      <div class="card-note">${escapeHtml(l.note || "")}</div>
    </button>
  `).join("");

  [...els.clipGrid.querySelectorAll(".card")].forEach(card => {
    card.addEventListener("click", () => {
      const lineup = state.lineups.find(l => l.id === card.dataset.id);

      if (lineup) openLightbox(lineup);
    });
  });
}

function openLightbox(lineup) {
  els.lightboxVideo.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${encodeURIComponent(lineup.youtubeId)}"
      title="${escapeAttr(lineup.title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;

  els.lightboxMeta.innerHTML = `
    <strong>
      ${escapeHtml(lineup.map)} · ${escapeHtml(lineup.agent)}
    </strong><br>
    ${escapeHtml(lineup.ability)} — ${escapeHtml(lineup.note || "")}
  `;

  els.lightbox.hidden = false;
  els.lightboxClose.focus();
}

function closeLightbox() {
  els.lightbox.hidden = true;
  els.lightboxVideo.innerHTML = "";
}

function uniqueSorted(arr) {
  return [...new Set(arr)].sort();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}