// Lớp HttpRequest giúp gửi các yêu cầu HTTP đến API backend một cách gọn gàng và thống nhất
class HttpRequest {
    constructor() {
        // Base URL — phần gốc cho mọi endpoint API
        this.baseURL = "https://spotify.f8team.dev/api/";

        // Biến lưu token hiện tại trong instance (nếu có)
        this.token = localStorage.getItem("accessToken") || null;
    }

    /**
     * Thiết lập (hoặc xóa) token cho HttpRequest instance
     * Giúp đảm bảo mọi request tiếp theo đều có Authorization header
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem("accessToken", token);
        } else {
            localStorage.removeItem("accessToken");
        }
    }

    // Hàm xử lý gửi request chính (dùng nội bộ)
    async _send(path, method, data = null, options = {}) {
        try {
            // Ghép baseURL với path để tạo URL đầy đủ
            const url = `${this.baseURL}${path}`;

            // Tạo header mặc định (luôn có Content-Type)
            const headers = {
                "Content-Type": "application/json",
                ...options.headers, // cho phép ghi đè nếu cần
            };

            // Nếu có token (được set khi đăng nhập/đăng ký), thêm Authorization header
            if (this.token) {
                headers.Authorization = `Bearer ${this.token}`;
            }

            // Cấu hình request
            const config = {
                ...options,
                method,
                headers,
            };

            // Nếu có body và không phải GET/DELETE thì thêm vào
            if (data && !["GET", "DELETE"].includes(method.toUpperCase())) {
                config.body = JSON.stringify(data);
            }

            // Gửi request bằng Fetch API
            const res = await fetch(url, config);

            // Nếu có dữ liệu JSON trong response thì parse, ngược lại để null
            let responseData = null;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                responseData = await res.json();
            }

            // Kiểm tra mã trạng thái — nếu không phải 2xx thì ném lỗi
            if (!res.ok) {
                const error = new Error(`HTTP Error: ${res.status}`);
                error.response = responseData;
                error.status = res.status;
                throw error;
            }

            // Nếu request hợp lệ → trả về dữ liệu
            return responseData;

        } catch (error) {
            // In lỗi ra console (hoặc có thể dùng toast UI)
            console.error("HttpRequest Error:", error.message);
            // Quan trọng: Ném lại lỗi để nơi gọi (try...catch bên ngoài) xử lý tiếp
            throw error;
        }
    }

    // ------------------------------
    // Các phương thức tiện dụng
    // ------------------------------

    async get(path, options) {
        return await this._send(path, "GET", null, options);
    }

    async post(path, data, options) {
        return await this._send(path, "POST", data, options);
    }

    async put(path, data, options) {
        return await this._send(path, "PUT", data, options);
    }

    async patch(path, data, options) {
        return await this._send(path, "PATCH", data, options);
    }

    async del(path, options) {
        return await this._send(path, "DELETE", null, options);
    }
}

// Tạo instance chung cho toàn bộ dự án
const httpRequest = new HttpRequest();

export default httpRequest;
