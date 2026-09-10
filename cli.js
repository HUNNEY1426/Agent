const { Command } = require("commander");
const axios = require("axios");
const chalk = require("chalk");
const ora = require("ora");
const readline = require("readline");

const {
  aiConfig,
  supportedProviders,
  supportedThinkingLevels,
  validateProvider,
  validateThinkingLevel,
} = require("./config/aiConfig");
const { thinkingLevels } = require("./services/thinkingConfig");
const { getModels, getDefaultModel } = require("./services/modelRegistry");
const voiceService = require("./services/voiceService");

const program = new Command();

// Helper to format settings display
function formatSettings(settings) {
  return [
    chalk.bold("Current AI Settings"),
    "-------------------",
    `Provider: ${chalk.cyan(settings.provider)}`,
    `Model: ${chalk.cyan(settings.model)}`,
    `Thinking: ${chalk.cyan(settings.thinkingLevel)}`,
  ].join("\n");
}

// Helper to format providers list
function formatProviders() {
  const lines = [
    chalk.bold("Available Providers"),
    "-------------------",
  ];
  supportedProviders.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p}`);
  });
  return lines.join("\n");
}

// Helper to format models list
function formatModels(provider) {
  const modelList = getModels(provider);
  const lines = [
    chalk.bold(`Models for ${provider}`),
    "-----------------",
  ];
  modelList.forEach((m, idx) => {
    lines.push(`${idx + 1}. ${m}`);
  });
  return lines.join("\n");
}

// Helper to format thinking levels list
function formatThinkingLevels() {
  const lines = [
    chalk.bold("Thinking Levels"),
    "---------------",
  ];
  for (const [key, val] of Object.entries(thinkingLevels)) {
    lines.push(`${key.padEnd(7)} - ${val.description || val.label}`);
  }
  return lines.join("\n");
}

// ---------------- COMMANDS ---------------- //

// create command 
program
    .command("create <filename>")
    .action(async (filename) => {
        const spinner = ora("Creating File...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/file/create",
                { filename }
            );
            spinner.succeed("File Created");
        } catch (err) {
            spinner.fail("API Request Failed");
            if (err.response) {
                console.log(chalk.red("Server Error:"));
                console.log(err.response.data);
            } else {
                console.log(chalk.red("Cannot connect to server."));
                console.log("Make sure Express server is running.");
            }
        }
    });

// read command
program
    .command("read <filename>")
    .description("Read a file")
    .action(async (filename) => {
        try {
            const res = await axios.get(
                `http://localhost:3000/file/read/${filename}`
            );
            console.log(res.data.content);
        } catch (err) {
            console.log(err.message);
        }
    });

// delete command
program
    .command("delete <filename>")
    .description("Delete a file")
    .action(async (filename) => {
        try {
            const res = await axios.delete(
                `http://localhost:3000/file/delete/${filename}`
            );
            console.log(res.data.message);
        } catch (err) {
            console.log(err.message);
        }
    });

// run command
program
    .command("run <command>")
    .description("Run terminal command")
    .action(async (command) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Running Command...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/shell/run",
                { command }
            );
            spinner.succeed("Done");
            console.log(chalk.yellow(res.data.output));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data || err.message);
        }
    });

// ask command
program
    .command("ask <question>")
    .description("Ask AI")
    .action(async (question) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("AI Thinking...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/ask",
                { question }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.answer));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data || err.message);
        }
    });

// Settings command
program
    .command("settings")
    .description("View current AI settings")
    .action(async () => {
        try {
            const res = await axios.get("http://localhost:3000/ai/settings");
            console.log("\n" + formatSettings(res.data) + "\n");
        } catch (err) {
            const current = {
                provider: aiConfig.provider,
                model: aiConfig.model,
                thinkingLevel: aiConfig.thinkingLevel,
            };
            console.log("\n" + formatSettings(current) + "\n");
        }
    });

