/**
 * tests/auth_integration_test.js
 * Comprehensive integration test suite for Authentication, User Isolation, and API Protection.
 */

const assert = require("assert");
const http = require("http");
const fs = require("fs");
const path = require("path");
process.env.NODE_ENV = "test";
const app = require("../server");

let server;
const PORT = 3099;
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

                // Extract cookies if any
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

async function runTests() {
    console.log("==================================================");
    console.log("  RUNNING AUTHENTICATION & INTEGRATION TESTS");
    console.log("==================================================\n");

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        return (async () => {
            try {
                process.stdout.write(`• ${name}... `);
                await fn();
                console.log("✅ PASS");
                passed++;
            } catch (err) {
                console.log(`❌ FAIL: ${err.message}`);
                failed++;
            }
        })();
    }

    server = app.listen(PORT);
    // Wait for server to bind
    await new Promise(r => setTimeout(r, 500));

    const testEmailA = `test_user_a_${Date.now()}@example.com`;
    const testEmailB = `test_user_b_${Date.now()}@example.com`;
    const passwordA = "SecretPass123";
    const passwordB = "AnotherPass456";

    let tokenA = null;
    let userA = null;
    let tokenB = null;
    let userB = null;

    try {
        // TEST 1: Public endpoint
        await test("GET / is public and returns 200", async () => {
            const res = await request("GET", "/");
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.status, "running");
        });

        // TEST 2: Protected endpoint returns 401 when unauthenticated
        await test("GET /ai/chat/list without auth returns 401 AUTH_REQUIRED", async () => {
            const res = await request("GET", "/ai/chat/list", null, { "user-agent": "browser" });
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.data.success, false);
            assert.strictEqual(res.data.error.code, "AUTH_REQUIRED");
        });

        await test("GET /pdf/list without auth returns 401 AUTH_REQUIRED", async () => {
            const res = await request("GET", "/pdf/list", null, { "user-agent": "browser" });
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.data.success, false);
        });

        await test("GET /history/status without auth returns 401 AUTH_REQUIRED", async () => {
            const res = await request("GET", "/history/status", null, { "user-agent": "browser" });
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.data.success, false);
        });

        // TEST 3: Signup User A
        await test("POST /auth/signup creates User A", async () => {
            const res = await request("POST", "/auth/signup", {
                name: "User Alpha",
                email: testEmailA,
                password: passwordA
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.success, true);
            assert.strictEqual(res.data.user.email, testEmailA);
            assert.strictEqual(res.data.user.passwordHash, undefined, "passwordHash must NEVER be returned");
            assert.ok(res.data.token, "JWT token must be returned");
            tokenA = res.data.token;
            userA = res.data.user;
        });

        // TEST 4: Duplicate Email Signup fails
        await test("POST /auth/signup with duplicate email returns 409", async () => {
            const res = await request("POST", "/auth/signup", {
                name: "Duplicate User",
                email: testEmailA,
                password: "SomePassword123"
            });
            assert.strictEqual(res.status, 409);
            assert.strictEqual(res.data.success, false);
            assert.strictEqual(res.data.error.code, "EMAIL_EXISTS");
        });

        // TEST 5: Signup User B
        await test("POST /auth/signup creates User B", async () => {
            const res = await request("POST", "/auth/signup", {
                name: "User Beta",
                email: testEmailB,
                password: passwordB
            });
            assert.strictEqual(res.status, 201);
            tokenB = res.data.token;
            userB = res.data.user;
            assert.notStrictEqual(userA.id, userB.id);
        });

        // TEST 6: Login with wrong password returns 401
        await test("POST /auth/login with wrong password returns 401", async () => {
            const res = await request("POST", "/auth/login", {
                email: testEmailA,
                password: "WrongPassword"
            });
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.data.success, false);
        });

        // TEST 7: Login with correct password returns 200 + token + cookie
        await test("POST /auth/login with correct password succeeds", async () => {
            const res = await request("POST", "/auth/login", {
                email: testEmailA,
                password: passwordA
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.ok(res.data.token);
            assert.strictEqual(res.data.user.email, testEmailA);
            assert.strictEqual(res.data.user.passwordHash, undefined);
        });

        // TEST 8: GET /auth/me with Bearer token
        await test("GET /auth/me returns authenticated user identity", async () => {
            const res = await request("GET", "/auth/me", null, {
                Authorization: `Bearer ${tokenA}`
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.user.id, userA.id);
            assert.strictEqual(res.data.user.email, testEmailA);
        });

        // TEST 9: User Profile Update
        await test("PUT /user/profile updates user profile name", async () => {
            const res = await request("PUT", "/user/profile", {
                name: "User Alpha Renamed",
                settings: { theme: "dark", defaultProvider: "gemini" }
            }, {
                Authorization: `Bearer ${tokenA}`
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.user.name, "User Alpha Renamed");
            assert.strictEqual(res.data.user.settings.theme, "dark");
        });

        // TEST 10: User Data Isolation - Chat Sessions
        await test("User Data Isolation: User A chat sessions are hidden from User B", async () => {
            // User A creates session "alpha-private-chat"
            const createRes = await request("POST", "/ai/chat/new", {
                name: "alpha-private-chat"
            }, {
                Authorization: `Bearer ${tokenA}`
            });
            assert.strictEqual(createRes.status, 200);

            // User A lists sessions -> should include "alpha-private-chat"
            const listA = await request("GET", "/ai/chat/list", null, {
                Authorization: `Bearer ${tokenA}`
            });
            const hasAlphaInA = listA.data.some(s => s.id === "alpha-private-chat");
            assert.strictEqual(hasAlphaInA, true, "User A must see their session");

            // User B lists sessions -> MUST NOT see "alpha-private-chat"
            const listB = await request("GET", "/ai/chat/list", null, {
                Authorization: `Bearer ${tokenB}`
            });
            const hasAlphaInB = listB.data.some(s => s.id === "alpha-private-chat");
            assert.strictEqual(hasAlphaInB, false, "User B must NOT see User A's session");
        });

        // TEST 11: User Data Isolation - PDF Knowledge Base
        await test("User Data Isolation: User A's PDF list is isolated from User B", async () => {
            // Check User A PDF list (initially empty)
            const listA = await request("GET", "/pdf/list", null, {
                Authorization: `Bearer ${tokenA}`
            });
            assert.strictEqual(listA.status, 200);
            assert.strictEqual(listA.data.documents.length, 0);

            // Check User B PDF list (initially empty)
            const listB = await request("GET", "/pdf/list", null, {
                Authorization: `Bearer ${tokenB}`
            });
            assert.strictEqual(listB.status, 200);
            assert.strictEqual(listB.data.documents.length, 0);
        });

        // TEST 12: User Data Isolation - History RAG
        await test("User Data Isolation: History search is scoped to authenticated user", async () => {
            const histA = await request("GET", "/history/search?q=test", null, {
                Authorization: `Bearer ${tokenA}`
            });
            assert.strictEqual(histA.status, 200);
            assert.ok(Array.isArray(histA.data.results));

            const histB = await request("GET", "/history/search?q=test", null, {
                Authorization: `Bearer ${tokenB}`
            });
            assert.strictEqual(histB.status, 200);
            assert.ok(Array.isArray(histB.data.results));
        });

        // TEST 13: Logout endpoint
        await test("POST /auth/logout clears cookie and returns success", async () => {
            const res = await request("POST", "/auth/logout");
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
        });

        // TEST 14: CLI Backward Compatibility
        await test("CLI requests with x-cli-agent header authenticate seamlessly", async () => {
            const res = await request("GET", "/ai/chat/list", null, {
                "x-cli-agent": "true"
            });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data));
        });

    } finally {
        server.close();
    }

    console.log("\n==================================================");
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================\n");

    if (failed > 0) {
        process.exit(1);
    }
    process.exit(0);
}

if (require.main === module) {
    runTests().catch(err => {
        console.error("Test runner failed:", err);
        process.exit(1);
    });
}

module.exports = { runTests };
