const axios = require("axios");

async function benchmark() {

    const start = Date.now();

    try {

        const res = await axios.post(
            "http://localhost:3000/ai/ask",
            {
                question: "What is Express?"
            }
        );

        const end = Date.now();

        console.log("Response Time:", end - start, "ms");

        console.log("\nAnswer:\n");

        console.log(res.data.answer);

    } catch (err) {
        {

            console.log("Status:", err.response?.status);

            console.log("Data:");

            console.log(err.response?.data);

        }

    }

}

benchmark();