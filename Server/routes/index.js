import express from "express";
import goveeRoutes from "./goveeRoutes.js";
import filesRoutes from "./filesRoutes.js";
import kvRoutes from "./kvRoutes.js";
import kvRoutesR from "./kvRoutesR.js";

const router = express.Router();

// Order matters! 
// Specific routes first.

// Govee: /api/devices, /api/color...
router.use(goveeRoutes);

// Files: /api/presets, ...
router.use(filesRoutes);

// KV Read Once: /apiR/...
// This is NOT under /api in the original. It is /apiR.
// So we should NOT mount it here if this router is for /api.
// But wait, App.js will mount this router.
// If we create a separate router for 'apiR', we should export it or handle it in app.js.
// Let's make this file export routes to be mounted. 

// Actually, `kvRoutesR` is better handled at the app level if the prefix is different.
// But to keep it clean, let's export a specific router setup.

export const apiRouter = express.Router();
apiRouter.use(goveeRoutes);
apiRouter.use(filesRoutes);
// KV is catch-all for /api/:dataName, so it must be last in /api
apiRouter.use(kvRoutes);

export const otherRouter = express.Router();
otherRouter.use("/apiR", kvRoutesR); // mount /apiR
