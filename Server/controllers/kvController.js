import * as kvService from "../services/kvService.js";
import { GOVEE_API_URL } from "../config/index.js";
// Note: We might need to call Govee API from here as per original logic.
// Original used 'fetch' to GOVEE_API_URL. We can import that URL.

export const getAll = (req, res) => {
    return res.json(kvService.getAllValues());
};

export const getOne = (req, res) => {
    const { dataName } = req.params;
    const returnValueError = { [dataName]: 0, error: "not found" };

    if (!kvService.isValidName(dataName)) {
        return res.json(returnValueError);
    }

    if (!kvService.hasValue(dataName)) {
        return res.json(returnValueError);
    }

    return res.json({ [dataName]: kvService.getValue(dataName) });
};

export const getOneAndRemove = (req, res) => {
    const { dataName } = req.params;
    const returnValueError = { [dataName]: 0, error: "not found" };

    if (!kvService.isValidName(dataName)) {
        return res.json(returnValueError);
    }

    if (!kvService.hasValue(dataName)) {
        return res.json(returnValueError);
    }

    const value = kvService.deleteValue(dataName);
    return res.json({ [dataName]: value });
};

export const postOne = async (req, res) => {
    const { dataName } = req.params;

    if (!kvService.isValidName(dataName)) {
        return res.status(400).json({ error: "invalid dataName" });
    }

    const value = kvService.normalizeValue(req.body?.value);
    if (value === null) {
        return res.status(400).json({ error: "value must be a string or a finite number" });
    }

    kvService.setValue(dataName, value);
    console.log(dataName + " = " + value);

    // Side effects for menuAction
    if (dataName === "menuAction") {
        try {
            const data = JSON.parse(value);

            if (data.itemId === "brightness" && data.action === "TOGGLE") {
                const options = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brightness: data.value.toFixed(0) }),
                };
                const response = await fetch(`${GOVEE_API_URL}/api/brightness`, options);
                const result = await response.json();
                console.log(result);
            }

            if (data.itemId === "color" && data.action === "TOGGLE") {
                const options = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ hsl: [Number(data.value.toFixed(0)), 100, 50] }),
                };
                const response = await fetch(`${GOVEE_API_URL}/api/color`, options);
                const result = await response.json();
                console.log(result);
            }
        } catch (e) {
            console.error("Error processing menuAction:", e);
        }
    }

    return res.json({ [dataName]: kvService.getValue(dataName) });
};
