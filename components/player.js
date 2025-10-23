import { toMMSS } from "../utils/formatTime.js";
import httpRequest from "../utils/httpRequest.js";
import { toast } from "./notify.js";
import { attachContextMenu } from "./contextMenu.js";
import { playlistAPI } from "../services/playlist.api.js";

class Player {
    constructor() {
        // constants
        this.NEXT = 1;
        this.PREV = -1;

        // state
        this.isSeeking = false;
        this.isRepeat = JSON.parse(localStorage.getItem("isRepeat")) || false;
        this.isRandom = JSON.parse(localStorage.getItem("isRandom")) || false;
        this.currentIndex = 0;
        this.pool = [];

        const savedVolume = parseFloat(localStorage.getItem("volume"));
        this.volume = Number.isFinite(savedVolume) ? savedVolume : 0.7;
        this.isMuted = false;

        // DOM
        this.$ = {
            // Popular section
            playlist: document.querySelector(".popular-section .track-list"),
            // Player (footer)
            playingName: document.querySelector(".player-title"),
            playingArtist: document.querySelector(".player-artist"),
            playingImage: document.querySelector(".player-image"),
            audio: document.querySelector("#audio"),
            controlBtn: document.querySelector(".player .play-btn"),
            prev: document.querySelectorAll(".player .control-btn")[1],
            next: document.querySelectorAll(".player .control-btn")[3],
            progressContainer: document.querySelector(".player .progress-container"),
            progressBar: document.querySelector(".player .progress-bar"),
            progressFill: document.querySelector(".player .progress-fill"),
            progressHandle: document.querySelector(".player .progress-handle"),
            repeat: document.querySelectorAll(".player .control-btn")[4],
            random: document.querySelectorAll(".player .control-btn")[0],
            duration: document.querySelectorAll(".player .time")[1],
            runtime: document.querySelectorAll(".player .time")[0],
            volumeContainer: document.querySelector(".volume-container"),
            volumeBtn: document.querySelector(".volume-container .control-btn"),
            volumeBar: document.querySelector(".volume-container .volume-bar"),
            volumeFill: document.querySelector(".volume-container .volume-fill"),
            volumeHandle: document.querySelector(".volume-container .volume-handle"),

        };

        // danh sách bài hát
        this.songs = [
            { id: 1, name: "Beautiful Things", path: "../fakermusic/Beautiful Things.mp3", artist: "Benson Boone", plays: "27,498,341", duration: 258 },
            { id: 2, name: "Lặng", path: "../fakermusic/Lặng.mp3", artist: "Rhymastic", plays: "45,686,866", duration: 252 },
            { id: 3, name: "Moonlight City", path: "../fakermusic/Moonlight City.mp3", artist: "Minh Tốc và Lam", plays: "20,039,024", duration: 206 },
            { id: 4, name: "Phép Màu", path: "../fakermusic/Phép Màu.mp3", artist: "Minh Tốc", plays: "10,000,000", duration: 210 },
        ];

        // context menu state for track -> playlist
        this._detachTrackMenu = null;
        this._playlistsCache = [];
    }

    // helper to set auth token on httpRequest
    _ensureAuthTokenOnRequest() {
        const token = localStorage.getItem("accessToken");
        if (token && typeof httpRequest.setToken === "function") {
            httpRequest.setToken(token);
            return true;
        }
        return false;
    }

    // load user's playlists into cache
    async _loadPlaylistsCache() {
        try {
            if (!this._ensureAuthTokenOnRequest()) {
                this._playlistsCache = [];
                return;
            }
            const pls = await playlistAPI.getAll(50, 0);
            // normalize possible shapes
            if (Array.isArray(pls)) this._playlistsCache = pls;
            else this._playlistsCache = pls?.data || pls?.playlists || [];
        } catch (err) {
            console.warn("Không thể load playlists for context menu:", err);
            this._playlistsCache = [];
        }
    }

