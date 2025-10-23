import httpRequest from "../utils/httpRequest.js";
import { playlistAPI } from "../services/playlist.api.js";


function ensureAuth() {
    const token = localStorage.getItem("accessToken");
    if (!token) return false;
    if (typeof httpRequest.setToken === "function") httpRequest.setToken(token);
    return true;
}

/* render followed artists */
export async function renderArtists(container = document.querySelector(".library-content")) {
    if (!container) return;
    container.innerHTML = "";

    if (!ensureAuth()) {
        container.insertAdjacentHTML("beforeend", `<p class="empty">Vui lòng đăng nhập để xem nghệ sĩ bạn theo dõi.</p>`);
        return;
    }

    try {
        const artists = await playlistAPI.getFollowingArtists(50, 0);
        if (!artists || artists.length === 0) {
            container.insertAdjacentHTML("beforeend", `<p class="empty">Không follow nghệ sĩ nào.</p>`);
            return;
        }
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
    } catch (err) {
        console.error("Lỗi khi render artists (artistsLike):", err);
        container.insertAdjacentHTML("beforeend", `<p class="error">Không tải được artists.</p>`);
    }
}