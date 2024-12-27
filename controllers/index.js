

module.exports = {
    paymentController: require('./paymentController'),
    authController: require('./authController'),
    otpController: require('./otpController'),
    transactionController: require('./transactionController'),
    verifyRequestController: require('./admin/index.js'),
    bankController: require('./bankController'),
    rideController: require('./rideController'),
    payoutController: require('./payoutController'),
    searchHistoryController:require('./searchController.js'),
    vehicleController: require("./vehicleController.js"),
    adminController: require("./admin"),
}