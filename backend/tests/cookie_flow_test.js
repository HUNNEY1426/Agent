const assert = require("assert");
const http = require("http");
const app = require("../server");

const PORT = 3098;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }

                // Extract cookie
                const setCookie = res.headers["set-cookie"];
                let tokenCookie = null;
                if (setCookie) {
                    const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
                    const match = cookieStr.match(/token=([^;]+)/);
                    if (match) tokenCookie = match[1];
                }

                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed,
                    tokenCookie
                });
            });
        });

        req.on("error", reject);
        if (body) {
            req.write(typeof body === "string" ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runCookieFlowTest() {
    console.log("==================================================");
    console.log("  TESTING COOKIE-BASED AUTHENTICATION FLOW");
    console.log("==================================================");

    const server = app.listen(PORT);
    await new Promise(r => setTimeout(r, 500));

    try {
        const email = `cookie_user_${Date.now()}@example.com`;
        const password = "Password123!";

        // 1. Initial /auth/me without cookie must return 401
        console.log("Step 1: Unauthenticated GET /auth/me");
        const res1 = await request("GET", "/auth/me");
        assert.strictEqual(res1.status, 401, "Expected 401 on initial unauthenticated load");
        console.log("  -> 401 AUTH_REQUIRED as expected ✅");

        // 2. Signup with credentials -> sets cookie
        console.log("Step 2: POST /auth/signup");
        const res2 = await request("POST", "/auth/signup", {
            name: "Cookie Tester",
            email,
            password
        });
        assert.strictEqual(res2.status, 201);
        assert.ok(res2.tokenCookie, "Expected Set-Cookie header with token");
        console.log("  -> Signup 201 with Set-Cookie: token=[REDACTED] ✅");
        const cookie = `token=${res2.tokenCookie}`;

        // 3. GET /auth/me with Cookie header -> returns 200 and user
        console.log("Step 3: GET /auth/me with Cookie");
        const res3 = await request("GET", "/auth/me", null, {
            Cookie: cookie
        });
        assert.strictEqual(res3.status, 200);
        assert.strictEqual(res3.data.success, true);
        assert.strictEqual(res3.data.user.email, email);
        console.log(`  -> 200 OK, user id=${res3.data.user.id}, email=${res3.data.user.email} ✅`);

        // 4. GET /pdf/list with Cookie
        console.log("Step 4: GET /pdf/list with Cookie");
        const res4 = await request("GET", "/pdf/list", null, { Cookie: cookie });
        assert.strictEqual(res4.status, 200);
        console.log("  -> 200 OK, PDF list retrieved ✅");

        // 5. GET /history/status with Cookie
        console.log("Step 5: GET /history/status with Cookie");
        const res5 = await request("GET", "/history/status", null, { Cookie: cookie });
        assert.strictEqual(res5.status, 200);
        console.log("  -> 200 OK, History status retrieved ✅");

        // 6. GET /user/profile with Cookie
        console.log("Step 6: GET /user/profile with Cookie");
        const res6 = await request("GET", "/user/profile", null, { Cookie: cookie });
        assert.strictEqual(res6.status, 200);
        console.log("  -> 200 OK, Profile retrieved ✅");

        // 7. Login with credentials -> sets fresh cookie
        console.log("Step 7: POST /auth/login");
        const res7 = await request("POST", "/auth/login", { email, password });
        assert.strictEqual(res7.status, 200);
        assert.ok(res7.tokenCookie);
        console.log("  -> Login 200 with Set-Cookie ✅");

        // 8. Logout
        console.log("Step 8: POST /auth/logout");
        const res8 = await request("POST", "/auth/logout", null, { Cookie: cookie });
        assert.strictEqual(res8.status, 200);
        console.log("  -> Logout 200 ✅");

        console.log("\nALL COOKIE FLOW TESTS PASSED! ✅");
    } finally {
        server.close();
    }
}

runCookieFlowTest().catch(err => {
    console.error("Cookie test failed:", err);
    process.exit(1);
});
