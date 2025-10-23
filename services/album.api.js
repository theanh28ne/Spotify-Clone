import httpRequest from "../utils/httpRequest.js";

export const albumAPI = {
    async getPopular(limit = 20) {
        return await httpRequest.get(`albums/popular?limit=${limit}`);
    },

    async getById(id) {
        return await httpRequest.get(`albums/${id}`);
    },

    async getTracks(id) {
        return await httpRequest.get(`albums/${id}/tracks`);
    },
};
