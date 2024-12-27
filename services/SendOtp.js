const { formatMobileNumber } = require('../utils');

module.exports = async (otp, mobileNumber) => {
    return new Promise((res, rej) => {
        const axios = require('axios');

        const url = 'https://www.fast2sms.com/dev/bulkV2';
        const apiKey = process.env.SMS_API_KEY;
        // console.log(formatMobileNumber(mobileNumber));
        const requestData = {
            route: 'otp',
            variables_values: otp.toString(),
            numbers: formatMobileNumber(mobileNumber), // Replace with the phone number(s) you want to send OTP to
        };

        const headers = {
            'Authorization': `${apiKey}`,
            'Content-Type': 'application/json',
        };
        
        axios.post(url, requestData, { headers })
            .then((response) => {
                // console.log(response.data.message);
                res();
            })
            .catch((error) => {
                rej(new Error(error.response.data.message));
            });
    })

};