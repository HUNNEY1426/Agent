const jwt = require("jsonwebtoken");
const UserModel = require("../database/userModel");

const JWT_SECRET = process.env.JWT_SECRET || "agent_ai_super_secret_jwt_key_2026";

async function authMiddleware(req, res, next) {
    try {
        let token = null;
        const cookiePresent = Boolean(req.cookies && req.cookies.token);
        let authorizationPresent = false;

        // 1. Read token from HttpOnly cookie
        if (cookiePresent) {
            token = req.cookies.token;
        }

        // 2. Or from Authorization Bearer header
        if (!token && req.headers.authorization) {
            const parts = req.headers.authorization.split(" ");
            if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
                token = parts[1];
                authorizationPresent = true;
            }
        }

        let jwtValid = false;
        let userFound = false;

        // 3. If token is present, verify JWT
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                jwtValid = true;
                const user = await UserModel.findById(decoded.id);

                if (user) {
                    userFound = true;
                    req.user = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        settings: user.settings
                    };
                    console.log(`[AUTH DEBUG] path=${req.path} cookiePresent=${cookiePresent} authorizationPresent=${authorizationPresent} jwtValid=${jwtValid} userFound=${userFound}`);
                    return next();
                }
            } catch (jwtErr) {
                jwtValid = false;
            }
        }

        // 4. CLI / Local fallback for backward compatibility
        const isCli = req.headers["x-cli-agent"] === "true";
        if (isCli) {
            req.user = {
                id: "cli_user",
                email: "cli@local.agent",
                name: "CLI User",
                settings: {}
            };
            console.log(`[AUTH DEBUG] path=${req.path} cli=true`);
            return next();
        }

        console.log(`[AUTH DEBUG] path=${req.path} cookiePresent=${cookiePresent} authorizationPresent=${authorizationPresent} jwtValid=${jwtValid} userFound=${userFound} -> 401 AUTH_REQUIRED`);

        // 5. Authentication required
        return res.status(401).json({
            success: false,
            error: {
                code: "AUTH_REQUIRED",
                message: "Authentication required. Please log in."
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: {
                code: "AUTH_ERROR",
                message: "Authentication verification failed"
            }
        });
    }
}

module.exports = {
    authMiddleware,
    JWT_SECRET
};
