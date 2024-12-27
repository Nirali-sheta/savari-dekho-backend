const mongoose = require('mongoose');
const { TRANSACTION_TYPE_ENUM, TRANSACTION_STATUS_ENUM } = require('../enums');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: TRANSACTION_TYPE_ENUM,
        required: true,
    },
    status: {
        type: String,
        enum: TRANSACTION_STATUS_ENUM,
        required: true,
    },
    description: {
        type: String,
    },
    razorpayOrderId: {
        type: String,
    },
    razorpayPaymentId: {
        type: String,
    },
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('Transaction', transactionSchema, 'transactions');