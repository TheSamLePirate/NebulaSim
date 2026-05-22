import express from "express";
import cors from "cors";
import { logger } from "./middleware/logger.js";
import { apiRouter, otherRouter } from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

// Mount API routes
app.use("/api", apiRouter);

// Mount other routes (like /apiR)
app.use(otherRouter);

export default app;