// Providers command
program
    .command("providers")
    .description("List available AI providers")
    .action(() => {
        console.log("\n" + formatProviders() + "\n");
    });

// Models command
program
    .command("models [provider]")
    .description("List models for provider")
    .action(async (provider) => {
        let p = provider;
        if (!p) {
            try {
                const res = await axios.get("http://localhost:3000/ai/settings");
                p = res.data.provider;
            } catch (e) {
                p = aiConfig.provider;
            }
        }
        if (!supportedProviders.includes(p)) {
            console.log(chalk.red(`\nUnknown provider: ${p}. Choose: ${supportedProviders.join(", ")}\n`));
            return;
        }
        console.log("\n" + formatModels(p) + "\n");
    });

// Provider get/set command
program
    .command("provider [name]")
    .description("Get or set current AI provider")
    .action(async (name) => {
        if (!name) {
            console.log("\n" + formatProviders() + "\n");
            return;
        }
        if (!supportedProviders.includes(name)) {
            console.log(chalk.red(`\nUnsupported provider: ${name}. Supported providers: ${supportedProviders.join(", ")}\n`));
            return;
        }
        try {
            await axios.post("http://localhost:3000/ai/settings", { provider: name });
            console.log(chalk.green(`\nProvider changed to ${name}\n`));
        } catch (err) {
            console.log(chalk.red(`\nError changing provider: ${err.response?.data?.error || err.message}\n`));
        }
    });

// Model get/set command
program
    .command("model [name]")
    .description("Get or set current AI model")
    .action(async (name) => {
        if (!name) {
            try {
                const res = await axios.get("http://localhost:3000/ai/settings");
                console.log("\n" + formatModels(res.data.provider) + "\n");
            } catch (e) {
                console.log("\n" + formatModels(aiConfig.provider) + "\n");
            }
            return;
        }
        try {
            await axios.post("http://localhost:3000/ai/settings", { model: name });
            console.log(chalk.green(`\nModel changed to ${name}\n`));
        } catch (err) {
            console.log(chalk.red(`\nError changing model: ${err.response?.data?.error || err.message}\n`));
        }
    });

// Thinking get/set command
program
    .command("thinking [level]")
    .description("Get or set current thinking level")
    .action(async (level) => {
        if (!level) {
            console.log("\n" + formatThinkingLevels() + "\n");
            return;
        }
        if (!supportedThinkingLevels.includes(level)) {
            console.log(chalk.red("\nInvalid thinking level. Choose: low, medium, high, ultra\n"));
            return;
        }
        try {
            await axios.post("http://localhost:3000/ai/settings", { thinkingLevel: level });
            console.log(chalk.green(`\nThinking level changed to ${level}\n`));
        } catch (err) {
            console.log(chalk.red(`\nError changing thinking level: ${err.response?.data?.error || err.message}\n`));
        }
    });

// Create Chat Session
program
    .command("chat:new <name>")
    .description("Create new chat session")
    .action(async (name) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Creating Chat Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/new",
                { name }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data || err.message);
        }
    });

// List Chat Sessions
program
    .command("chat:list")
    .description("List all chat sessions")
    .action(async () => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Loading Sessions...").start();
        try {
            const res = await axios.get("http://localhost:3000/ai/chat/list");
            spinner.succeed("Done");
            console.log(res.data);
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data || err.message);
        }
    });

// Switch Chat Session
program
    .command("chat:switch <name>")
    .description("Switch active chat session")
    .action(async (name) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Switching Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/switch",
                { name }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
            if (res.data.history) {
                console.log("\nChat History:\n");
                res.data.history.forEach(chat => {
                    console.log(`${chat.role} : ${chat.text}`);
                });
            }
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data || err.message);
        }
    });

