// fetchArtists.js
import httpRequest from "../utils/httpRequest.js";

export async function getTrendingArtists(limit = 10) {
    try {
        const res = await httpRequest.get(`artists/trending?limit=${limit}`);
        return res?.artists || [];
    } catch (error) {
        console.error("Lỗi khi lấy danh sách nghệ sĩ:", error);
        return [];
    }
}

export async function getArtistById(id) {
    try {
        return await httpRequest.get(`artists/${id}`);
    } catch (error) {
        console.error("Lỗi khi lấy thông tin nghệ sĩ:", error);
        return null;
    }
}

export async function getArtistPopularTracks(id) {
    try {
        const res = await httpRequest.get(`artists/${id}/tracks/popular`);
        return res?.tracks || [];
    } catch (error) {
        console.error("Lỗi khi lấy tracks của nghệ sĩ:", error);
        return [];
    }
}
