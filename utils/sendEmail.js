const nodemailer = require('nodemailer');
const { MAIL_TRANSPORTER_AUTH } = require('../config');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: MAIL_TRANSPORTER_AUTH,
});

const bodyHeader = `
<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
    <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
            <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Savari Dekho</a>
        </div>
`;

const bodyFooter = `
        <p style="font-size:0.9em;">Regards,<br />Savari Dekho</p>
        <hr style="border:none;border-top:1px solid #eee" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
            <p>Savari Dekho Inc</p>
            <p>SG. Highway, SVGU University, Ahmedabad-380015</p>
            <p>India</p>
        </div>
    </div>
</div>
`;

class EmailSender {

    // ####################################### User Emails #######################################

    sendOtp(to, otp) {
        const subject = 'Verification code';
        const body = `
            <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
                <div style="margin:50px auto;width:70%;padding:20px 0">
                    <div style="border-bottom:1px solid #eee">
                        <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Savari Dekho</a>
                    </div>
                    <p style="font-size:1.1em">Hi,</p>
                    <p>Thank you for choosing Savari Dekho. Use the following OTP to complete your Sign Up procedures. OTP is valid
                        for 5 minutes</p>
                    <h2
                        style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
                        ${otp}
                    </h2>
                    <p style="font-size:0.9em;">Regards,<br />Savari Dekho</p>
                    <hr style="border:none;border-top:1px solid #eee" />
                    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                        <p>Savari Dekho Inc</p>
                        <p>SG. Highway, SVGU University, Ahmedabad-380015</p>
                        <p>India</p>
                    </div>
                </div>
            </div>`;
        this.sendEmail(to, subject, body);
    }
    sendPasswordResetLink(user, resetLink) {
        const subject = 'Verification code';
        const body = `
            <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
                <div style="margin:50px auto;width:70%;padding:20px 0">
                    <div style="border-bottom:1px solid #eee">
                        <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Savari Dekho</a>
                    </div>
                    <p style="font-size:1.1em">Hi, ${user.firstName}</p>
                    <p>Use this link to reset your password</p>
                    <h2
                        style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
                        <a href="${resetLink}">RESET YOUR PASSWORD</a>
                    </h2>
                    <p style="font-size:0.9em;">Regards,<br />Savari Dekho</p>
                    <hr style="border:none;border-top:1px solid #eee" />
                    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                        <p>Savari Dekho Inc</p>
                        <p>SG. Highway, SVGU University, Ahmedabad-380015</p>
                        <p>India</p>
                    </div>
                </div>
            </div>`;
        return this.sendEmail(user.email, subject, body);
    }
    sendWelcomeEmail({
        userName,
        email,
        publishRideLink,
        searchRideLink,
    }) {
        // For normal registration
        const subject = 'Welcome to Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${userName}</p>
        <p>
            Thank you for registering with Savari Dekho. We hope you find this platform fit to your needs.
        </p>

        <h2 style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${searchRideLink}">Search Rides</a>
        </h2>
        <br />
        <h2 style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${publishRideLink}">Publish Ride</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(email, subject, body);
    }

    // ####################################### Passenger Side Emails #######################################

