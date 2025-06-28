const fs   = require("fs");
const path = require("path");
const FILE = path.resolve(__dirname, "../data/userData.json");

try {
    const dir = path.dirname(FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}", "utf-8");
} catch (e) {
    console.error("⚠️  Could not bootstrap userData.json:", e);
}

function readStore() {
    try {
        return JSON.parse(fs.readFileSync(FILE, "utf-8"));
    } catch {
        return {};
    }
}

function writeStore(store) {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf-8");
}

exports.getUserData = (userId) => {
    const store = readStore();
    return store[userId] || {};
};

exports.saveUserData = (userId, data) => {
    const store = readStore();
    store[userId] = { ...(store[userId] || {}), ...data };
    writeStore(store);
};
