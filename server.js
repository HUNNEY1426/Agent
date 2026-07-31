const express = require("express");
const fileRoutes = require("./routes/file");
const shellRoutes = require("./routes/shell");
const aiRoutes = require("./routes/ai");

const app = express();



app.use(express.json());

app.use("/ai", aiRoutes);
app.use("/file", fileRoutes);
app.use("/shell", shellRoutes);

app.get("/", (req, res) => {
    res.send("Server Running");
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});