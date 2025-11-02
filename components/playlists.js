import httpRequest from "../utils/httpRequest.js";
import { playlistAPI } from "../services/playlist.api.js";
import player from "./player.js";
import { toMMSS } from "../utils/formatTime.js";
import { renderAlbums as renderFollowedAlbums } from "./albumsFollow.js";
import { renderArtists as renderFollowedArtists } from "./artistsLike.js";
import { renderLikedSongsHero } from "./likeSongs.js";


const renderAlbums = renderFollowedAlbums;
const renderArtists = renderFollowedArtists;

// ===== LIBRARY REFRESH SYSTEM =====
let currentTab = null; // Lưu tab hiện tại

// Custom event để trigger refresh
export const LibraryEvents = {
  PLAYLIST_ADDED: "library:playlist:added",
  PLAYLIST_DELETED: "library:playlist:deleted",
  ALBUM_ADDED: "library:album:added",
  ALBUM_DELETED: "library:album:deleted",
  ARTIST_ADDED: "library:artist:added",
  ARTIST_DELETED: "library:artist:deleted",
  TRACK_LIKED: "library:track:liked",
  TRACK_UNLIKED: "library:track:unliked"
};

// Hàm dispatch event
export function triggerLibraryRefresh(eventType) {
  const event = new CustomEvent(eventType, { detail: { timestamp: Date.now() } });
  document.dispatchEvent(event);
}

// Hàm refresh library dựa trên tab hiện tại
async function refreshCurrentTab() {
  if (!currentTab) return;
  
  const container = document.querySelector(".library-content");
  if (!container) return;

  const label = (currentTab.textContent || "").trim().toLowerCase();
  
  console.log(`🔄 Refreshing library tab: ${label}`);
  
  try {
    if (label === "all") {
      await renderAll(container);
    } else if (label === "playlists") {
      await renderPlaylists(container);
    } else if (label === "artists") {
      await renderArtists(container);
    } else if (label === "albums") {
      await renderAlbums(container);
    }
  } catch (err) {
    console.error("Lỗi refresh library:", err);
  }
}

// Setup event listeners cho auto-refresh
function setupLibraryRefreshListeners() {
  // Listen tất cả các events
  Object.values(LibraryEvents).forEach(eventType => {
    document.addEventListener(eventType, () => {
      refreshCurrentTab();
    });
  });
  
  console.log("✅ Library auto-refresh listeners đã được khởi tạo");
}
// ===== END LIBRARY REFRESH SYSTEM =====


function ensureAuth() {
  const token = localStorage.getItem("accessToken");
  if (!token) return false;
  if (typeof httpRequest.setToken === "function") httpRequest.setToken(token);
  return true;
}


function mapToPlayerTrack(t) {
  if (!t) return {
    id: null, title: "", audio_url: "", artist_name: "", play_count: 0, duration: 0, image_url: ""
  };

  return {
    id: t.id || t.track_id || t.trackId || null,
    title: t.title || t.name || t.track_title || t.track_name || t.track_title || "",
    audio_url: t.audio_url || t.track_audio_url || t.path || t.stream_url || t.streamUrl || "",
    artist_name: t.artist_name || t.artist || t.artist_name || t.artist_name || (t.artists && t.artists[0]?.name) || "",
    play_count: t.play_count ?? t.track_play_count ?? t.plays ?? 0,
    duration: t.duration ?? t.track_duration ?? t.total_duration ?? 0,
    image_url: t.image_url || t.track_image_url || t.cover_image_url || t.album_cover_image_url || t.artist_image_url || ""
  };
}


function isLikedPlaylist(p) {
  if (!p) return false;
  const name = (p.name || p.title || "").toString().trim().toLowerCase();
  return name === "liked songs" || name === "liked-songs" || name === "liked_songs";
}

function renderLikedSongsItemHtml(count = null) {
  const countText = (typeof count === "number") ? `${count} song${count !== 1 ? "s" : ""}` : "Songs";
  return `
    <div class="library-item" data-type="liked-songs">
      <div class="item-icon liked-songs">
        <i class="fas fa-heart"></i>
      </div>
      <div class="item-info">
        <div class="item-title">Liked Songs</div>
        <div class="item-subtitle">
          <i class="fas fa-thumbtack"></i>
          Playlist • ${countText}
        </div>
      </div>
    </div>
  `;
}


function renderHero({ title = "", subtitle = "", image = null, largeIcon = null, extraHtml = "" } = {}) {
  const hero = document.querySelector(".artist-hero");
  if (!hero) return;
  hero.innerHTML = `
    <div class="hero-background">
      ${image ? `<img src="${image}" alt="${title}" class="hero-image" />` : `<div class="hero-image placeholder">${largeIcon ? largeIcon : ''}</div>`}
      <div class="hero-overlay"></div>
    </div>
    <div class="hero-content">
      <h1 class="artist-name">${title}</h1>
      ${subtitle ? `<p class="monthly-listeners">${subtitle}</p>` : ""}
      ${extraHtml}
    </div>
  `;
}


