const crypto = require('crypto');

//generate rendom otp number
function generateOtp(length) {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i++) {
        const rendomIndex = crypto.randomInt(0, digits.length);
        otp += digits[rendomIndex];
    }
    return otp;
}

function formatMobileNumber(mobileNumber) {
    if (mobileNumber.trim()==="") return "";

    return mobileNumber.split("-")[1];
}


module.exports = {
    generateOtp,
    formatMobileNumber,
};