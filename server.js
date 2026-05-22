// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const GOVEE_API_URL = "https://localhost:3008";

// Helper to forward requests to Govee API
const proxyToGovee = async (req, res, path, method = "GET") => {
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

// 1. List Devices
console.log("Registering /api/devices route");
app.get("/api/devices", (req, res) => {
  console.log("Hit /api/devices proxy");
  return proxyToGovee(req, res, "/api/devices", "GET");
});

// 2. Set Color
app.post("/api/color", (req, res) => {
  return proxyToGovee(req, res, "/api/color", "POST");
});

// 3. Set Brightness
app.post("/api/brightness", (req, res) => {
  req.body.brightness = req.body.value;
  return proxyToGovee(req, res, "/api/brightness", "POST");
});

// 4. Fade Effect
app.post("/api/fade", (req, res) => {
  return proxyToGovee(req, res, "/api/fade", "POST");
});


// Store arbitrary values by name (reactive-style shared state)
const sharedValues = new Map(); // key: dataName (string) -> value: string | number

const isValidName = (name) =>
  typeof name === "string" &&
  name.length > 0 &&
  name.length <= 128 &&
  /^[A-Za-z0-9_.-]+$/.test(name);

const normalizeValue = (v) => {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "boolean") return v == true ? 1 : 0;
  if (typeof v === "object") return JSON.stringify(v);
  return null;
};



//Get all Preset from ./importAtStartup/Presets
//there are multiple files, each one is a preset
//each file is a json
//each json is a preset
//return a array of [{name:<filename sans .json>, preset:<content of the file>}]
//no require, use fs
app.get("/api/presets", (req, res) => {

  const presets = fs.readdirSync(path.join(".", "importAtStartup", "Presets"));
  const presetsToReturn = presets.map(preset => {
    const presetPath = path.join(".", "importAtStartup", "Presets", preset);
    const presetContent = fs.readFileSync(presetPath, "utf-8");
    return { name: preset.replace(".json", ""), preset: JSON.parse(presetContent) };
  });
  return res.json(JSON.stringify(presetsToReturn));
});

//the same for FlightComputerModules
app.get("/api/flightComputerModules", (req, res) => {
  const modules = fs.readdirSync(path.join(".", "importAtStartup", "FlightComputerModules"));
  const modulesToReturn = modules.map(module => {
    const modulePath = path.join(".", "importAtStartup", "FlightComputerModules", module);
    const moduleContent = fs.readFileSync(modulePath, "utf-8");
    return { name: module.replace(".json", ""), module: JSON.parse(moduleContent) };
  });
  return res.json(JSON.stringify(modulesToReturn));
});

//the same for GameData
app.get("/api/gameData", (req, res) => {
  const gameData = fs.readFileSync(path.join(".", "importAtStartup", "GameData", "gamedata.json"), "utf-8");
  return res.json(JSON.parse(gameData));
});







//GET /api/ => {"dataName": <value>, "dataName": <value>, ...}
// Get all data
app.get("/api", (req, res) => {
  return res.json({ ...sharedValues });
});

// GET /api/:dataName  -> { "<dataName>": <value> }
app.get("/api/:dataName", (req, res) => {

  const { dataName } = req.params;

  const returnValueError = { [dataName]: 0, error: "not found" };

  if (!isValidName(dataName)) {
    return res.json(returnValueError);
  }

  if (!sharedValues.has(dataName)) {
    return res.json(returnValueError);
  }

  //console.log("Get " + dataName + " = " + sharedValues.get(dataName));

  return res.json({ [dataName]: sharedValues.get(dataName) });
});

// GET /api/:dataName  -> { "<dataName>": <value> }
// returns the value of a variable and remove it from the sharedValues map
app.get("/apiR/:dataName", (req, res) => {

  const { dataName } = req.params;

  const returnValueError = { [dataName]: 0, error: "not found" };

  if (!isValidName(dataName)) {
    return res.json(returnValueError);
  }

  if (!sharedValues.has(dataName)) {
    return res.json(returnValueError);
  }

  const returnValue = { [dataName]: sharedValues.get(dataName) };
  sharedValues.delete(dataName);
  return res.json(returnValue);
});

// POST /api/:dataName with body { "value": <string|number> } -> { "<dataName>": <value> }
// creates or updates
app.post("/api/:dataName", async (req, res) => {
  //console.log("Post " + new Date().toISOString());
  const { dataName } = req.params;

  //console.log(req.body);

  if (!isValidName(dataName)) {
    return res.status(400).json({ error: "invalid dataName" });
  }

  const value = normalizeValue(req.body?.value);
  if (value === null) {
    return res.status(400).json({ error: "value must be a string or a finite number" });
  }

  sharedValues.set(dataName, value);
  console.log(dataName + " = " + value);
  //menuAction = {"itemId":"brightness","action":"TOGGLE","value":99.85907322292627}

  if (dataName === "menuAction") {
    const data = JSON.parse(value);
    if (data.itemId === "brightness" && data.action === "TOGGLE") {
      //post to govi api brightness
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brightness: data.value.toFixed(0) }),
      };
      const response = await fetch(`${GOVEE_API_URL}/api/brightness`, options);
      const result = await response.json();
      console.log(result);
    }

    if (data.itemId === "color" && data.action === "TOGGLE") {
      //post to govi api brightness
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ hsl: [Number(data.value.toFixed(0)), 100, 50] }),
      };
      const response = await fetch(`${GOVEE_API_URL}/api/color`, options);
      const result = await response.json();
      console.log(result);
    }

  }




  return res.json({ [dataName]: sharedValues.get(dataName) });
});

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => console.log(`https://localhost:${PORT}`));