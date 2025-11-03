import httpRequest from "../utils/httpRequest.js";
import { toast } from "./notify.js";
import { attachContextMenu } from "./contextMenu.js";

function ensureAuth() {
    const token = localStorage.getItem("accessToken");
    if (!token) return false;
    if (typeof httpRequest.setToken === "function") httpRequest.setToken(token);
    return true;
}

let _detach = null;

function getMenuItems(element) {
    const type = element.dataset.type;
    const id = element.dataset.id;
    
    if (!type || !id) return [];
    
    const menuMap = {
        playlist: [{ label: "Remove from library", action: "remove-playlist", data: { id, type } }],
        album: [{ label: "Remove from library", action: "unlike-album", data: { id, type } }],
        artist: [{ label: "Unfollow artist", action: "unfollow-artist", data: { id, type } }]
    };
    
    return menuMap[type] || [];
}

async function handleMenuAction(action, data) {
    if (!ensureAuth()) {
        toast.info("Vui lòng đăng nhập để thực hiện thao tác.");
        return;
    }

    try {
        const { id } = data;
        
        if (action === "remove-playlist") {
            await httpRequest.del(`playlists/${id}`);
            toast.success("Đã xóa playlist khỏi thư viện.");
        } else if (action === "unlike-album") {
            await httpRequest.del(`albums/${id}/like`);
            toast.success("Đã bỏ thích album.");
        } else if (action === "unfollow-artist") {
            await httpRequest.del(`artists/${id}/follow`);
            toast.success("Đã hủy theo dõi nghệ sĩ.");
        }

        const activeTab = document.querySelector(".nav-tab.active");
        if (activeTab) activeTab.click();
        else document.dispatchEvent(new CustomEvent("library:updated"));
    } catch (err) {
        console.error("Library context action error:", err);
        toast.error("Thao tác thất bại. Vui lòng thử lại.");
    }
}

export function initLibraryContextMenu() {
    if (typeof _detach === "function") {
        _detach();
        _detach = null;
    }

    _detach = attachContextMenu(".library-item", getMenuItems, handleMenuAction);
}

export function detachLibraryContextMenu() {
    if (typeof _detach === "function") {
        _detach();
        _detach = null;
    }
}