    // init context menu for track items (attach once)
    _initTrackContextMenu() {
        // detach previous if existing
        if (typeof this._detachTrackMenu === "function") {
            this._detachTrackMenu();
            this._detachTrackMenu = null;
        }

        // ensure playlists cache is loaded, then attach menu (non-blocking)
        (async () => {
            await this._loadPlaylistsCache();

            this._detachTrackMenu = attachContextMenu(".track-item", (targetEl) => {
                const trackId = targetEl?.dataset?.id;
                if (!trackId) return [];
                // if no playlists, show single disabled item
                if (!this._playlistsCache || this._playlistsCache.length === 0) {
                    return [{ label: "No playlists", action: "noop", data: null }];
                }
                // list playlists
                return this._playlistsCache.map(pl => ({
                    label: pl.name || "Untitled",
                    action: "add-to-playlist",
                    data: { playlistId: pl.id, trackId }
                }));
            }, async (action, data, targetEl) => {
                if (action !== "add-to-playlist" || !data?.playlistId || !data?.trackId) return;
                if (!this._ensureAuthTokenOnRequest()) {
                    toast.info("Vui lòng đăng nhập để thêm track vào playlist.");
                    return;
                }
                try {
                    // API: POST /api/playlists/:playlistId/tracks/:trackId with body { track_id, position }
                    const body = { track_id: data.trackId, position: 0 };
                    await httpRequest.post(`playlists/${data.playlistId}/tracks`, body);
                    toast.success("Đã thêm track vào playlist.");
                } catch (err) {
                    console.error("Lỗi khi thêm track vào playlist:", err);
                    if (err && err.status === 409) {
                        toast.info("Track đã có trong playlist.");
                    } else {
                        toast.error("Không thể thêm track. Vui lòng thử lại.");
                    }
                }
            });
        })();

        // refresh cache when new playlist is created elsewhere
        document.addEventListener("playlist:created", async () => {
            await this._loadPlaylistsCache();
        });
    }

    // lấy bài hiện tại
    get currentSong() {
        return this.songs[this.currentIndex];
    }

    // tạo danh sách pool ngẫu nhiên (trừ bài hiện tại)
    _generatePool() {
        return this.songs.map((_, i) => i).filter((i) => i !== this.currentIndex);
    }

    // lấy ngẫu nhiên 1 index từ pool và loại bỏ khỏi pool
    _getRandomIndexFromPool() {
        if (this.pool.length === 0) {
            this.pool = this._generatePool();
        }
        const randIdx = Math.floor(Math.random() * this.pool.length);
        const nextIndex = this.pool.splice(randIdx, 1)[0];
        return nextIndex;
    }

    // chuyển bài kế tiếp hoặc lùi lại
    handleControl = (step) => {
        const { songs } = this;
        this.currentIndex = (this.currentIndex + step + songs.length) % songs.length;
        this.renderPlayer();
        this.$.audio.play();
    };

    // xử lý khi bài hát kết thúc
    handleEnded = () => {
        const audio = this.$.audio;

        if (this.isRepeat) {
            audio.currentTime = 0;
            audio.play();
            return;
        }

        if (this.isRandom) {
            const nextIndex = this._getRandomIndexFromPool();
            this.currentIndex = nextIndex;
            this.renderPlayer();
            audio.play();
            return;
        }

        // nếu không random
        this.handleControl(this.NEXT);
        audio.play();
    };

    // toggle repeat
    toggleRepeat = () => {
        this.isRepeat = !this.isRepeat;
        localStorage.setItem("isRepeat", this.isRepeat);
        this.$.repeat.classList.toggle("active", this.isRepeat);
    };

    // toggle random 
    toggleRandom = () => {
        this.isRandom = !this.isRandom;
        localStorage.setItem("isRandom", this.isRandom);
        this.$.random.classList.toggle("active", this.isRandom);

        if (this.isRandom) {
            this.pool = this._generatePool();
        } else {
            this.pool = [];
        }
    };