// Delete Chat Session
program
    .command("chat:delete <name>")
    .description("Delete a chat session")
    .action(async (name) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Deleting Chat Session...").start();
        try {
            const res = await axios.delete(
                `http://localhost:3000/ai/chat/delete/${name}`
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Rename Chat Session
program
    .command("chat:rename <oldName> <newName>")
    .description("Rename active or other chat session")
    .action(async (oldName, newName) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Renaming Chat Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/rename",
                { oldName, newName }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Clear Chat Session
program
    .command("chat:clear <name>")
    .description("Clear messages in a chat session")
    .action(async (name) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Clearing Chat Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/clear",
                { name }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Duplicate Chat Session
program
    .command("chat:duplicate <source> <target>")
    .description("Duplicate a chat session")
    .action(async (source, target) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Duplicating Chat Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/duplicate",
                { source, target }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Get Chat Session Info
program
    .command("chat:info <session>")
    .description("Get details of a chat session")
    .action(async (session) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Loading Session Info...").start();
        try {
            const res = await axios.get(
                `http://localhost:3000/ai/chat/info/${session}`
            );
            spinner.succeed("Done");
            console.log(`\n${chalk.bold("Session ID:")} ${res.data.id}`);
            console.log(`${chalk.bold("Title:")} ${res.data.title}`);
            console.log(`${chalk.bold("Provider:")} ${res.data.provider}`);
            console.log(`${chalk.bold("Model:")} ${res.data.model}`);
            console.log(`${chalk.bold("Thinking Level:")} ${res.data.thinkingLevel}`);
            console.log(`${chalk.bold("Created At:")} ${res.data.createdAt}`);
            console.log(`${chalk.bold("Updated At:")} ${res.data.updatedAt}`);
            console.log(`${chalk.bold("Message Count:")} ${res.data.messageCount}`);
            console.log(`${chalk.bold("Is Active Session:")} ${res.data.isActive}\n`);
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Search Chat Messages
program
    .command("chat:search <query>")
    .description("Search messages in all chat sessions")
    .action(async (query) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Searching Messages...").start();
        try {
            const res = await axios.get(
                `http://localhost:3000/ai/chat/search/${encodeURIComponent(query)}`
            );
            spinner.succeed("Done");
            if (res.data && res.data.length > 0) {
                console.log(`\nFound ${res.data.length} matches:\n`);
                res.data.forEach(match => {
                    console.log(`${chalk.bold("Session:")} ${chalk.yellow(match.session)}`);
                    console.log(`${chalk.bold("Role:")} ${chalk.cyan(match.role)}`);
                    console.log(`${chalk.bold("Content:")} ${match.content}`);
                    console.log("-".repeat(40));
                });
            } else {
                console.log(chalk.yellow("\nNo matching messages found.\n"));
            }
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Export Chat Session
program
    .command("chat:export <id> <format>")
    .description("Export a chat session (json or markdown)")
    .action(async (id, format) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Exporting Chat Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/export",
                { id, format }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(`Session exported successfully to: ${res.data.filePath}`));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Import Chat Session
program
    .command("chat:import <filePath>")
    .description("Import a chat session from a JSON file")
    .action(async (filePath) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Importing Chat Session...").start();
        const fs = require("fs");
        const path = require("path");
        try {
            const absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                spinner.fail("Error");
                console.log(chalk.red(`File not found: ${filePath}`));
                return;
            }
            const fileContent = fs.readFileSync(absolutePath, "utf8");
            let session;
            try {
                session = JSON.parse(fileContent);
            } catch (e) {
                spinner.fail("Error");
                console.log(chalk.red("Invalid JSON format in import file."));
                return;
            }
            const res = await axios.post(
                "http://localhost:3000/ai/chat/import",
                { session }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(`Session '${res.data.session.id}' imported successfully`));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Archive Chat Session
program
    .command("chat:archive <id>")
    .description("Archive a chat session")
    .action(async (id) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Archiving Chat Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/archive",
                { id }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Restore Chat Session
program
    .command("chat:restore <id>")
    .description("Restore an archived chat session")
    .action(async (id) => {
        console.log(chalk.green("✔ Connected"));
        const spinner = ora("Restoring Chat Session...").start();
        try {
            const res = await axios.post(
                "http://localhost:3000/ai/chat/restore",
                { id }
            );
            spinner.succeed("Done");
            console.log(chalk.cyan(res.data.message));
        } catch (err) {
            spinner.fail("Error");
            console.log(err.response?.data?.error || err.response?.data || err.message);
        }
    });

// Interactive Continuous Chat Loop
async function startInteractiveChat() {
    console.log(chalk.bold.cyan("\n==========================================="));
    console.log(chalk.bold.cyan("🤖 Welcome to AI Interactive Chat"));
    console.log(chalk.gray("Type your question and press Enter."));
    console.log(chalk.gray("Commands: /provider, /model, /thinking, /settings, /providers, /models, /switch, /new"));
    console.log(chalk.gray("Voice:    /voice on|off|status, /voice language <code>, /mic, /tts on|off|status"));
    console.log(chalk.magenta("          (Press Ctrl+V to toggle Voice from text mode)"));
    console.log(chalk.gray("Type 'exit' or 'quit' to end the session."));
    console.log(chalk.bold.cyan("===========================================\n"));

    // ── Voice loop helper ──────────────────────────────────────────────────
    async function runVoiceLoop(rl) {
        const status = voiceService.getStatus();
        if (!status.voiceEnabled) return;

        process.stdout.write(chalk.magenta("\n🎤 Listening... (Press SPACE to send, ESC to mute/exit)\n"));

        while (voiceService.getStatus().voiceEnabled) {
            let transcript = "";
            try {
                transcript = await voiceService.listenOnce();
            } catch (err) {
                if (err.message.includes("Recorded file is empty")) {
                    // Ignore empty file error if voice was disabled
                    if (!voiceService.getStatus().voiceEnabled) break;
                    console.log(chalk.yellow("\n⚠️ No audio detected. Try speaking louder.\n"));
                } else {
                    console.log(chalk.red(`\n❌ Voice error: ${err.message}\n`));
                    voiceService.disableVoice();
                    break;
                }
            }

            if (!transcript || !transcript.trim()) {
                if (voiceService.getStatus().voiceEnabled) {
                    process.stdout.write(chalk.magenta("\n🎤 Listening... (Press SPACE to send, ESC to mute/exit)\n"));
                }
                continue;
            }

            console.log(chalk.bold.yellow(`\n📝 You said: "${transcript}"\n`));

            // Send transcript to AI exactly like normal text input
            const spinner = ora("AI Thinking...").start();
            try {
                const res = await axios.post("http://localhost:3000/ai/ask", {
                    question: transcript,
                    provider: currentSettings.provider,
                    model: currentSettings.model,
                    thinkingLevel: currentSettings.thinkingLevel,
                });
                spinner.stop();
                const respModel = res.data.model || currentSettings.model;
                const respThinking = res.data.thinkingLevel || currentSettings.thinkingLevel;
                console.log(chalk.bold.green(`AI [${respModel} | ${respThinking}] >`));
                console.log(chalk.cyan(res.data.answer) + "\n");
                // TTS — read AI response aloud if enabled
                voiceService.speak(res.data.answer);
            } catch (err) {
                spinner.fail("Error");
                if (err.response) {
                    console.log(chalk.red("Server Error:"), err.response.data);
                } else {
                    console.log(chalk.red("Cannot connect to server. Make sure Express server is running.\n"));
                }
            }

            // Check again before next iteration
            if (!voiceService.getStatus().voiceEnabled) break;
            process.stdout.write(chalk.magenta("\n🎤 Listening... (Press SPACE to send, ESC to mute/exit)\n"));
        }

        console.log(chalk.yellow("🔇 Voice mode stopped.\n"));
        // Re-prompt so user can keep typing
        rl.prompt(true);
    }

    let currentSettings = {
        provider: aiConfig.provider || "gemini",
        model: aiConfig.model || "gemini-2.0-flash",
        thinkingLevel: aiConfig.thinkingLevel || "medium",
    };

    // Attempt to load settings from server
    try {
        const res = await axios.get("http://localhost:3000/ai/settings");
        currentSettings = res.data;
    } catch (e) {
        // Fallback to local default
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Handle global keypress for Voice toggle
    process.stdin.on('keypress', (str, key) => {
        if (!key) return;
        const status = voiceService.getStatus();

        if (status.voiceEnabled) {
            // ESC: Mute and Exit Voice Mode
            if (key.name === 'escape') {
                voiceService.disableVoice();
                process.stdout.write(chalk.yellow("\n🔇 Muting..."));
            }
            // SPACE: Finish recording early and send
            else if (key.name === 'space') {
                process.stdout.write(chalk.cyan("\n📤 Sending audio..."));
                voiceService.finishRecording();
            }
        } else {
            // Unmute / Enable if Ctrl+V is pressed
            if (key.ctrl && key.name === 'v') {
                const depCheck = voiceService.checkDependencies();
                if (depCheck.ok) {
                    voiceService.enableVoice();
                    setImmediate(() => runVoiceLoop(rl));
                } else {
                    console.log(chalk.red("\n" + depCheck.message + "\n"));
                    rl.prompt(true);
                }
            }
        }
    });

    const askQuestion = () => {
        rl.question(chalk.bold.green("You > "), async (input) => {
            const trimmed = input.trim();

            if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
                console.log(chalk.yellow("\nExiting chat. Goodbye! 👋\n"));
                rl.close();
                process.exit(0);
            }

            if (!trimmed) {
                askQuestion();
                return;
            }

            // Handle Slash Commands
            if (trimmed.startsWith("/")) {
                const parts = trimmed.slice(1).split(" ").filter(Boolean);
                const cmd = (parts[0] || "").toLowerCase();
                const arg = parts.slice(1).join(" ").trim();

                switch (cmd) {
                    case "settings": {
                        try {
                            const res = await axios.get("http://localhost:3000/ai/settings");
                            currentSettings = res.data;
                        } catch (e) {}
                        console.log("\n" + formatSettings(currentSettings) + "\n");
                        break;
                    }

                    case "providers": {
                        console.log("\n" + formatProviders() + "\n");
                        break;
                    }

                    case "models": {
                        const targetProvider = arg || currentSettings.provider;
                        if (!supportedProviders.includes(targetProvider)) {
                            console.log(chalk.red(`\nUnknown provider: ${targetProvider}. Choose: ${supportedProviders.join(", ")}\n`));
                        } else {
                            console.log("\n" + formatModels(targetProvider) + "\n");
                        }
                        break;
                    }

                    case "provider": {
                        if (!arg) {
                            console.log("\n" + formatProviders() + "\n");
                        } else if (!supportedProviders.includes(arg)) {
                            console.log(chalk.red(`\nUnsupported provider: ${arg}. Supported providers: ${supportedProviders.join(", ")}\n`));
                        } else {
                            try {
                                const res = await axios.post("http://localhost:3000/ai/settings", { provider: arg });
                                currentSettings = res.data.settings;
                            } catch (e) {
                                currentSettings.provider = arg;
                                currentSettings.model = aiConfig.providers?.[arg]?.model || getDefaultModel(arg);
                            }
                            console.log(`Provider changed to ${arg}\n`);
                        }
                        break;
                    }

                    case "model": {
                        if (!arg) {
                            console.log("\n" + formatModels(currentSettings.provider) + "\n");
                        } else {
                            try {
                                const res = await axios.post("http://localhost:3000/ai/settings", { model: arg });
                                currentSettings = res.data.settings;
                            } catch (e) {
                                currentSettings.model = arg;
                            }
                            console.log(`Model changed to ${arg}\n`);
                        }
                        break;
                    }

                    case "thinking": {
                        if (!arg) {
                            console.log("\n" + formatThinkingLevels() + "\n");
                        } else if (!supportedThinkingLevels.includes(arg.toLowerCase())) {
                            console.log(chalk.red("Invalid thinking level. Choose: low, medium, high, ultra\n"));
                        } else {
                            const safeLevel = arg.toLowerCase();

                            // Capability checks & notices
                            if (currentSettings.provider === "openai" && safeLevel === "ultra") {
                                console.log(chalk.yellow("Ultra thinking is not supported by this model."));
                                console.log(chalk.yellow("Using the highest supported level: high."));
                            } else if (
                                currentSettings.provider === "openai" &&
                                !currentSettings.model.startsWith("o1") &&
                                !currentSettings.model.startsWith("o3")
                            ) {
                                console.log(chalk.gray("This provider does not expose adjustable thinking for the selected model."));
                            }

                            try {
                                const res = await axios.post("http://localhost:3000/ai/settings", { thinkingLevel: safeLevel });
                                currentSettings = res.data.settings;
                            } catch (e) {
                                currentSettings.thinkingLevel = safeLevel;
                            }
                            console.log(`Thinking level changed to ${safeLevel}\n`);
                        }
                        break;
                    }

                    case "switch": {
                        if (!arg) {
                            console.log(chalk.red("Usage: /switch <session_name>\n"));
                        } else {
                            try {
                                const res = await axios.post("http://localhost:3000/ai/chat/switch", { name: arg });
                                console.log(chalk.green(`Switched to session '${arg}'\n`));
                                if (res.data.settings) {
                                    currentSettings = res.data.settings;
                                }
                            } catch (err) {
                                console.log(chalk.red(err.response?.data?.message || err.message + "\n"));
                            }
                        }
                        break;
                    }

                    case "new": {
                        if (!arg) {
                            console.log(chalk.red("Usage: /new <session_name>\n"));
                        } else {
                            try {
                                const res = await axios.post("http://localhost:3000/ai/chat/new", { name: arg });
                                console.log(chalk.green(`Session '${arg}' created\n`));
                                if (res.data.settings) {
                                    currentSettings = res.data.settings;
                                }
                            } catch (err) {
                                console.log(chalk.red(err.response?.data?.message || err.message + "\n"));
                            }
                        }
                        break;
                    }

                    case "voice":
                    case "mic": {
                        // Sub-commands: on | off | status | devices | device <name> | language <code>
                        const subCmd = (parts[1] || "").toLowerCase();
                        const subArg = parts.slice(2).join(" ").trim();

                        if (subCmd === "off") {
                            voiceService.disableVoice();
                            console.log(chalk.yellow("\n🔇 Voice mode disabled.\n"));

                        } else if (subCmd === "status") {
                            const s = voiceService.getStatus();
                            console.log(
                                "\n" +
                                chalk.bold("Voice Status") + "\n" +
                                `  Voice enabled   : ${s.voiceEnabled ? chalk.green("yes") : chalk.red("no")}\n` +
                                `  TTS enabled     : ${s.ttsEnabled ? chalk.green("yes") : chalk.red("no")}\n` +
                                `  Language        : ${chalk.cyan(s.language)}\n` +
                                `  Active device   : ${chalk.cyan(s.selectedDevice)}\n` +
                                `  Loop active     : ${s.loopActive ? chalk.green("yes") : chalk.gray("no")}\n`
                            );

                        } else if (subCmd === "devices") {
                            // List all detected audio input devices
                            try {
                                const devs = voiceService.listAudioDevices();
                                const status = voiceService.getStatus();
                                console.log("\n" + chalk.bold(`🎤 Audio input devices (${devs.length} found)`) + "\n");
                                devs.forEach((d, i) => {
                                    const active = (status.selectedDevice !== "(auto)" && status.selectedDevice === d.name)
                                        || (status.selectedDevice === "(auto)" && i === 0);
                                    const marker = active ? chalk.green(" ◀ active") : "";
                                    console.log(`  ${i + 1}. ${chalk.cyan(d.name)}${marker}`);
                                });
                                console.log(
                                    "\n" +
                                    chalk.gray("  Use: /voice device <name>  to select a specific microphone") +
                                    "\n" +
                                    chalk.gray("  Use: /voice device reset   to revert to auto-select") +
                                    "\n"
                                );
                            } catch (err) {
                                console.log(chalk.red("\n" + err.message + "\n"));
                            }

                        } else if (subCmd === "device") {
                            // Select or reset a specific microphone
                            if (!subArg) {
                                console.log(chalk.red("\nUsage: /voice device <name>  or  /voice device reset\n"));
                            } else if (subArg.toLowerCase() === "reset") {
                                voiceService.clearDeviceSelection();
                                console.log(chalk.green("\n✔ Device selection reset — will auto-pick the first available microphone.\n"));
                            } else {
                                // Verify the device exists before accepting
                                try {
                                    const devs = voiceService.listAudioDevices();
                                    const match = devs.find(
                                        (d) => d.name.toLowerCase() === subArg.toLowerCase()
                                    );
                                    if (!match) {
                                        console.log(chalk.red(`\n❌ Device not found: "${subArg}"\n`));
                                        console.log(chalk.gray("Available devices:"));
                                        devs.forEach((d, i) => console.log(chalk.gray(`  ${i + 1}. ${d.name}`)));
                                        console.log("");
                                    } else {
                                        voiceService.selectDevice(match.name);
                                        console.log(chalk.green(`\n✔ Microphone set to: "${match.name}"\n`));
                                    }
                                } catch (err) {
                                    console.log(chalk.red("\n" + err.message + "\n"));
                                }
                            }

                        } else if (subCmd === "language" || subCmd === "lang") {
                            if (!subArg) {
                                console.log(chalk.red("Usage: /voice language <code>  e.g. en-IN, hi-IN, auto\n"));
                            } else {
                                try {
                                    voiceService.setLanguage(subArg);
                                    console.log(chalk.green(`\n✔ Voice language set to: ${subArg}\n`));
                                } catch (err) {
                                    console.log(chalk.red(`\n${err.message}\n`));
                                }
                            }

                        } else {
                            // /voice  or  /voice on  — run dependency preflight first
                            const depCheck = voiceService.checkDependencies();
                            if (!depCheck.ok) {
                                console.log(chalk.red("\n" + depCheck.message + "\n"));
                            } else {
                                // Show detected device so user knows which mic will be used
                                try {
                                    const devs = voiceService.listAudioDevices();
                                    const status = voiceService.getStatus();
                                    const activeDev = status.selectedDevice !== "(auto)"
                                        ? status.selectedDevice
                                        : devs[0].name;
                                    console.log(chalk.gray(`\n  Microphone: ${activeDev}`));
                                    if (devs.length > 1) {
                                        console.log(chalk.gray(`  (${devs.length} devices found — use /voice devices to list, /voice device <name> to switch)\n`));
                                    } else {
                                        console.log("");
                                    }
                                } catch {}

                                voiceService.enableVoice();
                                console.log(chalk.green(`🎤 Voice mode enabled (language: ${voiceService.getStatus().language})\n`));
                                console.log(chalk.gray("  Max 1 minute per utterance — auto-stops after 1 second of silence.\n"));
                                setImmediate(() => runVoiceLoop(rl));
                            }
                        }
                        break;
                    }

                    case "tts": {
                        const subCmd = (parts[1] || "").toLowerCase();
                        if (subCmd === "on") {
                            voiceService.enableTTS();
                            console.log(chalk.green("\n🔊 TTS enabled. AI responses will be spoken aloud.\n"));
                        } else if (subCmd === "off") {
                            voiceService.disableTTS();
                            console.log(chalk.yellow("\n🔇 TTS disabled.\n"));
                        } else if (subCmd === "status") {
                            const s = voiceService.getStatus();
                            console.log(`\nTTS is currently: ${s.ttsEnabled ? chalk.green("enabled") : chalk.red("disabled")}\n`);
                        } else {
                            console.log(chalk.gray("\nUsage: /tts on | /tts off | /tts status\n"));
                        }
                        break;
                    }

                    case "help": {
                        console.log("\n" + chalk.bold("Available Interactive Commands:") + "\n" +
                            "  /provider [name]              - View or change AI provider\n" +
                            "  /model [name]                 - View or change AI model\n" +
                            "  /thinking [level]             - View or set thinking level (low, medium, high, ultra)\n" +
                            "  /settings                     - View current AI settings\n" +
                            "  /providers                    - List all available providers\n" +
                            "  /models [provider]            - List models for a provider\n" +
                            "  /switch <name>                - Switch active chat session\n" +
                            "  /new <name>                   - Create new chat session\n" +
                            "\n" + chalk.bold("Voice Commands:") + "\n" +
                            "  /voice on                     - Enable microphone voice mode\n" +
                            "  /voice off                    - Disable voice mode\n" +
                            "  /voice status                 - Show voice, TTS, device status\n" +
                            "  /voice devices                - List all detected microphones\n" +
                            "  /voice device <name>          - Select a specific microphone\n" +
                            "  /voice device reset           - Revert to auto-select\n" +
                            "  /voice language <code>        - Set language (e.g. en-IN, hi-IN, auto)\n" +
                            "  /mic                          - Alias for /voice on\n" +
                            "  /tts on                       - Enable text-to-speech (AI reads aloud)\n" +
                            "  /tts off                      - Disable text-to-speech\n" +
                            "  /tts status                   - Show TTS state\n" +
                            "\n" +
                            "  exit, quit                    - Exit chat\n"
                        );
                        break;
                    }

                    default:
                        console.log(chalk.red(`Unknown command: /${cmd}. Type /help for available commands.\n`));
                        // Hint at voice commands if user typed something mic-related
                        if (["mic", "voice", "listen", "speak", "tts", "speech"].some(k => cmd.includes(k))) {
                            console.log(chalk.gray("Tip: use /voice on to start voice mode, /help for all commands.\n"));
                        }
                }

                askQuestion();
                return;
            }

            // Normal AI Question
            const spinner = ora("AI Thinking...").start();

            try {
                const res = await axios.post("http://localhost:3000/ai/ask", {
                    question: trimmed,
                    provider: currentSettings.provider,
                    model: currentSettings.model,
                    thinkingLevel: currentSettings.thinkingLevel,
                });

                spinner.stop();

                const respModel = res.data.model || currentSettings.model;
                const respThinking = res.data.thinkingLevel || currentSettings.thinkingLevel;

                console.log(chalk.bold.green(`AI [${respModel} | ${respThinking}] >`));
                console.log(chalk.cyan(res.data.answer) + "\n");
            } catch (err) {
                spinner.fail("Error");

                if (err.response) {
                    console.log(chalk.red("Server Error:"));
                    console.log(err.response.data);
                } else {
                    console.log(chalk.red("Cannot connect to server."));
                    console.log("Make sure Express server is running.\n");
                }
            }

            askQuestion();
        });
    };

    rl.on("SIGINT", () => {
        console.log(chalk.yellow("\nExiting chat. Goodbye! 👋\n"));
        rl.close();
        process.exit(0);
    });

    askQuestion();
}

// Interactive chat command
program
    .command("chat")
    .description("Start continuous interactive AI chat loop")
    .action(async () => {
        await startInteractiveChat();
    });

// If no command entered (e.g. `npm run client` or `node cli.js`), start interactive chat loop
if (process.argv.length <= 2) {
    startInteractiveChat();
} else {
    // Invalid command ke liye suggestions
    program.showSuggestionAfterError(true);
    program.showHelpAfterError();

    // CLI start
    program.parse(process.argv);
}