export async function renderPlaylists(container = document.querySelector(".library-content")) {
  if (!container) return;
  container.innerHTML = "";

  if (!ensureAuth()) {
    container.insertAdjacentHTML("beforeend", `<p class="empty">Vui lòng đăng nhập để xem playlist của bạn.</p>`);
    return;
  }

  try {
    let playlists = await playlistAPI.getAll(50, 0);
    if (!Array.isArray(playlists)) playlists = playlists?.data || playlists?.playlists || [];

    playlists = playlists.filter(p => !isLikedPlaylist(p));

    if (!playlists || playlists.length === 0) {
      container.insertAdjacentHTML("beforeend", `<p class="empty">Không có playlist nào.</p>`);
      return;
    }

    const html = playlists.map(p => `
      <div class="library-item" data-id="${p.id}" data-type="playlist">
        ${p.image_url ? `<img src="${p.image_url}" class="item-image" />` : `<div class="item-icon"><i class="fas fa-list"></i></div>`}
        <div class="item-info">
          <div class="item-title">${p.name}</div>
          <div class="item-subtitle">Playlist • ${p.track_count || ""}</div>
        </div>
      </div>
    `).join("");
    container.insertAdjacentHTML("beforeend", html);
  } catch (err) {
    console.error("Lỗi khi render playlists:", err);
    container.insertAdjacentHTML("beforeend", `<p class="error">Không tải được playlists.</p>`);
  }
}


export async function renderAll(container = document.querySelector(".library-content")) {
  if (!container) return;
  container.innerHTML = "";

  let likedCount = null;
  try {
    if (ensureAuth()) {
      const liked = await playlistAPI.getLikedTracks(50, 0);
      if (Array.isArray(liked)) likedCount = liked.length;
      else if (liked && Array.isArray(liked.tracks)) likedCount = liked.tracks.length;
      else if (liked && typeof liked.total === "number") likedCount = liked.total;
    }
  } catch (err) {
    console.warn("Không thể lấy số lượng Liked Songs:", err);
  }

  container.insertAdjacentHTML("beforeend", renderLikedSongsItemHtml(likedCount));

  try {
    let playlists = ensureAuth() ? await playlistAPI.getAll(50, 0) : [];
    if (!Array.isArray(playlists)) playlists = playlists?.data || playlists?.playlists || [];
    playlists = playlists.filter(p => !isLikedPlaylist(p));

    if (playlists && playlists.length) {
      const html = playlists.map(p => `
        <div class="library-item" data-id="${p.id}" data-type="playlist">
          ${p.image_url ? `<img src="${p.image_url}" class="item-image" />` : `<div class="item-icon"><i class="fas fa-list"></i></div>`}
          <div class="item-info">
            <div class="item-title">${p.name}</div>
            <div class="item-subtitle">Playlist • ${p.track_count || ""}</div>
          </div>
        </div>
      `).join("");
      container.insertAdjacentHTML("beforeend", html);
    }
  } catch (err) {
    container.insertAdjacentHTML("beforeend", `<p class="error">Cannot load playlists</p>`);
  }

  try {
    const albums = ensureAuth() ? await playlistAPI.getLikedAlbums(50, 0) : [];
    if (albums && albums.length) {
      const html = albums.map(a => `
        <div class="library-item" data-id="${a.id}" data-type="album">
          ${a.cover_image_url ? `<img src="${a.cover_image_url}" class="item-image" />` : `<div class="item-icon"><i class="fas fa-compact-disc"></i></div>`}
          <div class="item-info">
            <div class="item-title">${a.title}</div>
            <div class="item-subtitle">${a.artist_name || ""}</div>
          </div>
        </div>
      `).join("");
      container.insertAdjacentHTML("beforeend", html);
    }
  } catch (err) {
    container.insertAdjacentHTML("beforeend", `<p class="error">Cannot load albums</p>`);
  }

  try {
    const artists = ensureAuth() ? await playlistAPI.getFollowingArtists(50, 0) : [];
    if (artists && artists.length) {
      const html = artists.map(ar => `
        <div class="library-item" data-id="${ar.id}" data-type="artist">
          ${ar.image_url ? `<img src="${ar.image_url}" class="item-image" />` : `<div class="item-icon"><i class="fas fa-user"></i></div>`}
          <div class="item-info">
            <div class="item-title">${ar.name}</div>
            <div class="item-subtitle">Artist</div>
          </div>
        </div>
      `).join("");
      container.insertAdjacentHTML("beforeend", html);
    }
  } catch (err) {
    container.insertAdjacentHTML("beforeend", `<p class="error">Cannot load artists</p>`);
  }
}


