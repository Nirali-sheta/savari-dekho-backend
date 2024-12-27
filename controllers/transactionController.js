const Joi = require('joi');
const { Transaction, User } = require('../model');
const { ResponseHandler } = require('../services');


const createTransaction = async (req, res) => {
    const Res = new ResponseHandler(res);


    // Validation
    const schema = Joi.object({
        amount: Joi.number().min(100).required(),
        type: Joi.string().valid("credit", "debit").required(),
        description: Joi.string().optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);


    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) return Res.notFound('User not found!');

        // If registration is incomplete
        if (!user.isVerified) return Res.unAuthorized("User is not verfied. Please complete the registration process.");


        const transaction = new Transaction({
            userId,
            amount: value.amount,
            type: value.type,
            description: value.description
        });


        // Save into User
        switch (value.type) {
            case 'credit':
                await user.addBalance(value.amount);
                break;

            case 'debit':
                await user.removeBalance(value.amount);
                break;

            default:
                break;
        }

        // Save the new transaction
        await transaction.save();

        return Res.success('Transaction successful!');
    } catch (error) {
        console.error(error.message);
        return Res.serverError(error.message);
    }
};

const getTransactions = async (req, res) => {
    const Res = new ResponseHandler(res);

    try {
        const userId = req.userId;
        const transactions = await Transaction.find({ userId }).select('-userId');
        return Res.sendPayload(transactions);
    } catch (error) {
        console.error(error.message);
        return Res.serverError(error.message);
    }
}

module.exports = {
    getTransactions,
    createTransaction,
}