    // khởi tạo player
    init = () => {
        const { audio, playlist, controlBtn, next, prev, progressBar, repeat, random } = this.$;

        // Render danh sách bài hát ở .popular-section
        this.renderPlaylist();

        // init track -> playlist context menu
        this._initTrackContextMenu();

        // Chọn bài trong popular-section
        playlist.addEventListener("click", (e) => {
            const songEl = e.target.closest(".track-item");
            if (!songEl) return;
            const items = Array.from(playlist.querySelectorAll(".track-item"));
            const idx = items.indexOf(songEl);
            if (idx === -1) return;
            this.currentIndex = idx;
            this.renderPlayer();
            audio.play();
        });

        // play/pause button
        controlBtn.addEventListener("click", () => (audio.paused ? audio.play() : audio.pause()));

        // Lấy nút play lớn ở artist-controls
        const artistPlayBtn = document.querySelector(".artist-controls .play-btn-large");

        // Hàm cập nhật icon cho cả hai nút
        function updatePlayState() {
            const isPlaying = !audio.paused;
            controlBtn.innerHTML = isPlaying
                ? `<i class="fas fa-pause"></i>`
                : `<i class="fas fa-play"></i>`;
            if (artistPlayBtn) {
                artistPlayBtn.innerHTML = isPlaying
                    ? `<i class="fas fa-pause"></i>`
                    : `<i class="fas fa-play"></i>`;
            }
        }

        audio.addEventListener("play", updatePlayState);
        audio.addEventListener("pause", updatePlayState);

        // Khi bấm nút ở artist-controls
        if (artistPlayBtn) {
            artistPlayBtn.addEventListener("click", () => {
                if (audio.paused) audio.play();
                else audio.pause();
            });
        }

        // next / prev
        next.addEventListener("click", () => {
            this.handleControl(this.NEXT);
        });
        prev.addEventListener("click", () => {
            if (audio.currentTime < 2) {
                this.handleControl(this.PREV);
            } else {
                audio.currentTime = 0;
                audio.play();
            }
        });

        // cập nhật thanh tiến trình
        audio.addEventListener("timeupdate", () => {
            const { duration, currentTime } = audio;
            if (!duration || this.isSeeking) return;
            this.$.runtime.textContent = toMMSS(currentTime);
            const percent = (currentTime / duration) * 100;
            this.$.progressFill.style.width = percent + "%";
        });

        // khi bài hát kết thúc
        audio.addEventListener("ended", this.handleEnded);

        // kéo progress
        let isDragging = false;
        this.$.progressBar.addEventListener("mousedown", (e) => {
            isDragging = true;
        });
        document.addEventListener("mouseup", (e) => {
            if (isDragging) {
                isDragging = false;
                const rect = this.$.progressBar.getBoundingClientRect();
                const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                audio.currentTime = percent * audio.duration;
            }
        });
        this.$.progressBar.addEventListener("mousemove", (e) => {
            if (isDragging) {
                const rect = this.$.progressBar.getBoundingClientRect();
                const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                this.$.progressFill.style.width = percent * 100 + "%";
            }
        });

        // nút repeat và random
        repeat.addEventListener("click", this.toggleRepeat);
        random.addEventListener("click", this.toggleRandom);

        // khởi tạo trạng thái ban đầu
        this.pool = this._generatePool();
        this.renderPlayer();
        repeat.classList.toggle("active", this.isRepeat);
        random.classList.toggle("active", this.isRandom);

        // Volume control
        this.$.audio.volume = this.volume;
        this.updateVolumeUI(this.volume);

        // Sự kiện kéo thanh volume
        let isVolumeDragging = false;

        this.$.volumeBar.addEventListener("mousedown", (e) => {
            isVolumeDragging = true;
            this.handleVolumeChange(e);
        });

        document.addEventListener("mouseup", () => {
            isVolumeDragging = false;
        });

        this.$.volumeBar.addEventListener("mousemove", (e) => {
            if (isVolumeDragging) this.handleVolumeChange(e);
        });

        // Nút mute/unmute
        this.$.volumeBtn.addEventListener("click", () => {
            this.isMuted = !this.isMuted;
            this.$.audio.muted = this.isMuted;
            this.$.volumeBtn.innerHTML = this.isMuted
                ? `<i class="fas fa-volume-mute"></i>`
                : `<i class="fas fa-volume-down"></i>`;
        });

    };

