const jwt = require('jsonwebtoken');



class JwtService {

    // ---------------- INIT ----------------

    static accessSecret = process.env.JWT_ACCESS_SECRET || "THIS_IS_ACCESS_SECRET";
    static refreshSecret = process.env.JWT_REFRESH_SECRET || "THIS_IS_REFRESH_SECRET";
    static accessExpiry = 15 * 60; // 15 minutes
    static refreshExpiry = '10d'; // 10 days

    // ---------------- ACCESS TOKEN ----------------

    static signAccessToken(payload) {
        return jwt.sign(payload, this.accessSecret, { expiresIn: this.accessExpiry });
    }
    static verifyAccessToken(token) {
        return jwt.verify(token, this.accessSecret);
    }

    // ---------------- REFRESH TOKEN ----------------

    static signRefreshToken(payload) {
        return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshExpiry });
    }
    static verifyRefreshToken(token) {
        return jwt.verify(token, this.refreshSecret);
    }
}

module.exports = JwtService;