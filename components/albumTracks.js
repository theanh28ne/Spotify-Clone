import { toMMSS } from "../utils/formatTime.js";

// Render thông tin album vào .artist-hero
export function renderAlbumHero(album) {
    const hero = document.querySelector(".artist-hero");
    if (!hero) return;
    hero.innerHTML = `
        <div class="hero-background">
            <img src="${album.cover_image_url}" alt="${album.title}" class="hero-image" />
            <div class="hero-overlay"></div>
        </div>
        <div class="hero-content">
            <div class="verified-badge">
                <i class="fas fa-check-circle"></i>
                <span>Verified Artist</span>
            </div>
            <h1 class="artist-name">${album.artist_name}</h1>
            <p class="monthly-listeners">
                ${album.total_tracks} tracks • ${toMMSS(album.total_duration)}
            </p>
            <p class="album-title">${album.title}</p>
            <p class="album-release">Phát hành: ${album.release_date}</p>
        </div>
    `;
}

// Render danh sách tracks vào .popular-section .track-list
export function renderAlbumTracks(tracks) {
    const section = document.querySelector(".popular-section .track-list");
    if (!section) return;
    section.innerHTML = tracks.map((track, idx) => `
        <div class="track-item" data-id="${track.id}">
            <div class="track-number">${idx + 1}</div>
            <div class="track-image">
                <img src="${track.image_url}" alt="${track.title}" />
            </div>
            <div class="track-info">
                <div class="track-name">${track.title}</div>
            </div>
            <div class="track-plays">${track.play_count || 0}</div>
            <div class="track-duration">${toMMSS(track.duration)}</div>
            <button class="track-menu-btn">
                <i class="fas fa-ellipsis-h"></i>
            </button>
        </div>
    `).join("");
}