    // ------------ From Passenger actions ------------
    sendBookingAckToPassenger({
        passengerName,
        publisherName,
        fromText,
        toText,
        seats,
        price,
        email,
    }) {
        const subject = 'Request placed successfully | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>You have successfully requested to book ${publisherName}'s ride from ${fromText} to ${toText} for ${seats} seats at a total price of ₹${price}.
        </p>
        <p>
            Please wait for ${publisherName} to approve your request.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(email, subject, body);
    }
    sendConfirmedAckToPassenger({
        passengerName,
        passengerEmail,
        publisherName,
        publisherEmail,
        publisherMobileNumber,
        fromText,
        toText,
        price,
        viewRideLink,
    }) {
        const subject = 'Ride confirmed by driver | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>Your booking for ${publisherName}'s ride from ${fromText} to ${toText} at ₹${price} has been confirmed successfully.
        </p>
        <p>
            You can contact the driver using these below details to know more:
            <br />
            • ${publisherEmail}
            <br />
            • ${publisherMobileNumber}
        </p>
        <a href="${viewRideLink}">View Ride</a>
        ${bodyFooter}
        `;
        return this.sendEmail(passengerEmail, subject, body);
    }

    // ------------ From Driver actions ------------
    sendApprovedAckToPassenger({ passengerName, publisherName, price, paymentLink, email }) {
        const subject = 'Ride approved by driver | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>Your request to book ${publisherName}'s ride at ₹${price} has been approved. Please confirm it by making payment.
        </p>
        <h2 style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${paymentLink}">Make Payment</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(email, subject, body);
    }
    sendRejectedAckToPassenger({
        passengerName,
        publisherName,
        price,
        email,
        searchRidesLink,
    }) {
        const subject = 'Ride rejected by driver | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>Unfortunately ${publisherName} has rejected to approve your requested ride of ₹${price}.
        </p>
        <p>
        You can search for similar rides <a href="${searchRidesLink}">here</a>
        </p>
        <p>
            We are sorry for your inconvenience. Thank you for using Savari Dekho.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(email, subject, body);
    }
    // Passenger Level
    sendRideStartAckToPassenger({
        passengerName,
        passengerEmail,
        publisherName,
        fromText,
        toText,
        price,
        viewRideLink,
    }) {
        const subject = 'Ride Started Successfully | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>
            Your ride from ${fromText} to ${toText} at ₹${price} has been started successfully by ${publisherName}.
        </p>
        <h2
            style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${viewRideLink}">View Ride</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(passengerEmail, subject, body);
    }
    sendRideEndAckToPassenger({
        passengerName,
        passengerEmail,
        publisherName,
        fromText,
        toText,
        price,
        viewRideLink,
        raiseTicketLink,
    }) {
        const subject = 'Ride Completed Successfully | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>
            Your ride from ${fromText} to ${toText} at ₹${price} has been successfully completed by ${publisherName}.
        </p>
        <h2
            style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${viewRideLink}">View Ride</a>
        </h2>
        <p>
            If you had any problem with the ride, please raise a ticket <a href="${raiseTicketLink}">here</a>.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(passengerEmail, subject, body);
    }
    // Ride Level
    sendWholeRideStartAckToPassenger({
        passengerName,
        passengerEmail,
        publisherName,
        viewRideLink,
    }) {
        const subject = `${publisherName} has departed | Savari Dekho`;
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>
            ${publisherName} has started their journey. Please wait until they reach your location for pickup.
        </p>
        <h2
            style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${viewRideLink}">View Ride</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(passengerEmail, subject, body);
    }
    sendWholeRideCancelAckToPassenger({
        passengerName,
        passengerEmail,
        publisherName,
        viewWalletLink,
    }) {
        const subject = 'Ride Cancelled by Driver | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${passengerName}</p>
        <p>
            The ride you booked has been cancelled by ${publisherName}.
            You will receive 100% refund in your wallet.
        </p>
        <h2
            style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${viewWalletLink}">View Wallet</a>
        </h2>
        <p>
            We apologise for any inconvenience due to ride cancellation.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(passengerEmail, subject, body);
    }

    // ####################################### Driver Side Emails #######################################

    // ------------ From Admin actions ------------
    documentVerificationComplete({
        driverName,
        driverEmail,
        driverProfileLink,
    }) {
        // Driver verification success email
        const subject = 'Documents Verified Successfully | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${driverName}</p>
        <p>
            Your uploaded documents have been verified successfully! Congratulations 🎉
        </p>
        <h2 style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${driverProfileLink}">View Profile</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(driverEmail, subject, body);
    }
    documentVerificationFailed({
        driverName,
        driverEmail,
        driverProfileLink
    }) {
        // Driver verification failed email
        const subject = 'Documents Verification Failed | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${driverName}</p>
        <p>
            Unfortunately, your uploaded documents have not been verified. 
            Please reupload correct & accurate documents in original format.
        </p>
        <h2 style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${driverProfileLink}">Re-upload Documents</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(driverEmail, subject, body);
    }
    vehicleVerificationComplete({
        driverName,
        driverEmail,
        vehicleDetailsLink,
        vehicleModel,
    }) {
        // Driver verification success email
        const subject = 'Vehicle Verified Successfully | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${driverName}</p>
        <p>
            Your recently added vehicle documents for ${vehicleModel} have been verified successfully! Congratulations 🎉
        </p>
        <h2 style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${vehicleDetailsLink}">View Vehicle</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(driverEmail, subject, body);
    }
    vehicleVerificationFailed({
        driverName,
        driverEmail,
        vehicleDetailsLink,
        vehicleModel
    }) {
        // Driver verification failed email
        const subject = 'Vehicle Verification Failed | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${driverName}</p>
        <p>
            Your recently added vehicle documents for ${vehicleModel} have not been verified! 
            Please reupload correct & accurate documents in original format.
        </p>
        <h2 style="background: #00466a;margin: 0 auto;width: fit-content;padding: 0 10px;color: #fff;border-radius: 4px;">
            <a href="${vehicleDetailsLink}">Re-upload Vehicle Documents</a>
        </h2>
        ${bodyFooter}
        `;
        return this.sendEmail(driverEmail, subject, body);
    }

