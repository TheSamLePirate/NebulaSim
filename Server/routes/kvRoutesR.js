import express from "express";
import * as kvController from "../controllers/kvController.js";

const router = express.Router();

// Original: GET /apiR/:dataName
router.get("/:dataName", kvController.getOneAndRemove);

export default router;
