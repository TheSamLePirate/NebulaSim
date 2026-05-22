// Shared state
const sharedValues = new Map();

export const isValidName = (name) =>
    typeof name === "string" &&
    name.length > 0 &&
    name.length <= 128 &&
    /^[A-Za-z0-9_.-]+$/.test(name);

export const normalizeValue = (v) => {
    if (typeof v === "string") return v;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "boolean") return v == true ? 1 : 0;
    if (typeof v === "object") return JSON.stringify(v);
    return null;
};

export const getAllValues = () => {
    // shallow copy to object
    const obj = {};
    for (const [k, v] of sharedValues) {
        obj[k] = v;
    }
    return obj;
};

export const getValue = (key) => {
    return sharedValues.get(key);
};

export const hasValue = (key) => {
    return sharedValues.has(key);
};

export const setValue = (key, value) => {
    sharedValues.set(key, value);
    return value;
};

export const deleteValue = (key) => {
    const val = sharedValues.get(key);
    sharedValues.delete(key);
    return val;
}
