import express from "express";
import * as kvController from "../controllers/kvController.js";

const router = express.Router();

// Mounted at /api or /apiR or similar. 
// Original endpoints: 
// GET /api
// GET /api/:dataName
// POST /api/:dataName
// GET /apiR/:dataName

// The challenge: /api serves two purposes in original:
// 1. Govee routes (/api/devices, etc)
// 2. KV routes (/api/:dataName)
//
// If we mount goveeRoutes at /api, and kvRoutes at /api, we must be careful with order.
// "devices", "color", "brightness", "fade" are specific names. 
// ":dataName" is a wildcard.
// Express matches in order.
// So we should mount generic KV routes LAST.

router.get("/", kvController.getAll);
router.get("/:dataName", kvController.getOne);
router.post("/:dataName", kvController.postOne);

export default router;
