
const { ResponseHandler } = require('../services');
const { User } = require('../model');

const admin = async (req, res, next) => {
    const Res = new ResponseHandler(res);
    try {
        const user = await User.findById(req.userId);
        if (!user) return Res.notFound('Admin user not found');
        if (!user.isAdmin) {
            return Res.unAuthorized();
        }
        req.adminId = user.id;
        next();
    } catch (err) {
        return Res.serverError();
    }
};

module.exports = admin;
