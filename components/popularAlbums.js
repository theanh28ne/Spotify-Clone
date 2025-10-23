import { albumAPI } from "../services/album.api.js";
import httpRequest from "../utils/httpRequest.js";
import { toast } from "./notify.js";
import { attachContextMenu } from "./contextMenu.js";

export async function renderPopularAlbums() {
  const grid = document.querySelector(".hits-grid");
  if (!grid) return;

  try {
    const data = await albumAPI.getPopular(20);
    const albums = data.albums || [];

    grid.innerHTML = albums.map(album => `
      <div class="album-card" data-id="${album.id}">
        <div class="album-thumb">
          <img src="${album.cover_image_url}" alt="${album.title}" loading="lazy" />
          <button class="btn-play" title="Phát ${album.title}">
            <i class="fas fa-play"></i>
          </button>
        </div>
        <div class="album-info">
          <h3>${album.title}</h3>
          <p>${album.artist_name}</p>
        </div>
      </div>
    `).join("");
  } catch (err) {
    grid.innerHTML = `<p class="error"> Không thể tải danh sách album phổ biến.</p>`;
    console.error("Lỗi khi render album:", err);
  }

  initAlbumContextMenu();
}

function ensureAuthTokenOnRequest() {
  const token = localStorage.getItem("accessToken");
  if (token && typeof httpRequest.setToken === "function") {
    httpRequest.setToken(token);
  }
}

let detachAlbumMenu = null;
function initAlbumContextMenu() {

  if (typeof detachAlbumMenu === "function") detachAlbumMenu();

  detachAlbumMenu = attachContextMenu(".album-card", (targetEl) => {
    const id = targetEl.dataset.id;
    if (!id) return [];
    return [
      { label: "Add to library", action: "like-album", data: { id } }
    ];
  }, async (action, data, targetEl) => {
    if (action !== "like-album" || !data?.id) return;
    try {
      ensureAuthTokenOnRequest();
      await httpRequest.post(`albums/${data.id}/like`, {});
      toast.success("Đã thêm album vào thư viện.");
    } catch (err) {
      if (err && err.status === 409) {
        toast.info("Album đã tồn tại trong thư viện.");
      } else {
        console.error("Lỗi khi like album:", err);
        toast.error("Không thể thêm album. Vui lòng thử lại.");
      }
    }
  });
}
