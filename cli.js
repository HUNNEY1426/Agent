const { Command } = require("commander");
const axios = require("axios");
const chalk = require("chalk");
const ora = require("ora");
const readline = require("readline");

const program = new Command();

//create command 

program
    .command("create <filename>")
    .action(async (filename) => {

        const spinner = ora("Creating File...").start();

        try {

            const res = await axios.post(
                "http://localhost:3000/file/create",
                {
                    filename
                }
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


//read command


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


//delete command



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



program
    .command("run <command>")
    .description("Run terminal command")
    .action(async (command) => {

        console.log(chalk.green("✔ Connected"));

        const spinner = ora("Running Command...").start();

        try {

            const res = await axios.post(
                "http://localhost:3000/shell/run",
                {
                    command,
                }
            );

            spinner.succeed("Done");

            console.log(chalk.yellow(res.data.output));

        } catch (err) {

            spinner.fail("Error");

            console.log(err.response?.data || err.message);

        }

    });



program
    .command("ask <question>")
    .description("Ask AI")
    .action(async (question) => {

        console.log(chalk.green("✔ Connected"));

        const spinner = ora("AI Thinking...").start();

        try {

            const res = await axios.post(
                "http://localhost:3000/ai/ask",
                {
                    question,
                }
            );

            spinner.succeed("Done");

            console.log(chalk.cyan(res.data.answer));

        } catch (err) {

            spinner.fail("Error");

            console.log(err.response?.data || err.message);

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
                {
                    name,
                }
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

            const res = await axios.get(
                "http://localhost:3000/ai/chat/list"
            );

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
                {
                    name,
                }
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
                {
                    oldName,
                    newName,
                }
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
                {
                    name,
                }
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
                {
                    source,
                    target,
                }
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
    console.log(chalk.gray("Type 'exit' or 'quit' to end the session."));
    console.log(chalk.bold.cyan("===========================================\n"));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
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

            const spinner = ora("AI Thinking...").start();

            try {
                const res = await axios.post("http://localhost:3000/ai/ask", {
                    question: trimmed,
                });

                spinner.succeed(chalk.green("AI:"));
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

