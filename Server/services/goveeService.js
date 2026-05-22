import { GOVEE_API_URL } from "../config/index.js";

export const proxyToGovee = async (req, res, path, method = "GET") => {
    try {
        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
        };

        if (method !== "GET" && req.body) {
            options.body = JSON.stringify(req.body);
        }

        // Notice we use fetch directly. 
        // Requires Node 18+ or a polyfill, but original code used 'fetch' so we assume it exists.
        const response = await fetch(`${GOVEE_API_URL}${path}`, options);

        // Forward the status code
        res.status(response.status);

        // Try to parse JSON response, fallback to text if fails (or if empty)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return res.json(data);
        } else {
            const text = await response.text();
            return res.send(text);
        }

    } catch (error) {
        console.error(`Error proxying to Govee API (${path}):`, error);
        return res.status(500).json({ error: "Failed to communicate with Govee API" });
    }
};
