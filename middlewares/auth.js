const { User } = require('../model');
const { ResponseHandler, JwtService } = require('../services');

const auth = async (req, res, next) => {
    const Res = new ResponseHandler(res);
    let authHeader = req.headers.authorization;
    if (!authHeader) {
        return Res.unAuthorized();
    }

    const token = authHeader.split(' ')[1];

    try {
        const { userId } = JwtService.verifyAccessToken(token);
        req.userId = userId;
        next();
    } catch (err) {
        if (err.message === 'invalid signature' || err.message === 'jwt malformed') {
            return Res.tokenInvalid();
        } else if (err.message === 'jwt expired') {
            return Res.tokenExpired();
        }
        return Res.unAuthorized();
    }

}

module.exports = auth;