export async function initLibraryTabs() {
  const tabs = Array.from(document.querySelectorAll(".nav-tab"));
  const container = document.querySelector(".library-content");
  if (!tabs.length || !container) return;

  async function showTab(tabEl) {
    tabs.forEach(t => t.classList.toggle("active", t === tabEl));
    currentTab = tabEl; // Lưu tab hiện tại
    container.innerHTML = "";

    const label = (tabEl?.textContent || "").trim().toLowerCase();
    try {
      if (label === "all") {
        await renderAll(container);
      } else if (label === "playlists") {
        await renderPlaylists(container);
      } else if (label === "artists") {
        await renderArtists(container);
      } else if (label === "albums") {
        await renderAlbums(container);
      } else {
        await renderPlaylists(container);
      }
    } catch (err) {
      console.error("Lỗi render tab library:", err);
      container.insertAdjacentHTML("beforeend", `<p class="error">Không thể tải dữ liệu.</p>`);
    }
  }

  const active = tabs.find(t => t.classList.contains("active")) || tabs[1] || tabs[0];
  await showTab(active);

  tabs.forEach(tab => tab.addEventListener("click", async (e) => {
    e.preventDefault();
    await showTab(tab);
  }));

  container.addEventListener("click", async (e) => {
    const item = e.target.closest(".library-item");
    if (!item) return;

    container.querySelectorAll(".library-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    const type = item.dataset.type || null;
    const id = item.dataset.id || null;

    try {
      if (type === "liked-songs") {
        if (!ensureAuth()) return;
        const tracks = await playlistAPI.getLikedTracks(50, 0);
        const items = Array.isArray(tracks) ? tracks : (tracks?.tracks || tracks?.data || []);
        const mapped = items.map(mapToPlayerTrack);
        player.setTracks(mapped);
        try {
          renderLikedSongsHero(items.length);
        } catch (e) {
          renderHero({
            title: "Liked Songs",
            subtitle: `${items.length} song${items.length !== 1 ? "s" : ""}`,
            largeIcon: `<i class="fas fa-heart fa-6x"></i>`,
            extraHtml: `<p class="album-title">Your collection of liked tracks</p>`
          });
        }
        try { player.$.audio.play(); } catch { }
        return;
      }

      if (type === "playlist" && id) {
        const res = await httpRequest.get(`playlists/${id}/tracks`);
        const tracks = Array.isArray(res) ? res : (res?.tracks || res?.data || []);
        const mapped = tracks.map(mapToPlayerTrack);
        player.setTracks(mapped);
        const title = item.querySelector(".item-title")?.textContent?.trim() || "Playlist";
        const img = item.querySelector("img")?.src || null;
        renderHero({
          title,
          subtitle: `${mapped.length} song${mapped.length !== 1 ? "s" : ""}`,
          image: img
        });
        try { player.$.audio.play(); } catch { }
        return;
      }

      if (type === "album" && id) {
        const res = await httpRequest.get(`albums/${id}/tracks`);
        const tracks = Array.isArray(res) ? res : (res?.tracks || res?.data || []);
        const mapped = tracks.map(mapToPlayerTrack);
        player.setTracks(mapped);
        const title = item.querySelector(".item-title")?.textContent?.trim() || "Album";
        const subtitle = `${mapped.length} song${mapped.length !== 1 ? "s" : ""}`;
        const img = item.querySelector("img")?.src || null;
        renderHero({
          title,
          subtitle,
          image: img
        });
        try { player.$.audio.play(); } catch { }
        return;
      }

      if (type === "artist" && id) {
        const res = await httpRequest.get(`artists/${id}/tracks/popular`);
        const tracks = Array.isArray(res) ? res : (res?.tracks || res?.data || []);
        const mapped = tracks.map(mapToPlayerTrack);
        player.setTracks(mapped);
        const title = item.querySelector(".item-title")?.textContent?.trim() || "Artist";
        const img = item.querySelector("img")?.src || null;
        renderHero({
          title,
          subtitle: `${mapped.length} popular song${mapped.length !== 1 ? "s" : ""}`,
          image: img
        });
        try { player.$.audio.play(); } catch { }
        return;
      }
    } catch (err) {
      console.error("Lỗi khi tải tracks từ library item:", err);
    }
  });
  
  // Setup auto-refresh listeners
  setupLibraryRefreshListeners();
}

export function initCreatePlaylistButton() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;
    
    // TODO: Logic tạo playlist ở đây
    // Sau khi tạo xong, gọi:
    // triggerLibraryRefresh(LibraryEvents.PLAYLIST_ADDED);
  });
}


import { initLibraryContextMenu } from "./deleteLibraryItem.js";
initLibraryContextMenu();

import { initSearchLibrary, resetSearchOnTabChange, clearSearchCache } from "./searchLibrary.js";
initSearchLibrary();