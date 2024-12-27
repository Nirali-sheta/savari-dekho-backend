
const { validateWebhookSignature } = require("razorpay");
const { ResponseHandler } = require("../services");
const Joi = require("joi");
const { User, Transaction, Bank } = require("../model");
const { default: axios } = require("axios");

const PAYOUT_API_URL = "https://api.razorpay.com/v1/payouts";

const createPayoutOrder = async (req, res) => {
    const Res = new ResponseHandler(res);
    const schema = Joi.object({
        amount: Joi.number().min(100).message("Minimum withdrawal amount must be atleast ₹100"),
        bankId: Joi.string().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return Res.badRequest(error.details[0].message);
    const withdrawAmount = value.amount;

    const user = await User.findById(req.userId);
    if (!user) return Res.notFound("Cannot find any user by given ID");

    if (user.balance < withdrawAmount) return Res.badRequest("Insufficient funds!");


    try {
        user.balance -= withdrawAmount;
        user.save();
        const transaction = new Transaction({
            amount: withdrawAmount,
            status: "pending",
            type: "debit",
            description: "Withdrawal of funds",
            userId: req.userId,
        });
        transaction.save();

        const bank = await Bank.findById(value.bankId);
        if (!bank) return Res.notFound("Bank by given ID not found!");

        const payoutDetails = {
            "account_number": process.env.RAZORPAY_ACCOUNT_NUMBER,
            "fund_account": {
                "account_type": "bank_account",
                "bank_account": {
                    "name": bank.beneficiaryName,
                    "ifsc": bank.ifsc,
                    "account_number": bank.accountNumber
                },
                "contact": {
                    "name": `${user.firstName} ${user.lastName}`,
                    "email": user.email,
                    "contact": user.mobileNumber.split("-")[1],
                    "type": "customer",
                    "notes": {
                        "userId": user.id,
                    }
                }
            },
            "amount": withdrawAmount * 100,
            "currency": "INR",
            "mode": "IMPS",
            "purpose": "payout",
            "queue_if_low_balance": true,
            "reference_id": transaction.id,
            "narration": "Savari Dekho Funds Withdrawal",
            "notes": {
                "userId": user.id,
            }
        }

        const payoutResponse = await axios.post(PAYOUT_API_URL, payoutDetails, {
            auth: { username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_SECRET },
        })
        // console.log("------------------------ start ------------------------");
        // console.log(payoutResponse);
        // console.log("------------------------ end ------------------------");
        return Res.success("Withdrawal request created successfully!");
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a non-2xx status code
            console.error('Error Response Data:', error.response.data);
            console.error('Error Response Status:', error.response.status);
            console.error('Error Response Headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received. Request:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error:', error.message);
        }
        return Res.serverError(error.message)
    }
}

const capturePayoutWebhook = async (req, res) => {
    const webhookSignature = req.get("X-Razorpay-Signature");
    const event = req.body;
    const webhookBody = JSON.stringify(event);

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    try {
        validateWebhookSignature(webhookBody, webhookSignature, webhookSecret);
        // Signature is valid


        const response = event.payload.payout.entity;
        const userId = event.payload?.payout.entity.notes.userId;
        const user = await User.findById(userId);
        if (!user) return;
        const transaction = await Transaction.findById(response.reference_id);

        switch (event.event) {
            // case "payout.initiated":
            //     console.log("Payout created");
            //     break;

            // case "payout.queued":
            //     console.log("Payout Queued");
            //     break;

            case "payout.processed":
                await Transaction.findByIdAndUpdate(response.reference_id, { $set: { status: "completed" } });
                /* Send success email to user */
                break;

            case "payout.failed":
            case "payout.reversed":
            case "payout.rejected":
                user.balance += transaction.amount;
                transaction.status = "failed";
                /* Send success email to user */
                await transaction.save();
                await user.save();
                break;


            default:
                break;
        }
        return res.status(200).send("Webhook received and verified.");
    } catch (error) {
        // Signature verification failed
        console.error("Webhook verification failed:", error);
        res.status(403).send("Webhook verification failed.");
    }
}

module.exports = {
    capturePayoutWebhook,
    createPayoutOrder,
}