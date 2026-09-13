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
            console.log(err.message === "Session not found in archives" ? 404 : err.message === "Session already exists in active sessions" ? 409 : 400).json({
                error: err.message
            });
        }
    });

// PDF Knowledge Base Commands
program
    .command("pdf <action> [args...]")
    .description("PDF Knowledge Base operations (add, list, info, use, search, remove, clear, off, status)")
    .action(async (action, args) => {
        const subCmd = (action || "").toLowerCase();
        const argStr = (args || []).join(" ").trim();
        const path = require("path");

        if (subCmd === "add") {
            if (!argStr) {
                console.log(chalk.red("Usage: node cli.js pdf add <path>"));
                return;
            }
            const targetPath = argStr.replace(/^['"]|['"]$/g, "");
            console.log(`\n📄 PDF: ${path.basename(targetPath)}`);
            console.log("📖 Extracting text...");
            console.log("🧠 Creating knowledge index...");
            try {
                const res = await axios.post("http://localhost:3000/pdf/add", { path: targetPath });
                if (res.data.duplicate) {
                    console.log(chalk.yellow(`📄 PDF already indexed.\n`));
                } else {
                    console.log(chalk.green("✅ PDF added successfully\n"));
                }
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else if (subCmd === "list") {
            try {
                const res = await axios.get("http://localhost:3000/pdf/list");
                const docs = res.data.documents || [];
                console.log("\n" + chalk.bold("📚 PDF Knowledge Base") + "\n");
                if (docs.length === 0) {
                    console.log(chalk.yellow("No PDFs indexed yet. Use node cli.js pdf add <path> to add a PDF.\n"));
                } else {
                    docs.forEach((d, idx) => {
                        const activeTag = d.isActive ? chalk.green(" (active)") : "";
                        console.log(`${idx + 1}. ${d.originalFilename}${activeTag}`);
                    });
                    console.log("");
                }
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else if (subCmd === "info") {
            if (!argStr) {
                console.log(chalk.red("Usage: node cli.js pdf info <name>"));
            } else {
                try {
                    const res = await axios.get(`http://localhost:3000/pdf/info/${encodeURIComponent(argStr)}`);
                    const info = res.data;
                    console.log("\n" + chalk.bold("📄 PDF Information") + "\n");
                    console.log(`📄 Name:            ${chalk.cyan(info.originalFilename)}`);
                    console.log(`📁 Original path:   ${chalk.gray(info.filePath)}`);
                    console.log(`📑 Pages:           ${info.pageCount}`);
                    console.log(`🧩 Chunks:          ${info.chunkCount}`);
                    console.log(`📅 Added:           ${info.addedAt}`);
                    console.log(`📅 Updated:         ${info.updatedAt}`);
                    console.log(`📊 Indexed status:  ${chalk.green("Ready")}\n`);
                } catch (err) {
                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                }
            }

        } else if (subCmd === "use") {
            if (!argStr) {
                console.log(chalk.red("Usage: node cli.js pdf use <name|all>"));
            } else {
                try {
                    const res = await axios.post("http://localhost:3000/pdf/use", { name: argStr });
                    console.log(chalk.green(`\n✅ Active PDF: ${res.data.activeDocumentName}\n`));
                } catch (err) {
                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                }
            }

        } else if (subCmd === "search") {
            if (!argStr) {
                console.log(chalk.red("Usage: node cli.js pdf search <query>"));
            } else {
                try {
                    console.log(chalk.cyan("\n🔎 Searching PDF..."));
                    const res = await axios.get(`http://localhost:3000/pdf/search/${encodeURIComponent(argStr)}`);
                    const results = res.data || [];
                    console.log("\n" + chalk.bold("🔎 PDF Search Results") + "\n");
                    if (results.length === 0) {
                        console.log(chalk.yellow("No relevant PDF content found.\n"));
                    } else {
                        results.forEach((r, idx) => {
                            console.log(`${idx + 1}. ${chalk.cyan(r.documentName)} — Page ${r.pageNumber}`);
                            console.log(chalk.gray(`   ${r.text.replace(/\n/g, " ").slice(0, 200)}...`));
                            console.log("");
                        });
                    }
                } catch (err) {
                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                }
            }

        } else if (subCmd === "remove") {
            if (!argStr) {
                console.log(chalk.red("Usage: node cli.js pdf remove <name>"));
            } else {
                try {
                    const res = await axios.delete(`http://localhost:3000/pdf/remove/${encodeURIComponent(argStr)}`);
                    console.log(chalk.green(`\n✅ Removed ${res.data.removedName} successfully\n`));
                } catch (err) {
                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                }
            }

        } else if (subCmd === "clear") {
            try {
                await axios.post("http://localhost:3000/pdf/clear");
                console.log(chalk.green("\n✅ PDF Knowledge Base cleared successfully\n"));
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else if (subCmd === "off") {
            try {
                await axios.post("http://localhost:3000/pdf/off");
                console.log(chalk.yellow("\n📚 PDF knowledge: disabled\n"));
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else if (subCmd === "status") {
            try {
                const res = await axios.get("http://localhost:3000/pdf/status");
                const s = res.data;
                console.log("\n" + chalk.bold("📚 PDF Knowledge Base") + "\n");
                console.log(`PDF Knowledge: ${s.enabled ? chalk.green("enabled") : chalk.red("disabled")}`);
                console.log(`Documents:     ${s.totalDocuments}`);
                console.log(`Active:        ${chalk.cyan(s.activeDocumentName)}\n`);
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else {
            console.log(chalk.red(`Unknown action: ${subCmd}. Available: add, list, info, use, search, remove, clear, off, status`));
        }
    });

// Chat History Knowledge Base Commands
program
    .command("history [action] [args...]")
    .description("Chat History Knowledge Base operations (search, status, use, clear)")
    .action(async (action, args) => {
        const subCmd = (action || "").toLowerCase();
        const argStr = (args || []).join(" ").trim();

        if (subCmd === "status") {
            try {
                const res = await axios.get("http://localhost:3000/history/status");
                const s = res.data;
                console.log("\n" + chalk.bold("📚 Chat History Knowledge Base") + "\n");
                console.log(`History RAG:      ${s.enabled ? chalk.green("enabled") : chalk.red("disabled")}`);
                console.log(`Indexed Sessions: ${s.totalSessions} (${(s.sessions || []).join(", ")})`);
                console.log(`Total Messages:   ${s.totalMessages}`);
                console.log(`Total Terms:      ${s.totalTerms}\n`);
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else if (subCmd === "search") {
            if (!argStr) {
                console.log(chalk.red("Usage: node cli.js history search <query>"));
                return;
            }
            try {
                console.log(chalk.cyan("\n🔎 Searching Chat History..."));
                const res = await axios.get(`http://localhost:3000/history/search?q=${encodeURIComponent(argStr)}`);
                const results = res.data?.results || [];
                console.log("\n" + chalk.bold(`🔎 Chat History Search Results for "${argStr}"`) + "\n");
                if (results.length === 0) {
                    console.log(chalk.yellow("No relevant past conversation found.\n"));
                } else {
                    results.forEach((r, idx) => {
                        console.log(`${idx + 1}. [${chalk.cyan(r.sessionTitle)} | ${chalk.yellow(r.role)}] (Score: ${r.score.toFixed(2)})`);
                        console.log(chalk.gray(`   ${r.content.replace(/\n/g, " ").slice(0, 250)}${r.content.length > 250 ? "..." : ""}`));
                        console.log("");
                    });
                }
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else if (subCmd === "use") {
            const mode = (argStr || "").toLowerCase();
            if (mode === "on" || mode === "true" || mode === "enable") {
                try {
                    await axios.post("http://localhost:3000/history/use", { mode: "on" });
                    console.log(chalk.green(`\n✅ History RAG: enabled\n`));
                } catch (err) {
                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                }
            } else if (mode === "off" || mode === "false" || mode === "disable") {
                try {
                    await axios.post("http://localhost:3000/history/use", { mode: "off" });
                    console.log(chalk.yellow(`\n🔇 History RAG: disabled\n`));
                } catch (err) {
                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                }
            } else {
                console.log(chalk.red("Usage: node cli.js history use <on|off>"));
            }

        } else if (subCmd === "clear") {
            try {
                const res = await axios.post("http://localhost:3000/history/clear");
                console.log(chalk.green("\n✅ History Knowledge Index cleared and refreshed successfully\n"));
                if (res.data.stats) {
                    console.log(chalk.gray(`   Sessions: ${res.data.stats.totalSessions} | Messages: ${res.data.stats.totalMessages}\n`));
                }
            } catch (err) {
                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
            }

        } else if (!subCmd || subCmd === "help") {
            try {
                const res = await axios.get("http://localhost:3000/history/status");
                const s = res.data;
                console.log("\n" + chalk.bold("📚 Chat History Knowledge Base") + "\n");
                console.log(`History RAG:      ${s.enabled ? chalk.green("enabled") : chalk.red("disabled")}`);
                console.log(`Indexed Sessions: ${s.totalSessions} (${(s.sessions || []).join(", ")})`);
                console.log(`Total Messages:   ${s.totalMessages}`);
                console.log(`Total Terms:      ${s.totalTerms}\n`);
            } catch (err) {
                // Server might be starting up
            }
            console.log(
                chalk.bold("Usage:") + "\n" +
                "  node cli.js history                   - Show history knowledge status & summary\n" +
                "  node cli.js history status            - View detailed history RAG status\n" +
                "  node cli.js history search <query>    - Search past chat conversations\n" +
                "  node cli.js history use <on|off>      - Enable or disable history RAG\n" +
                "  node cli.js history clear             - Clear and refresh history knowledge index\n"
            );
        } else {
            console.log(chalk.red(`Unknown action: ${subCmd}. Available: status, search, use, clear`));
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
    let _voiceLoopRunning = false;

    async function runVoiceLoop(rl) {
        if (_voiceLoopRunning) return;
        const status = voiceService.getStatus();
        if (!status.voiceEnabled) return;

        _voiceLoopRunning = true;

        try {
            console.log(chalk.magenta("\n🎤 Listening..."));

            while (voiceService.getStatus().voiceEnabled) {
                let transcript = "";
                try {
                    transcript = await voiceService.listenOnce({
                        onRecordingStop: () => {
                            console.log(chalk.gray("\n⏹ Recording stopped"));
                            console.log(chalk.cyan("🎧 Transcribing..."));
                        }
                    });
                } catch (err) {
                    if (err.message.includes("Recorded file is empty")) {
                        if (!voiceService.getStatus().voiceEnabled) break;
                        console.log(chalk.yellow("\n⚠️ No audio detected. Try speaking louder.\n"));
                    } else if (
                        err.message.includes("Transcription already in progress") ||
                        err.message.includes("Recording is already in progress")
                    ) {
                        // Ignore transient concurrency locks
                    } else {
                        console.log(chalk.red(`\n${err.message}\n`));
                        voiceService.disableVoice();
                        break;
                    }
                }

                if (!transcript || !transcript.trim()) {
                    if (voiceService.getStatus().voiceEnabled) {
                        console.log(chalk.magenta("\n🎤 Listening..."));
                    }
                    continue;
                }

                console.log(chalk.bold.yellow(`\n📝 You said: ${transcript}\n`));

                const spinner = ora("AI Thinking...").start();
                try {
                    const res = await axios.post("http://localhost:3000/ai/ask", {
                        question: transcript,
                        provider: currentSettings.provider,
                        model: currentSettings.model,
                        thinkingLevel: currentSettings.thinkingLevel,
                    });
                    spinner.stop();
                    console.log(chalk.bold.green("🤖 AI:"));
                    console.log(chalk.cyan(res.data.answer) + "\n");

                    voiceService.speak(res.data.answer);
                } catch (err) {
                    spinner.fail("Error");
                    if (err.response) {
                        console.log(chalk.red("Server Error:"), err.response.data);
                    } else {
                        console.log(chalk.red("Cannot connect to server. Make sure Express server is running.\n"));
                    }
                }

                if (!voiceService.getStatus().voiceEnabled) break;
                console.log(chalk.magenta("\n🎤 Listening..."));
            }
        } finally {
            _voiceLoopRunning = false;
        }

        console.log(chalk.yellow("🔇 Voice mode stopped.\n"));
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
            // SPACE: Stop recording if currently recording
            else if (key.name === 'space') {
                if (voiceService.isRecording()) {
                    voiceService.finishRecording();
                }
            }
        } else {
            // Ctrl+V: Enable Voice Mode
            if (key.ctrl && key.name === 'v') {
                const depCheck = voiceService.checkDependencies();
                if (depCheck.ok) {
                    voiceService.enableVoice();
                    console.log(chalk.magenta("\n🎤 Using Windows default microphone"));
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
                                `🎤 Voice enabled : ${s.voiceEnabled ? chalk.green("yes") : chalk.red("no")}\n` +
                                `🎤 Microphone    : ${chalk.cyan(s.selectedDevice)}\n` +
                                `🔊 TTS enabled   : ${s.ttsEnabled ? chalk.green("yes") : chalk.red("no")}\n` +
                                `🌐 Language      : ${chalk.cyan(s.language)}\n`
                            );

                        } else if (subCmd === "devices") {
                            // List all detected audio input devices
                            try {
                                const devs = voiceService.listAudioDevices();
                                const status = voiceService.getStatus();
                                console.log("\n" + chalk.bold(`🎤 Audio input devices (${devs.length} found)`) + "\n");
                                devs.forEach((d, i) => {
                                    const active = (status.selectedDevice !== "Windows Default" && status.selectedDevice === d.name)
                                        || (status.selectedDevice === "Windows Default" && i === 0);
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
                                voiceService.enableVoice();
                                console.log(chalk.magenta("\n🎤 Using Windows default microphone"));
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

                    case "pdf": {
                        const subCmd = (parts[1] || "").toLowerCase();
                        const subArg = parts.slice(2).join(" ").trim();
                        const path = require("path");

                        if (subCmd === "add") {
                            if (!subArg) {
                                console.log(chalk.red("Usage: /pdf add <path>\n"));
                            } else {
                                const targetPath = subArg.replace(/^['"]|['"]$/g, "");
                                console.log(`\n📄 PDF: ${path.basename(targetPath)}`);
                                console.log("📖 Extracting text...");
                                console.log("🧠 Creating knowledge index...");
                                try {
                                    const res = await axios.post("http://localhost:3000/pdf/add", { path: targetPath });
                                    if (res.data.duplicate) {
                                        console.log(chalk.yellow(`📄 PDF already indexed.\n`));
                                    } else {
                                        console.log(chalk.green("✅ PDF added successfully\n"));
                                    }
                                } catch (err) {
                                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                }
                            }

                        } else if (subCmd === "list") {
                            try {
                                const res = await axios.get("http://localhost:3000/pdf/list");
                                const docs = res.data.documents || [];
                                console.log("\n" + chalk.bold("📚 PDF Knowledge Base") + "\n");
                                if (docs.length === 0) {
                                    console.log(chalk.yellow("No PDFs indexed yet. Use /pdf add <path> to add a PDF.\n"));
                                } else {
                                    docs.forEach((d, idx) => {
                                        const activeTag = d.isActive ? chalk.green(" (active)") : "";
                                        console.log(`${idx + 1}. ${d.originalFilename}${activeTag}`);
                                    });
                                    console.log("");
                                }
                            } catch (err) {
                                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                            }

                        } else if (subCmd === "info") {
                            if (!subArg) {
                                console.log(chalk.red("Usage: /pdf info <name>\n"));
                            } else {
                                try {
                                    const res = await axios.get(`http://localhost:3000/pdf/info/${encodeURIComponent(subArg)}`);
                                    const info = res.data;
                                    console.log("\n" + chalk.bold("📄 PDF Information") + "\n");
                                    console.log(`📄 Name:            ${chalk.cyan(info.originalFilename)}`);
                                    console.log(`📁 Original path:   ${chalk.gray(info.filePath)}`);
                                    console.log(`📑 Pages:           ${info.pageCount}`);
                                    console.log(`🧩 Chunks:          ${info.chunkCount}`);
                                    console.log(`📅 Added:           ${info.addedAt}`);
                                    console.log(`📅 Updated:         ${info.updatedAt}`);
                                    console.log(`📊 Indexed status:  ${chalk.green("Ready")}\n`);
                                } catch (err) {
                                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                }
                            }

                        } else if (subCmd === "use") {
                            if (!subArg) {
                                console.log(chalk.red("Usage: /pdf use <name|all>\n"));
                            } else {
                                try {
                                    const res = await axios.post("http://localhost:3000/pdf/use", { name: subArg });
                                    console.log(chalk.green(`\n✅ Active PDF: ${res.data.activeDocumentName}\n`));
                                } catch (err) {
                                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                }
                            }

                        } else if (subCmd === "search") {
                            if (!subArg) {
                                console.log(chalk.red("Usage: /pdf search <query>\n"));
                            } else {
                                try {
                                    console.log(chalk.cyan("\n🔎 Searching PDF..."));
                                    const res = await axios.get(`http://localhost:3000/pdf/search/${encodeURIComponent(subArg)}`);
                                    const results = res.data || [];
                                    console.log("\n" + chalk.bold("🔎 PDF Search Results") + "\n");
                                    if (results.length === 0) {
                                        console.log(chalk.yellow("No relevant PDF content found.\n"));
                                    } else {
                                        results.forEach((r, idx) => {
                                            console.log(`${idx + 1}. ${chalk.cyan(r.documentName)} — Page ${r.pageNumber}`);
                                            console.log(chalk.gray(`   ${r.text.replace(/\n/g, " ").slice(0, 200)}...`));
                                            console.log("");
                                        });
                                    }
                                } catch (err) {
                                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                }
                            }

                        } else if (subCmd === "remove") {
                            if (!subArg) {
                                console.log(chalk.red("Usage: /pdf remove <name>\n"));
                            } else {
                                rl.question(chalk.yellow(`⚠️ Remove ${subArg}? (y/n) `), async (ans) => {
                                    if (ans.trim().toLowerCase() === "y" || ans.trim().toLowerCase() === "yes") {
                                        try {
                                            const res = await axios.delete(`http://localhost:3000/pdf/remove/${encodeURIComponent(subArg)}`);
                                            console.log(chalk.green(`\n✅ Removed ${res.data.removedName} successfully\n`));
                                        } catch (err) {
                                            console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                        }
                                    } else {
                                        console.log(chalk.gray("\nCancelled.\n"));
                                    }
                                    askQuestion();
                                });
                                return;
                            }

                        } else if (subCmd === "clear") {
                            rl.question(chalk.yellow("⚠️ Clear complete PDF knowledge base? (y/n) "), async (ans) => {
                                if (ans.trim().toLowerCase() === "y" || ans.trim().toLowerCase() === "yes") {
                                    try {
                                        await axios.post("http://localhost:3000/pdf/clear");
                                        console.log(chalk.green("\n✅ PDF Knowledge Base cleared successfully\n"));
                                    } catch (err) {
                                        console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                    }
                                } else {
                                    console.log(chalk.gray("\nCancelled.\n"));
                                }
                                askQuestion();
                            });
                            return;

                        } else if (subCmd === "off") {
                            try {
                                await axios.post("http://localhost:3000/pdf/off");
                                console.log(chalk.yellow("\n📚 PDF knowledge: disabled\n"));
                            } catch (err) {
                                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                            }

                        } else if (subCmd === "status") {
                            try {
                                const res = await axios.get("http://localhost:3000/pdf/status");
                                const s = res.data;
                                console.log("\n" + chalk.bold("📚 PDF Knowledge Base") + "\n");
                                console.log(`PDF Knowledge: ${s.enabled ? chalk.green("enabled") : chalk.red("disabled")}`);
                                console.log(`Documents:     ${s.totalDocuments}`);
                                console.log(`Active:        ${chalk.cyan(s.activeDocumentName)}\n`);
                            } catch (err) {
                                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                            }

                        } else {
                            console.log(
                                "\n" +
                                chalk.bold("PDF Commands:") +
                                "\n" +
                                "  /pdf add <path>               - Add and index a PDF file\n" +
                                "  /pdf list                     - List all indexed PDFs\n" +
                                "  /pdf info <name>              - View metadata and info for a PDF\n" +
                                "  /pdf use <name|all>           - Select active PDF or search across all PDFs\n" +
                                "  /pdf search <query>           - Search PDF knowledge without invoking AI\n" +
                                "  /pdf remove <name>            - Remove a PDF document\n" +
                                "  /pdf clear                    - Clear complete PDF knowledge base\n" +
                                "  /pdf off                      - Disable PDF mode without deleting index\n" +
                                "  /pdf status                   - View PDF knowledge status\n"
                            );
                        }
                        break;
                    }

                    case "history": {
                        const subCmd = (parts[1] || "").toLowerCase();
                        const subArg = parts.slice(2).join(" ").trim();

                        if (subCmd === "status") {
                            try {
                                const res = await axios.get("http://localhost:3000/history/status");
                                const s = res.data;
                                console.log("\n" + chalk.bold("📚 Chat History Knowledge Base") + "\n");
                                console.log(`History RAG:      ${s.enabled ? chalk.green("enabled") : chalk.red("disabled")}`);
                                console.log(`Indexed Sessions: ${s.totalSessions} (${(s.sessions || []).join(", ")})`);
                                console.log(`Total Messages:   ${s.totalMessages}`);
                                console.log(`Total Terms:      ${s.totalTerms}\n`);
                            } catch (err) {
                                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                            }
                        } else if (subCmd === "search") {
                            if (!subArg) {
                                console.log(chalk.red("Usage: /history search <query>\n"));
                            } else {
                                try {
                                    console.log(chalk.cyan("\n🔎 Searching Chat History..."));
                                    const res = await axios.get(`http://localhost:3000/history/search?q=${encodeURIComponent(subArg)}`);
                                    const results = res.data?.results || [];
                                    console.log("\n" + chalk.bold(`🔎 Chat History Search Results for "${subArg}"`) + "\n");
                                    if (results.length === 0) {
                                        console.log(chalk.yellow("No relevant past conversation found.\n"));
                                    } else {
                                        results.forEach((r, idx) => {
                                            console.log(`${idx + 1}. [${chalk.cyan(r.sessionTitle)} | ${chalk.yellow(r.role)}] (Score: ${r.score.toFixed(2)})`);
                                            console.log(chalk.gray(`   ${r.content.replace(/\n/g, " ").slice(0, 250)}${r.content.length > 250 ? "..." : ""}`));
                                            console.log("");
                                        });
                                    }
                                } catch (err) {
                                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                }
                            }
                        } else if (subCmd === "use") {
                            const mode = (subArg || "").toLowerCase();
                            if (mode === "on" || mode === "true" || mode === "enable") {
                                try {
                                    await axios.post("http://localhost:3000/history/use", { mode: "on" });
                                    console.log(chalk.green(`\n✅ History RAG: enabled\n`));
                                } catch (err) {
                                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                }
                            } else if (mode === "off" || mode === "false" || mode === "disable") {
                                try {
                                    await axios.post("http://localhost:3000/history/use", { mode: "off" });
                                    console.log(chalk.yellow(`\n🔇 History RAG: disabled\n`));
                                } catch (err) {
                                    console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                                }
                            } else {
                                console.log(chalk.red("Usage: /history use on | /history use off\n"));
                            }
                        } else if (subCmd === "clear") {
                            try {
                                const res = await axios.post("http://localhost:3000/history/clear");
                                console.log(chalk.green("\n✅ History Knowledge Index cleared and refreshed successfully\n"));
                                if (res.data.stats) {
                                    console.log(chalk.gray(`   Sessions: ${res.data.stats.totalSessions} | Messages: ${res.data.stats.totalMessages}\n`));
                                }
                            } catch (err) {
                                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                            }
                        } else if (subCmd === "on") {
                            try {
                                await axios.post("http://localhost:3000/history/on");
                                console.log(chalk.green(`\n✅ History RAG: enabled\n`));
                            } catch (err) {
                                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                            }
                        } else if (subCmd === "off") {
                            try {
                                await axios.post("http://localhost:3000/history/off");
                                console.log(chalk.yellow(`\n🔇 History RAG: disabled\n`));
                            } catch (err) {
                                console.log(chalk.red(`❌ ${err.response?.data?.error || err.message}\n`));
                            }
                        } else {
                            try {
                                const res = await axios.get("http://localhost:3000/history/status");
                                const s = res.data;
                                console.log("\n" + chalk.bold("📚 Chat History Knowledge Base") + "\n");
                                console.log(`History RAG:      ${s.enabled ? chalk.green("enabled") : chalk.red("disabled")}`);
                                console.log(`Indexed Sessions: ${s.totalSessions} (${(s.sessions || []).join(", ")})`);
                                console.log(`Total Messages:   ${s.totalMessages}`);
                                console.log(`Total Terms:      ${s.totalTerms}\n`);
                            } catch (err) {
                                // Server might be starting up
                            }
                            console.log(
                                chalk.bold("History Commands:") + "\n" +
                                "  /history status               - View history knowledge status\n" +
                                "  /history search <query>       - Search past chat conversations\n" +
                                "  /history use on|off           - Enable or disable history RAG\n" +
                                "  /history clear                - Refresh/re-index history knowledge\n"
                            );
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
                            "\n" + chalk.bold("PDF RAG Commands:") + "\n" +
                            "  /pdf add <path>               - Add and index a PDF file\n" +
                            "  /pdf list                     - List all indexed PDFs\n" +
                            "  /pdf info <name>              - View metadata and info for a PDF\n" +
                            "  /pdf use <name|all>           - Select active PDF or search across all PDFs\n" +
                            "  /pdf search <query>           - Search PDF knowledge without invoking AI\n" +
                            "  /pdf remove <name>            - Remove a PDF document\n" +
                            "  /pdf clear                    - Clear complete PDF knowledge base\n" +
                            "  /pdf off                      - Disable PDF mode without deleting index\n" +
                            "  /pdf status                   - View PDF knowledge status\n" +
                            "\n" + chalk.bold("History RAG Commands:") + "\n" +
                            "  /history                      - View history knowledge status and help\n" +
                            "  /history status               - View detailed history RAG status\n" +
                            "  /history search <query>       - Search past chat history without calling AI\n" +
                            "  /history use on|off           - Enable or disable history context injection\n" +
                            "  /history clear                - Refresh/re-index history knowledge\n" +
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

                if (res.data.citations && res.data.citations.length > 0) {
                    console.log(chalk.cyan("🔎 Searching PDF..."));
                    res.data.citations.forEach((c) => {
                        console.log(chalk.bold.yellow(`📄 Source: ${c}`));
                    });
                    console.log("");
                }

                if (res.data.historyCitations && res.data.historyCitations.length > 0) {
                    console.log(chalk.magenta("🔎 Searching Chat History..."));
                    res.data.historyCitations.forEach((c) => {
                        console.log(chalk.bold.magenta(`💬 Source: [${c.sessionTitle} | ${c.role}] ${c.snippet}`));
                    });
                    console.log("");
                }

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
