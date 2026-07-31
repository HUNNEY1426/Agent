const { Command } = require("commander");
const axios = require("axios");
const chalk = require("chalk");
const ora = require("ora");

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



//run 


if (process.argv.length <= 2) {

    console.log(chalk.yellow("No command entered."));
    console.log("Use:");

    console.log("node cli.js ask \"Hello\"");
    console.log("node cli.js create notes.txt");
    console.log("node cli.js run \"dir\"");

    process.exit();

}

// Invalid command ke liye suggestions
program.showSuggestionAfterError(true);
program.showHelpAfterError();

// CLI start
program.parse(process.argv);

