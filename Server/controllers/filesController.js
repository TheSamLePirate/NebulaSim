import * as fileService from "../services/fileService.js";

export const getPresets = (req, res) => {
    const data = fileService.getPresets();
    return res.json(JSON.stringify(data));
};

export const getFlightComputerModules = (req, res) => {
    const data = fileService.getFlightComputerModules();
    return res.json(JSON.stringify(data));
};

export const getGameData = (req, res) => {
    const data = fileService.getGameData();
    return res.json(data);
};
