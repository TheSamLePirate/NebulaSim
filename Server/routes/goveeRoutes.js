import express from "express";
import * as goveeController from "../controllers/goveeController.js";

const router = express.Router();

// Defined as /api/devices, /api/color, etc. in original.
// We will mount this router at /api

router.get("/devices", goveeController.listDevices);
router.post("/color", goveeController.setColor);
router.post("/brightness", goveeController.setBrightness);
router.post("/fade", goveeController.setFade);

export default router;
