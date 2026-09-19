const { spawn, execSync } = require("child_process");

console.log("\n==================================================");
console.log("  Starting AI Agent (Backend & Frontend)");
console.log("==================================================\n");

let backend = null;
let frontend = null;
let isShuttingDown = false;

function killProcess(proc) {
    if (!proc || !proc.pid) return;
    try {
        if (process.platform === "win32") {
            execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
        } else {
            proc.kill("SIGTERM");
        }
    } catch (e) {}
}

function startBackend() {
    if (isShuttingDown) return;
    backend = spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["run", "dev"], {
        cwd: "./backend",
        shell: true,
        stdio: "inherit"
    });

    backend.on("exit", (code) => {
        if (!isShuttingDown && code !== 0 && code !== null) {
            console.log(`\n[dev.js] Backend process exited (code ${code}). Restarting in 2s...`);
            setTimeout(startBackend, 2000);
        }
    });
}

function startFrontend() {
    if (isShuttingDown) return;
    frontend = spawn(/^win/.test(process.platform) ? "npm.cmd" : "npm", ["run", "dev"], {
        cwd: "./frontend",
        shell: true,
        stdio: "inherit"
    });

    frontend.on("exit", (code) => {
        if (!isShuttingDown && code !== 0 && code !== null) {
            console.log(`\n[dev.js] Frontend process exited (code ${code}). Restarting in 2s...`);
            setTimeout(startFrontend, 2000);
        }
    });
}

startBackend();
startFrontend();

function cleanup() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log("\nShutting down servers...");
    killProcess(backend);
    killProcess(frontend);
    process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

