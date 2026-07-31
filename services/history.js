const fs = require("fs");
const path = require("path");

const historyFile = path.join(__dirname, "../memory/history.json");

// Load History
function getHistory() {
    if (!fs.existsSync(historyFile)) {
        return [];
    }

    const data = fs.readFileSync(historyFile, "utf8");

    return JSON.parse(data);
}

// Save Message
function addMessage(role, text) {
    const history = getHistory();

    history.push({
        role,
        text,
    });

    // Last 20 messages hi rakho
    if (history.length > 20) {
        history.shift();
    }

    fs.writeFileSync(
        historyFile,
        JSON.stringify(history, null, 2)
    );
}

module.exports = {
    getHistory,
    addMessage,
};