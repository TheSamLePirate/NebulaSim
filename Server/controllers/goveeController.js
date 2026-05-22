import * as goveeService from "../services/goveeService.js";

// 1. List Devices
export const listDevices = (req, res) => {
    console.log("Hit /api/devices proxy");
    return goveeService.proxyToGovee(req, res, "/api/devices", "GET");
};

// 2. Set Color
export const setColor = (req, res) => {
    return goveeService.proxyToGovee(req, res, "/api/color", "POST");
};

// 3. Set Brightness
export const setBrightness = (req, res) => {
    // Ensure business logic from original server.js is preserved
    // "req.body.brightness = req.body.value;"
    if (req.body && req.body.value !== undefined) {
        req.body.brightness = req.body.value;
    }
    return goveeService.proxyToGovee(req, res, "/api/brightness", "POST");
};

// 4. Fade Effect
export const setFade = (req, res) => {
    return goveeService.proxyToGovee(req, res, "/api/fade", "POST");
};
