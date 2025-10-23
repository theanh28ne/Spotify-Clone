import httpRequest from "../utils/httpRequest.js";
import { playlistAPI } from "../services/playlist.api.js";

/**
set token trên httpRequest
 */
function ensureAuth() {
    const token = localStorage.getItem("accessToken");
    if (!token) return false;
    if (typeof httpRequest.setToken === "function") httpRequest.setToken(token);
    return true;
}

/**
 render danh sách albums user đã like

 */
export async function renderAlbums(container = document.querySelector(".library-content")) {
    if (!container) return;
    container.innerHTML = "";

    if (!ensureAuth()) {
        container.insertAdjacentHTML("beforeend", `<p class="empty">Vui lòng đăng nhập để xem albums đã thích.</p>`);
        return;
    }

    try {
        const albums = await playlistAPI.getLikedAlbums(50, 0);
        if (!albums || albums.length === 0) {
            container.insertAdjacentHTML("beforeend", `<p class="empty">Không có album nào.</p>`);
            return;
        }

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
    } catch (err) {
        console.error("Lỗi khi render albums (albumsFollow):", err);
        container.insertAdjacentHTML("beforeend", `<p class="error">Không tải được albums.</p>`);
    }
}