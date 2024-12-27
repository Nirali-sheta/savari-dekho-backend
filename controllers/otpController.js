
const { generateOtp } = require('../utils');
const { ResponseHandler, sendOtpToMobileNumber } = require('../services');
const Joi = require('joi');
const { User } = require('../model');
const { OTP_VALIDITY_TIME } = require('../config');



const generateAndSendOtp = async (req, res) => {
        const Res = new ResponseHandler(res);

        // Validate mobile Number
        const { error, value } = Joi.object({
                mobileNumber: Joi.string().min(10).required(),
        }).validate(req.body);
        if (error) return Res.badRequest(error.message);


        // Generate and Send OTP
        try {
                const otp = generateOtp(6);
                var user = await User.findOne({ mobileNumber: value.mobileNumber });
                if (user) {
                        if (user.isVerified) {
                                return Res.alreadyExist("User is already registered!");
                        } else if (user.otp !== null) {
                                return Res.badRequest("Please resend OTP after a while");
                        } else {
                                user.otp = otp;

                                try {
                                        // Send OTP via SMS
                                        await sendOtpToMobileNumber(otp, user.mobileNumber);

                                        // Save OTP in USER Model
                                        await user.save();

                                        // Auto-expire OTP after cooldown
                                        expireOtpAfterCooldown(OTP_VALIDITY_TIME, user.id, otp);

                                        return Res.success("OTP generated successfully!");
                                } catch (error) {
                                        expireOtpAfterCooldown(OTP_VALIDITY_TIME, user.id, otp);
                                        return Res.serverError(error.message);
                                }
                        }
                } else {

                        try {
                                user = new User({
                                        mobileNumber: value.mobileNumber,
                                        otp
                                });

                                // Send OTP via SMS
                                await sendOtpToMobileNumber(otp, user.mobileNumber);

                                // Save OTP in USER Model
                                await user.save();

                                // Auto-expire OTP after cooldown
                                expireOtpAfterCooldown(OTP_VALIDITY_TIME, user.id, otp);

                                return Res.success("OTP generated successfully!");
                        } catch (error) {
                                expireOtpAfterCooldown(OTP_VALIDITY_TIME, user.id, otp);
                                return Res.serverError(error.message);
                        }
                };
        } catch (error) {
                return Res.serverError(error.message);
        }

}

const validateOtp = async (req, res) => {
        const Res = new ResponseHandler(res);

        // Validate OTP
        const schema = Joi.object({
                mobileNumber: Joi.string().min(10).required(),
                otp: Joi.string().length(6).required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error) return Res.badRequest(error.message);

        try {
                const user = await User.findOne({ mobileNumber: value.mobileNumber });
                if (!user) return Res.notFound("User not found!")

                if (!user.otp) {
                        // OTP Expired
                        return Res.otpExpired();
                }

                if (user.otp != value.otp) {
                        // Invalid OTP
                        return Res.badRequest('Invalid OTP');
                }

                // Clear the OTP from the User Object
                user.otp = null;
                await user.save();

                return Res.success('OTP validation successful!');
        } catch (error) {
                return Res.serverError(error.message);
        }
}


module.exports = { generateAndSendOtp, validateOtp };

function expireOtpAfterCooldown(cooldown, userId, otp) {
        setTimeout(async () => {
                try {
                        const user = await User.findById(userId);
                        if (!user.otp || user.otp.toString() !== otp.toString()) return;
                        user.otp = null;
                        await user.save();
                } catch (error) { }
        }, cooldown * 1000);
}