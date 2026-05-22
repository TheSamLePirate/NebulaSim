// Shared mutable storage for module draw times
// This acts as a bridge between the high-frequency Canvas render loop
// and the lower-frequency Flight Computer logic loop without triggering React updates.

export const moduleDrawTimes: Record<string, number> = {};

export const resetDrawTimes = () => {
    for (const key in moduleDrawTimes) {
        delete moduleDrawTimes[key];
    }
};
