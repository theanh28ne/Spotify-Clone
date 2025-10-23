import httpRequest from "../utils/httpRequest.js";
import { playlistAPI } from "../services/playlist.api.js";
import player from "./player.js";
import { toMMSS } from "../utils/formatTime.js";
import { toast } from "./notify.js";

function ensureAuth() {
    const token = localStorage.getItem("accessToken");
    if (!token) return false;
    if (typeof httpRequest.setToken === "function") httpRequest.setToken(token);
    return true;
}


export function initLikeButton() {
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest(".add-btn");
        if (!btn) return;
        e.preventDefault();
        btn.disabled = true;
        try {
            if (!ensureAuth()) {
                toast.info("Vui lòng đăng nhập để like track.");
                return;
            }

            let trackId = null;
            const trackItem = btn.closest(".track-item");
            if (trackItem) trackId = trackItem.dataset.id;
            if (!trackId) trackId = player?.currentSong?.id || player?.currentSong?.track_id || null;

            if (!trackId) {
                console.error("Không xác định được track để like.");
                toast.error("Không xác định được bài hát.");
                return;
            }

            const result = await playlistAPI.likeTrack(trackId);
            if (!result || result.success === false) {
                console.error("Like thất bại.", result?.error);
                toast.error("Like thất bại. Thử lại.");
                return;
            }


            btn.classList.add("liked");
            if (trackItem) trackItem.classList.add("liked");


            if (!result.alreadyLiked) {
                const likeCountEl = trackItem?.querySelector(".like-count");
                if (likeCountEl) {
                    const c = parseInt(likeCountEl.textContent) || 0;
                    likeCountEl.textContent = c + 1;
                }
                toast.success("Đã thích bài hát.");
            } else {
                toast.info("Bài hát đã tồn tại trong Liked Songs.");
            }
        } catch (err) {
            console.error("Lỗi khi like track:", err);
            toast.error("Lỗi khi like. Vui lòng thử lại.");
        } finally {
            btn.disabled = false;
        }
    });
}


export function initLikedSongsHandler() {
    const container = document.querySelector(".library-content");
    if (!container) return;

    container.addEventListener("click", async (e) => {
        const item = e.target.closest(".library-item");
        if (!item) return;


        if (item.dataset.type === "liked-songs" || item.classList.contains("liked-songs")) {
            try {
                if (!ensureAuth()) {
                    toast.info("Vui lòng đăng nhập để xem Liked Songs.");
                    const listEmpty = document.querySelector(".popular-section .track-list");
                    if (listEmpty) listEmpty.innerHTML = `<p class="empty">Vui lòng đăng nhập để xem Liked Songs.</p>`;
                    return;
                }

                const tracks = await playlistAPI.getLikedTracks(20, 0);
                const list = document.querySelector(".popular-section .track-list");
                if (!list) return;

                if (!Array.isArray(tracks) || tracks.length === 0) {
                    list.innerHTML = `<p class="empty">Không có bài nào trong Liked Songs.</p>`;
                    player.setTracks([]);
                    return;
                }


                list.innerHTML = tracks.map((t, idx) => `
                    <div class="track-item" data-id="${t.id}">
                        <div class="track-number">${idx + 1}</div>
                        <div class="track-image"><img src="${t.image_url || ''}" alt="${t.title || ''}" /></div>
                        <div class="track-info">
                            <div class="track-name">${t.title || ""}</div>
                        </div>
                        <button class="add-btn" aria-label="like-track">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                        <div class="track-duration">${t.duration ? toMMSS(t.duration) : "--"}</div>
                        <button class="track-menu-btn"><i class="fas fa-ellipsis-h"></i></button>
                    </div>
                `).join("");


                const mapped = tracks.map(t => ({
                    id: t.id,
                    title: t.title,
                    audio_url: t.audio_url,
                    artist_name: t.artist_name,
                    play_count: t.play_count,
                    duration: t.duration,
                    image_url: t.image_url
                }));
                player.setTracks(mapped);
                try { player.$.audio.play(); } catch (err) { }

            } catch (err) {
                console.error("Lỗi khi tải Liked Songs:", err);
                toast.error("Không thể tải Liked Songs. Vui lòng thử lại.");
                const list = document.querySelector(".popular-section .track-list");
                if (list) list.innerHTML = `<p class="error">Không thể tải Liked Songs. Vui lòng thử lại.</p>`;
            }
        }
    });
}

export function renderLikedSongsHero(count = null) {
    const hero = document.querySelector(".artist-hero");
    if (!hero) return;
    const countText = (typeof count === "number") ? `${count} song${count !== 1 ? "s" : ""}` : "Songs";
    hero.innerHTML = `
        <div class="hero-background">
            <div class="hero-image liked-songs liked-hero">
                <i class="fas fa-heart fa-6x"></i>
            </div>
            <div class="hero-overlay"></div>
        </div>
        <div class="hero-content">
            <h1 class="artist-name">Liked Songs</h1>
            <p class="monthly-listeners">
                ${countText}
            </p>
            <p class="album-title">Your collection of liked tracks</p>
        </div>
    `;
}
