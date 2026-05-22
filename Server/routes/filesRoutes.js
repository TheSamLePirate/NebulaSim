import express from "express";
import * as filesController from "../controllers/filesController.js";

const router = express.Router();

// Mounted at /api

router.get("/presets", filesController.getPresets);
router.get("/flightComputerModules", filesController.getFlightComputerModules);
router.get("/gameData", filesController.getGameData);

export default router;
