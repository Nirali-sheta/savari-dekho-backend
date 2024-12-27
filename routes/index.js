
// Imports
const auth = require("../middlewares/auth");
const admin = require('../middlewares/admin');
const authRoutes = require("./Auth.routes");
const bankRoutes = require("./Bank.routes");
const otpRoutes = require("./Otp.routes");
const paymentRoutes = require("./Payment.routes");
const rideRoutes = require("./Ride.routes");
const searchRoutes = require("./Search.routes");
const vehicleRoutes = require("./Vehicle.routes");
const adminRoutes = require("./Admin.routes");


module.exports = function (app) {
  const router = require("express").Router();
  app.use(router);

  router.get("/", (req, res) => res.status(200).json({ serverStatus: "OK" }));

  router.use("/auth", authRoutes);
  router.use("/otp", otpRoutes);
  router.use("/search", searchRoutes);
  router.use("/ride", rideRoutes);
  router.use("/vehicle", auth, vehicleRoutes);
  router.use("/bank", auth, bankRoutes);
  router.use("/payment", paymentRoutes);
  router.use("/admin", auth, admin, adminRoutes);

  // 404 not found
  router.get("/*", (req, res) => res.status(404).json({ type: 'error', message: '404 not found!' }));
}