import httpRequest from "./utils/httpRequest.js";
import { renderPopularAlbums } from "./components/popularAlbums.js";
import { renderPlaylists, initLibraryTabs, initCreatePlaylistButton } from "./components/playlists.js";
import { initLikeButton, initLikedSongsHandler } from "./components/likeSongs.js";
import { renderTrendingArtists } from "./components/popularArtists.js";
import { albumAPI } from "./services/album.api.js";
import { getArtistById, getArtistPopularTracks } from "./services/artists.api.js";
import { renderAlbumHero, renderAlbumTracks } from "./components/albumTracks.js";
import { renderArtistHero, renderArtistTracks } from "./components/artistTracks.js";
import player from "./components/player.js";
import { fetchAndRenderUser, updateAuthUI } from "./components/auth.js";


document.addEventListener("DOMContentLoaded", async () => {
    // Render playlists
    await renderPlaylists();
    initLibraryTabs();

    // Render home content
    renderPopularAlbums();
    renderTrendingArtists();

    // Init playlist và like buttons
    initCreatePlaylistButton();
    initLikeButton();
    initLikedSongsHandler();

    // Show home view
    showHomeView();
});


function showHomeView() {
    const hits = document.querySelector(".hits-section");
    const artists = document.querySelector(".artists-section");
    const hero = document.querySelector(".artist-hero");
    const controls = document.querySelector(".artist-controls");
    const popular = document.querySelector(".popular-section");

    if (hits) hits.style.display = "";
    if (artists) artists.style.display = "";
    if (hero) hero.style.display = "none";
    if (controls) controls.style.display = "none";
    if (popular) popular.style.display = "none";

    const wrapper = document.querySelector(".content-wrapper");
    if (wrapper) wrapper.dataset.view = "home";
}

function showDetailView() {
    const hits = document.querySelector(".hits-section");
    const artists = document.querySelector(".artists-section");
    const hero = document.querySelector(".artist-hero");
    const controls = document.querySelector(".artist-controls");
    const popular = document.querySelector(".popular-section");

    if (hits) hits.style.display = "none";
    if (artists) artists.style.display = "none";
    if (hero) hero.style.display = "";
    if (controls) controls.style.display = "";
    if (popular) popular.style.display = "";

    const wrapper = document.querySelector(".content-wrapper");
    if (wrapper) wrapper.dataset.view = "detail";
}


const logoBtn = document.querySelector(".logo");
const homeBtn = document.querySelector(".home-btn");
if (logoBtn) logoBtn.addEventListener("click", (e) => { e.preventDefault(); showHomeView(); });
if (homeBtn) homeBtn.addEventListener("click", (e) => { e.preventDefault(); showHomeView(); });

const hitsGrid = document.querySelector(".hits-grid");
if (hitsGrid) {
    hitsGrid.addEventListener("click", async (e) => {
        const albumCard = e.target.closest(".album-card, .hit-card");
        if (!albumCard) return;
        const albumId = albumCard.dataset.id;
        if (!albumId) {
            showDetailView();
            return;
        }
        const [album, tracksData] = await Promise.all([
            albumAPI.getById(albumId),
            albumAPI.getTracks(albumId)
        ]);
        const tracks = tracksData.tracks || tracksData;
        renderAlbumHero(album);
        renderAlbumTracks(tracks);
        player.setTracks(tracks);
        try { player.$.audio.play(); } catch (err) { }
        showDetailView();
    });
}

const artistsGrid = document.querySelector(".artists-grid");
if (artistsGrid) {
    artistsGrid.addEventListener("click", async (e) => {
        const artistCard = e.target.closest(".artist-card");
        if (!artistCard) return;
        const artistId = artistCard.dataset.id;
        if (!artistId) {
            showDetailView();
            return;
        }
        const [artist, tracks] = await Promise.all([
            getArtistById(artistId),
            getArtistPopularTracks(artistId)
        ]);
        renderArtistHero(artist);
        renderArtistTracks(tracks);
        player.setTracks(tracks);
        try { player.$.audio.play(); } catch (err) { }
        showDetailView();
    });
}

const library = document.querySelector(".library-content");
if (library) {
    library.addEventListener("click", (e) => {
        const li = e.target.closest(".library-item");
        if (!li) return;

        showDetailView();
    });
}


// Context menu protection
(function () {
    const DOUBLE_MS = 400;
    let lastRightTs = 0;
    let allowNextContext = false;
    let clearTimer = null;

    const ALLOWED_CUSTOM_SELECTORS = [
        ".library-item",
        ".album-card",
        ".artist-card",
        ".track-item",
        ".ctx-allow"
    ].join(",");

    document.addEventListener("contextmenu", (e) => {
        const path = e.composedPath ? e.composedPath() : (e.path || []);
        const isAllowedTarget = path.some(node => {
            try {
                return node && node.matches && node.matches(ALLOWED_CUSTOM_SELECTORS);
            } catch (err) {
                return false;
            }
        });

        if (allowNextContext || isAllowedTarget) {
            allowNextContext = false;
            if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
            return;
        }
        e.preventDefault();
    });
})();

// Re-render handler khi auth thay đổi
document.addEventListener("auth:changed", async () => {
  try {
    // cập nhật UI auth (login/logout buttons, user menu)
    updateAuthUI();
    // lấy lại thông tin user nếu có token
    await fetchAndRenderUser().catch(() => {});
    // refresh active library tab (click sẽ re-render nội dung)
    const activeTab = document.querySelector(".nav-tab.active") || document.querySelector(".nav-tab");
    if (activeTab) {
      activeTab.click();
    } else {
      // fallback: emit event để modules lắng nghe
      document.dispatchEvent(new CustomEvent("library:updated"));
    }
    // cũng phát event để các module khác có thể bắt
    document.dispatchEvent(new CustomEvent("auth:refreshed"));
  } catch (err) {
    console.error("Error while handling auth:changed:", err);
  }
});

