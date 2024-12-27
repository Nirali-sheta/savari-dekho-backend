const mongoose = require('mongoose');
const { BANK_ACC_TYPE_ENUM } = require('../enums');

const bankSchema = new mongoose.Schema({
    accountholderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    accountNumber: { type: Number, required: true, unique: true },
    ifsc: { type: String, required: true, },
    branchName: { type: String, required: true, },
    bankName: { type: String, required: true, },
    beneficiaryName: { type: String, required: true, },
    description: { type: String, required: false },
    accountType: {
        type: String,
        enum: BANK_ACC_TYPE_ENUM,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('Bank', bankSchema, "banks");