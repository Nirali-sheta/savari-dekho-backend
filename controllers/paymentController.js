

const Razorpay = require("razorpay");
const { ResponseHandler } = require("../services");
const Joi = require("joi");
const crypto = require('crypto');
const { Transaction, User } = require("../model");


const validatePaymentOrder = async (req, res, next) => {
    const Res = new ResponseHandler(res);
    const schema = Joi.object({
        razorpayPaymentId: Joi.string().required(),
        razorpayOrderId: Joi.string().required(),
        razorpaySignature: Joi.string().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        } = value;

        // Creating our own digest
        // The format should be like this:
        // digest = hmac_sha256(orderCreationId + "|" + razorpayPaymentId, secret);
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        // Check if Payment Failed!
        if (expectedSignature !== razorpaySignature) {
            console.log("Failed");
            return Res.badRequest("Payment Failed!");
        }

        /* THE PAYMENT IS LEGIT & VERIFIED */

        // Find User
        const user = await User.findById(req.userId);
        if (!user) return Res.notFound('User not found!');

        // If registration is incomplete
        if (!user.isVerified) return Res.unAuthorized("User is not verfied. Please complete the registration process.");


        // Update transaction status to "completed"
        const transaction = await Transaction.findOne({ razorpayOrderId });
        if (!transaction) return Res.notFound('Payment checkout order not found!');
        transaction.razorpayPaymentId = razorpayPaymentId;
        transaction.status = 'completed';
        await transaction.save();

        // Update user balance
        await user.addBalance(transaction.amount);

        // Wrap everything up
        return Res.success("Payment Successful!");
    } catch (error) {
        return Res.serverError(error.message);
    }
}


const createPaymentOrder = async (req, res, next) => {
    const Res = new ResponseHandler(res);

    const schema = Joi.object({
        amount: Joi.number().min(100),
        description: Joi.string().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);


    try {
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET,
        });

        const options = {
            amount: Number(value.amount) * 100, // amount in smallest currency unit
            currency: "INR",
        };
        const order = await instance.orders.create(options);
        if (!order) return Res.serverError();


        const transaction = new Transaction({
            amount: value.amount,
            status: 'pending',
            type: 'credit',
            userId: req.userId,
            description: value.description,
            razorpayOrderId: order.id,
        });
        await transaction.save();

        // Send the Order details
        return Res.sendPayload({ order, key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error(error);
        if (error.error) {
            return Res.serverError('Internal Server Error:', error.code);
        }
        return Res.serverError("Internal Server Error: " + error.message);
    }
}


const cancelPaymentOrder = async (req, res) => {
    const Res = new ResponseHandler(res);

    const schema = Joi.object({
        orderId: Joi.string().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);

    try {
        const transaction = await Transaction.findOne({ razorpayOrderId: value.orderId });
        transaction.status = 'failed';
        await transaction.save();

        // Send the Order details
        return Res.success('Transaction cancelled!');
    } catch (error) {
        console.error(error);
        return Res.serverError("Internal Server Error: " + error.message);
    }
}


module.exports = {
    validatePaymentOrder,
    createPaymentOrder,
    cancelPaymentOrder,
};