    // ------------ From Passenger actions ------------
    sendNewPassengerRequestToDriver({ passengerName, publisherName, publisherEmail, rideDetailsLink }) {
        const subject = 'New Ride Request | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${publisherName}</p>
        <p>
            ${passengerName} has just requested to book your ride. 
            Please visit your ride dashboard <a href="${rideDetailsLink}">here</a> to approve them.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(publisherEmail, subject, body);
    }
    sendPassengerConfirmationToDriver({ passengerName, publisherName, publisherEmail, rideDetailsLink, price }) {
        const subject = 'Passenger Confirmed | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${publisherName}</p>
        <p>
            ${passengerName} has just completed the payment of ₹${price} and confirmed their ride booking. 
            Please visit your ride dashboard <a href="${rideDetailsLink}">here</a> for more details.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(publisherEmail, subject, body);

    }
    sendPassengerCancellationToDriver({ passengerName, publisherName, publisherEmail, rideDetailsLink, price }) {
        const subject = 'Passenger Cancelled | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${publisherName}</p>
        <p>
            ${passengerName} has cancelled their ride booking of ₹${price}. 
            Please visit your ride dashboard <a href="${rideDetailsLink}">here</a> for more details.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(publisherEmail, subject, body);
    }

    // ------------ From Driver actions ------------
    sendWholeRideStartAckToDriver({
        publisherName,
        publisherEmail,
    }) {
        const subject = 'Ride started successfully | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${publisherName}</p>
        <p>
            Your ride has been successfully started. Please ask passengers for otp to start their ride.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(publisherEmail, subject, body);
    }
    sendWholeRideEndAckToDriver({
        publisherName,
        publisherEmail,
        totalCommission,
    }) {
        const subject = 'Ride completed successfully | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${publisherName}</p>
        <p>
            Your ride has been successfully completed. 
            ₹${totalCommission} will be added to your wallet within 24 hrs.
            Thank you for using Savari Dekho.
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(publisherEmail, subject, body);
    }
    sendWholeRideCancelAckToDriver({
        publisherName,
        publisherEmail,
        penalty
    }) {
        const subject = 'Ride cancelled | Savari Dekho';
        const body = `
        ${bodyHeader}
        <p style="font-size:1.1em">Hi, ${publisherName}</p>
        <p>
            Your ride has been cancelled. ${penalty > 0 ? `You will be charged ₹${penalty} for cancellation.` : ""}
        </p>
        ${bodyFooter}
        `;
        return this.sendEmail(publisherEmail, subject, body);
    }

    // ####################################### Main Method #######################################
    async sendEmail(recipient, subject, body) {
        const mailOptions = {
            from: "timesforprime@gmail.com",
            to: recipient,
            subject: subject,
            html: body
        };

        return new Promise((res, rej) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(err.message);
                    rej(err);
                }
                res(info);
            })
        });
    }
}

module.exports = EmailSender;