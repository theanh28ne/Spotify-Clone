// renderArtists.js
import { getTrendingArtists } from "../services/artists.api.js";
import httpRequest from "../utils/httpRequest.js";
import { toast } from "./notify.js";
import { attachContextMenu } from "./contextMenu.js";

export async function renderTrendingArtists() {
  const grid = document.querySelector(".artists-grid");
  if (!grid) {
    console.warn("Không tìm thấy .artists-grid trong DOM");
    return;
  }

  // Gọi API
  const artists = await getTrendingArtists(10);

  // Render
  grid.innerHTML = artists.map(artist => `
    <div class="artist-card" data-id="${artist.id}">
      <div class="artist-card-cover">
        <img src="${artist.image_url}" alt="${artist.name}" loading="lazy" />
        <button class="artist-play-btn" title="Phát ${artist.name}">
          <i class="fas fa-play"></i>
        </button>
      </div>
      <div class="artist-card-info">
        <h3 class="artist-card-name">${artist.name}</h3>
        <p class="artist-card-type">Artist</p>
      </div>
    </div>
  `).join("");


  initArtistContextMenu();
}

function ensureAuthTokenOnRequest() {
  const token = localStorage.getItem("accessToken");
  if (token && typeof httpRequest.setToken === "function") {
    httpRequest.setToken(token);
    return true;
  }
  return false;
}

let detachArtistMenu = null;
function initArtistContextMenu() {
  // detach previous if any
  if (typeof detachArtistMenu === "function") detachArtistMenu();

  detachArtistMenu = attachContextMenu(".artist-card", (targetEl) => {
    const id = targetEl.dataset.id;
    if (!id) return [];
    return [
      { label: "Follow artist", action: "follow-artist", data: { id } }
    ];
  }, async (action, data, targetEl) => {
    if (action !== "follow-artist" || !data?.id) return;
    // require auth
    if (!ensureAuthTokenOnRequest()) {
      toast.info("Vui lòng đăng nhập để follow nghệ sĩ.");
      return;
    }
    try {
      await httpRequest.post(`artists/${data.id}/follow`, {});
      toast.success("Đã theo dõi nghệ sĩ.");
    } catch (err) {
      // treat 409 as already followed
      if (err && err.status === 409) {
        toast.info("Bạn đã theo dõi nghệ sĩ này.");
      } else {
        console.error("Lỗi khi follow artist:", err);
        toast.error("Không thể follow nghệ sĩ. Vui lòng thử lại.");
      }
    }
  });
}

