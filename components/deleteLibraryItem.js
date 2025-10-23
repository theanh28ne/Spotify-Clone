import httpRequest from "../utils/httpRequest.js";
import { toast } from "./notify.js";

function ensureAuth() {
    const token = localStorage.getItem("accessToken");
    if (!token) return false;
    if (typeof httpRequest.setToken === "function") httpRequest.setToken(token);
    return true;
}

let _detach = null;
let _menu = null;

function createMenuIfNeeded() {
    if (_menu) return _menu;
    _menu = document.createElement("div");
    _menu.id = "library-context-menu";
    Object.assign(_menu.style, {
        position: "fixed",
        minWidth: "160px",
        background: "#222",
        color: "#fff",
        borderRadius: "6px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
        padding: "6px 0",
        zIndex: "10000",
        display: "none",
        fontSize: "14px",
        overflow: "hidden",
    });
    document.body.appendChild(_menu);

    // hide handlers
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#library-context-menu")) hideMenu();
    });
    window.addEventListener("resize", hideMenu);
    window.addEventListener("scroll", hideMenu, { passive: true });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideMenu(); });

    return _menu;
}

function renderMenuFor(type) {
    const menu = createMenuIfNeeded();
    menu.innerHTML = "";
    if (type === "playlist") {
        menu.innerHTML = `<div class="menu-item" data-action="remove-playlist" style="padding:8px 16px; cursor:pointer;">Remove from library</div>`;
    } else if (type === "album") {
        menu.innerHTML = `<div class="menu-item" data-action="unlike-album" style="padding:8px 16px; cursor:pointer;">Remove from library</div>`;
    } else if (type === "artist") {
        menu.innerHTML = `<div class="menu-item" data-action="unfollow-artist" style="padding:8px 16px; cursor:pointer;">Unfollow artist</div>`;
    }
    return menu;
}

function showMenuAt(x, y) {
    const menu = createMenuIfNeeded();
    menu.style.display = "block";
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = menu.getBoundingClientRect();
    const left = Math.min(Math.max(pad, x), vw - rect.width - pad);
    const top = Math.min(Math.max(pad, y), vh - rect.height - pad);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

function hideMenu() {
    if (_menu) {
        _menu.style.display = "none";
        _menu.dataset.itemId = "";
        _menu.dataset.itemType = "";
    }
}

function findLibraryItemFromEvent(e) {
    // try closest first
    const closest = e.target && e.target.closest && e.target.closest(".library-item");
    if (closest) return closest;
    // fallback to composedPath
    const path = e.composedPath ? e.composedPath() : (e.path || []);
    for (const node of path) {
        try {
            if (node && node.matches && node.matches(".library-item")) return node;
        } catch (err) { /* ignore */ }
    }
    return null;
}

export function initLibraryContextMenu() {
    // detach previous
    if (typeof _detach === "function") {
        _detach();
        _detach = null;
    }

    // listen on document capture so we catch event before other handlers block it
    const onContext = (e) => {
        const item = findLibraryItemFromEvent(e);
        if (!item) return; // not a library item -> ignore

        // debug: confirm we detected item
        console.debug("[deleteLibraryItem] contextmenu on library-item", item);

        // prevent browser default and stop other handlers
        try { e.preventDefault(); } catch (err) { }
        try { e.stopImmediatePropagation(); } catch (err) { }

        const type = item.dataset.type;
        const id = item.dataset.id;
        if (!type) return;

        const menu = renderMenuFor(type);
        menu.dataset.itemType = type;
        menu.dataset.itemId = id || "";

        showMenuAt(e.clientX, e.clientY);

        // one-time click handler for menu items
        const onMenuClick = async (clickEvent) => {
            const sel = clickEvent.target.closest(".menu-item");
            if (!sel) {
                hideMenu();
                document.removeEventListener("click", onMenuClick);
                return;
            }
            const action = sel.dataset.action;
            hideMenu();
            document.removeEventListener("click", onMenuClick);

            if (!ensureAuth()) {
                toast.info("Vui lòng đăng nhập để thực hiện thao tác.");
                return;
            }

            try {
                if (action === "remove-playlist" && id) {
                    await httpRequest.delete(`playlists/${id}`);
                    toast.success("Đã xóa playlist khỏi thư viện.");
                } else if (action === "unlike-album" && id) {
                    await httpRequest.delete(`albums/${id}/like`);
                    toast.success("Đã bỏ thích album.");
                } else if (action === "unfollow-artist" && id) {
                    await httpRequest.delete(`artists/${id}/follow`);
                    toast.success("Đã hủy theo dõi nghệ sĩ.");
                }

                const activeTab = document.querySelector(".nav-tab.active");
                if (activeTab) activeTab.click();
                else document.dispatchEvent(new CustomEvent("library:updated"));
            } catch (err) {
                console.error("Library context action error:", err);
                toast.error("Thao tác thất bại. Vui lòng thử lại.");
            }
        };

        document.addEventListener("click", onMenuClick);
    };

    document.addEventListener("contextmenu", onContext, true);
    _detach = () => {
        document.removeEventListener("contextmenu", onContext, true);
        hideMenu();
    };
}

export function detachLibraryContextMenu() {
    if (typeof _detach === "function") {
        _detach();
        _detach = null;
    }
}