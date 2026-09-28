export const Storage = {
    getItem: (key, defaultValue = null) => {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }
};
