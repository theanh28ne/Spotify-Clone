// Plain script (non-module) to manage Create Playlist modal, upload image and create playlist via API.
import { triggerLibraryRefresh, LibraryEvents } from "./playlists.js";

(function () {
    const overlay = document.querySelector(".playlist-modal-overlay");
    const imageInput = document.getElementById("imageInput");
    const imagePreview = document.getElementById("imagePreview");
    const imageLoading = document.getElementById("imageLoading");
    const nameInput = document.getElementById("playlistName");
    const descInput = document.getElementById("playlistDescription");
    const saveBtn = document.getElementById("saveBtn");
    const createBtn = document.querySelector(".create-btn");

    let uploadedImageUrl = null;

    const API_HOST = window.__API_HOST__ || window.API_HOST || "https://spotify.f8team.dev";
    const API_BASE = `${API_HOST.replace(/\/$/, "")}/api`;


    function showToast(type = "info", message = "", duration = 3000) {
        const container = document.getElementById("toast-container") || (() => {
            const c = document.createElement("div"); c.id = "toast-container"; document.body.appendChild(c); return c;
        })();
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        const text = document.createElement("div");
        text.className = "toast-text";
        text.textContent = message;
        const close = document.createElement("button");
        close.className = "close-btn";
        close.type = "button";
        close.innerHTML = "✕";
        close.addEventListener("click", () => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 200);
        });
        toast.appendChild(text);
        toast.appendChild(close);
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("show"));
        const t = setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 200);
            clearTimeout(t);
        }, duration);
        return {
            dismiss: () => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 200); }
        };
    }

    function setSavingState(isSaving) {
        if (!saveBtn) return;
        saveBtn.disabled = isSaving;
        saveBtn.textContent = isSaving ? "Saving..." : "Save";
    }

    // open modal
    function openModal() {
        if (!overlay) return;
        overlay.style.display = "flex";

        uploadedImageUrl = null;
        imagePreview.src = "";
        imagePreview.style.display = "none";
        if (imageLoading) imageLoading.style.display = "none";
        nameInput.value = "";
        descInput.value = "";
        saveBtn.disabled = true;
    }


    window.closeModal = function closeModal() {
        if (!overlay) return;
        overlay.style.display = "none";

        if (imageInput) imageInput.value = "";
        uploadedImageUrl = null;
        if (imagePreview) { imagePreview.src = ""; imagePreview.style.display = "none"; }
    };


    window.handleImageUpload = async function handleImageUpload(e) {
        const file = e?.target?.files && e.target.files[0];
        if (!file) return;
        if (imageLoading) imageLoading.style.display = "block";

        const token = localStorage.getItem("accessToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const tryFields = ["files", "file", "image", "images"];
        let uploadedUrl = null;
        let lastErr = null;

        for (const field of tryFields) {
            const fd = new FormData();
            fd.append(field, file);

            try {
                const resp = await fetch(`${API_BASE}/upload/images`, {
                    method: "POST",
                    headers,
                    body: fd
                });

                const text = await resp.text().catch(() => "");
                let json = null;
                try { json = text ? JSON.parse(text) : null; } catch (parseErr) { json = null; }

                if (!resp.ok) {

                    const code = json?.error?.code || null;
                    if (code === "LIMIT_UNEXPECTED_FILE" || /Unexpected field/i.test(json?.error?.message || text || "")) {
                        lastErr = { status: resp.status, body: json || text, fieldTried: field };
                        continue;
                    }

                    lastErr = { status: resp.status, body: json || text, fieldTried: field };
                    break;
                }


                const url =
                    json?.files?.[0]?.url ||
                    (json?.file && (Array.isArray(json.file) ? json.file[0]?.url : json.file?.url)) ||
                    json?.url ||
                    json?.data?.[0]?.url;

                if (url) {
                    uploadedUrl = url;
                    break;
                } else {

                    lastErr = { status: resp.status, body: json || text, fieldTried: field };
                    break;
                }
            } catch (err) {
                lastErr = err;

                break;
            }
        }

        if (!uploadedUrl) {
            console.error("Upload image failed:", lastErr);
            showToast("error", "Không thể tải ảnh lên. Kiểm tra field name hoặc server.");
            if (imageLoading) imageLoading.style.display = "none";
            return;
        }


        uploadedImageUrl = uploadedUrl;
        imagePreview.src = uploadedImageUrl;
        imagePreview.style.display = "block";
        showToast("success", "Ảnh đã tải lên.");
        if (imageLoading) imageLoading.style.display = "none";
        updateSaveButtonState();
    };


    function updateSaveButtonState() {
        const name = nameInput?.value?.trim() || "";
        saveBtn.disabled = !name;
    }


    window.handleSave = async function handleSave() {
        const name = nameInput?.value?.trim();
        const description = descInput?.value?.trim() || "";
        if (!name) {
            showToast("info", "Vui lòng nhập tên playlist.");
            return;
        }
        setSavingState(true);
        try {
            const token = localStorage.getItem("accessToken");
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const body = {
                name,
                description,
                is_public: false,
                image_url: uploadedImageUrl || ""
            };
            const resp = await fetch(`${API_BASE}/playlists`, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });
            if (!resp.ok) {
                const txt = await resp.text().catch(() => "");
                console.error("Create playlist failed:", resp.status, txt);
                showToast("error", "Không thể tạo playlist. Thử lại.");
                setSavingState(false);
                return;
            }
            const data = await resp.json();
            showToast("success", "Đã tạo playlist.");
            triggerLibraryRefresh(LibraryEvents.TRACK_LIKED);
            const ev = new CustomEvent("playlist:created", { detail: data });
            document.dispatchEvent(ev);

            window.closeModal();
        } catch (err) {
            console.error("Create playlist error:", err);
            showToast("error", "Lỗi khi tạo playlist. Thử lại.");
        } finally {
            setSavingState(false);
        }
    };


    if (createBtn) {
        createBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal();
        });
    }

    if (nameInput) {
        nameInput.addEventListener("input", updateSaveButtonState);
    }


    window.__createPlaylist = {
        openModal,
        closeModal,
        handleImageUpload,
        handleSave
    };
})();