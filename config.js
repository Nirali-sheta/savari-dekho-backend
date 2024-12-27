
const APP_PORT = process.env.NODE_ENV === 'production' ? 80 : 8080;
const DB_CONNECTION_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/Savari_dekho';
const MAX_SEARCH_DISTANCE_RADIUS = 20 // Kilometers
const MAX_SEARCH_RECORDS = 10; // Max search history to preserve
const OTP_VALIDITY_TIME = 60 * 1; // 1 minute
const STANDARD_COMMISSION = 15;
const CANCEL_BOOKING_COMMISSION = 40;
const CANCEL_RIDE_PENALTY_WITHIN_24_HR = 20;
const CANCEL_RIDE_PENALTY_WITHIN_48_HR = 10;
const CANCEL_RIDE_PENALTY_BEFORE_48_HR = 5;
const FRONTEND_URL = process.env.NODE_ENV === 'production' ? `https://savari-dekho.pages.dev` : `http://localhost:3000`
const MAIL_TRANSPORTER_AUTH = {
    user: "savaridekho@gmail.com",
    pass: "vfhw ytof dojc gokm",
}
const LINKS = {
    RIDE_DETAILS: `${FRONTEND_URL}/rides/:rideId`,
    WALLET: `${FRONTEND_URL}/wallet`,
    SEARCH_RIDES: `${FRONTEND_URL}/search-rides`,
    PUBLISH_RIDE: `${FRONTEND_URL}/rides/publish`,
    RAISE_TICKET: `${FRONTEND_URL}/ticket`,
    USER_PROFILE: `${FRONTEND_URL}/profile`,
    VEHICLE_DETAILS: `${FRONTEND_URL}/vehicle/:vehicleId`,
}


module.exports = {
    APP_PORT,
    DB_CONNECTION_URL,
    MAX_SEARCH_RECORDS,
    MAX_SEARCH_DISTANCE_RADIUS,
    OTP_VALIDITY_TIME,
    STANDARD_COMMISSION,
    CANCEL_BOOKING_COMMISSION,
    CANCEL_RIDE_PENALTY_WITHIN_24_HR,
    CANCEL_RIDE_PENALTY_WITHIN_48_HR,
    CANCEL_RIDE_PENALTY_BEFORE_48_HR,
    LINKS,
    MAIL_TRANSPORTER_AUTH,
}