    // Render danh sách bài hát ở .popular-section
    renderPlaylist = () => {
        const { playlist } = this.$;
        playlist.innerHTML = this.songs.map((s, idx) => `
            <div class="track-item${idx === this.currentIndex ? " playing" : ""}" data-id="${s.id}">
                <div class="track-number">${idx + 1}</div>
                <div class="track-image">
                    <img src="${s.image || 'placeholder.svg?height=40&width=40'}" alt="${s.name}" />
                </div>
                <div class="track-info">
                    <div class="track-name${idx === this.currentIndex ? " playing-text" : ""}">
                        ${s.name}
                    </div>
                </div>
                <button class="add-btn" aria-label="like-track">
                    <i class="fa-solid fa-plus"></i>
                </button>
                
                <div class="track-duration">${s.duration ? toMMSS(s.duration) : "--"}</div>
                <button class="track-menu-btn">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </div>
        `).join("");
    };

    // Render player (footer) với bài hát hiện tại
    renderPlayer = () => {
        const { playingName, playingArtist, playingImage, duration, audio } = this.$;
        const song = this.currentSong;

        playingName.textContent = song.name;
        playingArtist.textContent = song.artist;

        if (playingImage && song.image) {
            playingImage.src = song.image;
            playingImage.alt = song.name;
        }

        audio.src = song.path;

        // Highlight bài hát đang phát ở popular-section
        this.renderPlaylist();

        // Cập nhật thời lượng khi audio load xong
        const onLoaded = () => {
            duration.textContent = toMMSS(audio.duration);
            audio.removeEventListener("loadedmetadata", onLoaded);
        };
        audio.addEventListener("loadedmetadata", onLoaded);
    };
    // cập nhật UI theo volume hiện tại
    updateVolumeUI(volume) {
        const percent = volume * 100;
        this.$.volumeFill.style.width = percent + "%";
        this.$.volumeHandle.style.left = percent + "%";
    }

    // xử lý thay đổi volume khi kéo
    handleVolumeChange(e) {
        const rect = this.$.volumeBar.getBoundingClientRect();
        const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        this.volume = percent;
        this.$.audio.volume = this.volume;
        this.updateVolumeUI(this.volume);
        localStorage.setItem("volume", this.volume);

        // nếu đang mute thì bỏ mute khi có thao tác
        if (this.isMuted && this.volume > 0) {
            this.isMuted = false;
            this.$.audio.muted = false;
            this.$.volumeBtn.innerHTML = `<i class="fas fa-volume-down"></i>`;
        }
    }

    setTracks(tracks) {
        // handle empty track list gracefully (avoid renderPlayer errors)
        if (!Array.isArray(tracks) || tracks.length === 0) {
            this.songs = [];
            this.currentIndex = 0;
            this.pool = [];

            // update popular-section to show "no tracks"
            if (this.$.playlist) {
                this.$.playlist.innerHTML = `<p class="empty">Không có tracks trong playlist.</p>`;
            }

            // clear footer / player UI
            if (this.$.playingName) this.$.playingName.textContent = "";
            if (this.$.playingArtist) this.$.playingArtist.textContent = "";
            if (this.$.playingImage) { this.$.playingImage.src = ""; this.$.playingImage.alt = ""; }

            if (this.$.audio) {
                try { this.$.audio.pause(); } catch { }
                this.$.audio.src = "";
            }

            if (this.$.duration) this.$.duration.textContent = "--";
            if (this.$.runtime) this.$.runtime.textContent = "--";

            return;
        }

        // normal case: map normalized track objects into internal song shape
        this.songs = tracks.map(track => ({
            id: track.id,
            name: track.title || track.name || "",
            path: track.audio_url || track.path || "",
            artist: track.artist_name || track.artist || "",
            plays: track.play_count || track.plays || 0,
            duration: track.duration || 0,
            image: track.image_url || track.image || ""
        }));
        this.currentIndex = 0;
        this.pool = this._generatePool();
        this.renderPlayer();
    }

}

// khởi tạo player
const player = new Player();
player.init();
export default player;
