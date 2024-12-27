
const OtpRoutes = require("express").Router();
const { otpController } = require("../controllers");

OtpRoutes.post("/generate", otpController.generateAndSendOtp);
OtpRoutes.post("/validate", otpController.validateOtp);

module.exports = OtpRoutes;