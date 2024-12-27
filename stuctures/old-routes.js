
// Imports
const { paymentController, otpController, authController, transactionController, verifyRequestController, bankController, rideController, payoutController, searchHistoryController } = require('../controllers');
const router = require("express").Router();
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const multer = require('../middlewares/multer');
const { decode } = require('@googlemaps/polyline-codec')

// =================================================== ROUTE MIDDLEWARE ===================================================

router.use(multer(['/register', '/me', '/user']));

// =================================================== ROUTES ===================================================

router.get("/", (req, res) => res.status(200).json({ serverStatus: "OK" }));

// Auth Routes
router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/me", auth, authController.getUser);
router.put("/user", auth, authController.updateUser);
router.get("/users", [auth, admin], authController.fetchUser);
router.post("/forgot-password", authController.sendResetLink);
router.post("/reset-password", authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);

// Payment Routes
router.post("/checkout", auth, paymentController.createPaymentOrder);  // Create Payment Order
router.post("/verify-payment", auth, paymentController.validatePaymentOrder);  // Check if payment is successful
router.put('/cancel-payment', auth, paymentController.cancelPaymentOrder);

router.get("/transaction", auth, transactionController.getTransactions);  // Fetch wallet history
router.post("/transaction", auth, transactionController.createTransaction);  // Credit/Debit wallet balance

// Payout Webhook
router.post("/razorpay-webhook", payoutController.captureWebhook);

// Otp Routes
router.post("/generate-otp", otpController.generateAndSendOtp);
router.post("/validate-otp", otpController.validateOtp);

// Rider Verification Request Routes
router.get("/requests/rider", [auth, admin], verifyRequestController.fetchDriverRequests);
router.post("/requests/rider", auth, verifyRequestController.uploadRiderDocs);
router.put("/requests/rider", [auth, admin], verifyRequestController.updateDriverStatus);
router.patch("/requests/rider", auth, verifyRequestController.updateRiderDocs);

//vehicle Verification Request Routes
router.get("/requests/vehicle", [auth, admin], verifyRequestController.fetchVehicleRequests);
router.post("/requests/vehicle", auth, verifyRequestController.uploadVehicleDocs);
router.put("/requests/vehicle", [auth, admin], verifyRequestController.updateVehicleStatus);
router.get("/vehicles", auth, verifyRequestController.fetchVehicles);
router.get("/vehicles/:id", auth, verifyRequestController.fetchVehicleById);
router.put("/vehicles/:id", auth, verifyRequestController.updateVehicleById);
router.delete("/vehicles/:id", auth, verifyRequestController.deleteVehicleById);

//bank Routes
router.post("/bank", [auth], bankController.addBanks);
router.get("/bank", auth, bankController.fetchBanks);
router.get("/bank/:id", auth, bankController.fetchBankById);
router.put("/bank/:id", auth, bankController.updateBankById);
router.delete("/bank/:id", auth, bankController.deleteBankById);


// Ride Routes
router.post("/ride", auth, rideController.publishRide);  // Publish
router.get("/ride/booked", auth, rideController.fetchRidesByPassengerId);  // Get by Passenger
router.get("/ride/published", auth, rideController.fetchRidesByPublisherId);  // Get by Driver
router.get("/ride/:id", auth, rideController.fetchRideById);  // Get by ID
router.put("/ride/:id", auth, rideController.updateRideById);  // Edit
router.delete("/ride/:id", auth, rideController.deleteRideById);  // Delete
// Ride Request Routes
router.post("/ride/request", auth, rideController.requestRide);
router.get("/ride/request/:id",auth,rideController.fetchPassengerRequests);
router.put("/ride/request/:id",auth,rideController.updatePassengerRequests);

// router.put("/ride/:id/request")
// router.put("/ride/:id/confirm")


//Search Routes
router.get("/search", searchHistoryController.searchRide);
router.get("/search-history", auth, searchHistoryController.fetchSearchHistoryByUserId);
// 404 not found
router.get("/*", (req, res) => {
  res.status(404).json({ type: 'error', message: '404 not found!' })
});

module.exports = router;