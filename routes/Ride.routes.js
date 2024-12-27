
const express = require("express");
const RideRoutes = express.Router();
const { rideController } = require("../controllers");
const auth = require("../middlewares/auth");


// =============== Ride Definition Routes ===============

RideRoutes.post("/", auth, rideController.publishRide);  // Create
RideRoutes.get("/booked", auth, rideController.fetchRidesByPassengerId);  // Read by Passenger ID
RideRoutes.get("/published", auth, rideController.fetchRidesByPublisherId);  // Read by Publisher ID
RideRoutes.get("/:rideId", rideController.fetchRideById);  // Read
RideRoutes.put("/:rideId", auth, rideController.updateRideById);  // Update (Edit)
RideRoutes.delete("/:rideId", auth, rideController.deleteRideById);  // Delete

// =============== Ride Operational Routes ===============

const rideOperationalRoutes = express.Router({ mergeParams: true });
RideRoutes.use("/:rideId", auth, rideOperationalRoutes);


// Ride Level Controls
rideOperationalRoutes.put("/start", /* Start Ride */rideController.startRide);
rideOperationalRoutes.put("/end", /* End Ride */rideController.endRide);
rideOperationalRoutes.put("/cancel", /* Cancel Ride */rideController.cancelRide);

// Passenger Level Controls
const passengerRoutes = express.Router({mergeParams: true});
rideOperationalRoutes.post("/passenger", rideController.requestRide); /* Request ride from passenger side */
rideOperationalRoutes.get("/passenger", rideController.fetchPassengerRequests); /* Fetch requests for a particular ride */
rideOperationalRoutes.use("/passenger", passengerRoutes);
// /ride/:rideId/passenger
passengerRoutes.put("/confirm", /* Confirm Ride from passenger side */rideController.confirmRideRequest);
passengerRoutes.put("/cancel", /* Cancel Ride from passenger side */rideController.cancelBooking);
// Driver Side
passengerRoutes.put("/update", rideController.updatePassengerRequests /* Change Passenger Status from driver side */);
passengerRoutes.put("/otp", /* Send otp to passenger */rideController.sendOtpToPassenger);
passengerRoutes.put("/start", /* Start passenger ride */rideController.startPassengerRide);
passengerRoutes.put("/end", /* end passenger ride */rideController.endPassengerRide);

/* 
    requestRide (/passenger/:passengerId/request) POST
    fetchPassengerRequests (/passenger/:passengerId/request) GET -> Driver
    changePassengerRequestStatus (/passenger/:passengerId/update) PUT -> Driver (approve/reject) {Optional if auto approve}
    confirmRide (/passenger/:passengerId/confirm) PUT
    cancelBooking (/passenger/:passengerId/cancel) PUT

    sendOtpToPassenger (/passenger/:passengerId/otp) PUT -> Driver
    startPassengerRide (/passenger/:passengerId/start) PUT -> Driver
    endPassengerRide (/passenger/:passengerId/end) PUT -> Driver

    /startRide (/start) PUT -> Driver
    /endRide (/end) PUT -> Driver
    /cancelRide (/cancel) PUT -> Driver
*/


module.exports = RideRoutes;