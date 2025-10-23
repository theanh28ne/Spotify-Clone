import httpRequest from "../utils/httpRequest.js";

export const playlistAPI = {
    // giữ các hàm cũ nếu cần
    async getAll(limit = 20, offset = 0) {
        try {
            const res = await httpRequest.get(`me/playlists?limit=${limit}&offset=${offset}`);
            return res?.playlists || res?.data || res || [];
        } catch (error) {
            console.error("Lỗi khi lấy playlists của user:", error);
            return [];
        }
    },

    // LIKE một track: POST /api/tracks/:trackId/like
    async likeTrack(trackId) {
        try {
            const res = await httpRequest.post(`tracks/${trackId}/like`, {});
            return { success: true, data: res };
        } catch (error) {
            // nếu server trả 409 => đã like trước đó -> treat as success
            if (error && error.status === 409) {
                return { success: true, alreadyLiked: true };
            }
            console.error(`Lỗi khi like track ${trackId}:`, error);
            return { success: false, error };
        }
    },

    // Lấy danh sách track đã like của user: GET /api/me/tracks/liked
    async getLikedTracks(limit = 20, offset = 0) {
        // sanitize limit to server-acceptable range
        const maxAllowed = 100; // adjust if API doc says different
        let safeLimit = Number(limit) || 20;
        safeLimit = Math.max(1, Math.min(safeLimit, maxAllowed));

        try {
            const res = await httpRequest.get(`me/tracks/liked?limit=${safeLimit}&offset=${offset}`);
            // normalize common shapes
            if (Array.isArray(res)) return res;
            if (res && Array.isArray(res.tracks)) return res.tracks;
            if (res && Array.isArray(res.data)) return res.data;
            return res || [];
        } catch (err) {
            // log full response if available for debugging
            console.warn("Lỗi khi lấy liked tracks:", err?.response ?? err);
            // if bad request, return empty array (don't break UI)
            if (err && err.status === 400) return [];
            throw err;
        }
    },

    // nếu vẫn cần các hàm albums/artists
    async getLikedAlbums(limit = 20, offset = 0) {
        try {
            const res = await httpRequest.get(`me/albums/liked?limit=${limit}&offset=${offset}`);
            return res?.albums || res?.data || res || [];
        } catch (error) {
            console.error("Lỗi khi lấy liked albums:", error);
            return [];
        }
    },

    async getFollowingArtists(limit = 20, offset = 0) {
        try {
            const res = await httpRequest.get(`me/following?limit=${limit}&offset=${offset}`);
            return res?.artists || res?.data || res || [];
        } catch (error) {
            console.error("Lỗi khi lấy following artists:", error);
            return [];
        }
    },

    // Tạo playlist mới (POST /api/playlists)
    async create(payload) {
        try {
            const res = await httpRequest.post("playlists", payload);
            // backend có thể trả về { playlist: {...} } hoặc playlist object trực tiếp
            return res?.playlist || res || null;
        } catch (error) {
            console.error("Lỗi khi tạo playlist:", error);
            return null;
        }
    },

    // Thêm track vào playlist (POST /api/playlists/:playlistId/tracks)
    async addTrack(playlistId, trackId, position = 0) {
        try {
            const body = {
                track_id: trackId,
                position
            };
            const res = await httpRequest.post(`playlists/${playlistId}/tracks`, body);
            return res || null;
        } catch (error) {
            console.error(`Lỗi khi thêm track ${trackId} vào playlist ${playlistId}:`, error);
            return null;
        }
    }
};
