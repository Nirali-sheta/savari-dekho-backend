const mongoose = require('mongoose');
const { JwtService } = require('../services');
const { RIDER_VERIFICATION_STATUS_ENUM } = require('../enums');



const userSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    gender: { type: String },
    dateOfBirth: { type: Date },
    email: { type: String, unique: true, sparse: true },
    mobileNumber: { type: String, unique: true },
    city: { type: String },
    state: { type: String },
    address: { type: String },
    zipcode: { type: String },
    password: { type: String, select: false },
    profilePicture: { type: String },
    balance: { type: Number, default: 0 },
    otp: { type: String },
    riderVerificationStatus: {
        type: String,
        enum: RIDER_VERIFICATION_STATUS_ENUM,
    },
    isVerified: { type: Boolean, default: false },
    drivingLicenseFront: { type: String },
    drivingLicenseBack: { type: String },
    isAdmin: { type: Boolean },
    refreshTokens: {
        type: [{ type: String, select: false }],
        default: [],
    },
    vehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    }],
    // bankAccounts:[{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref:'Bank',
    // }],
}, { timestamps: true, versionKey: false });


userSchema.methods.addBalance = async function (amount) {
    this.balance += amount;
    try {
        await this.save();
    } catch (error) { }
}

userSchema.methods.removeBalance = async function (amount) {
    this.balance -= amount
    try {
        await this.save();
    } catch (error) { }
}

userSchema.methods.removeExpiredTokens = async function () {
    if (!this.refreshTokens) return;

    // Filter out expired tokens
    this.refreshTokens = this.refreshTokens.filter((token) => {
        try {
            const { userId } = JwtService.verifyRefreshToken(token);
            if (this.id !== userId) return false;
            return true; // Not expired
        } catch (error) {
            return false; // Expired
        }
    });

    // Save the updated user object
    try {
        await this.save();
    } catch (error) { }
};



module.exports = mongoose.model('User', userSchema, 'users');