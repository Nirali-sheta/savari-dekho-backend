
const AuthRoutes = require("express").Router();
const { authController } = require("../controllers");
const auth = require("../middlewares/auth");


AuthRoutes.post("/refresh-token", authController.refreshToken);
AuthRoutes.post("/login", authController.login);
AuthRoutes.post("/register", authController.register); // Create
AuthRoutes.get("/me", auth, authController.getUser); // Read
AuthRoutes.get("/:userId", authController.getUserById); // Read
AuthRoutes.put("/user", auth, authController.updateUser); // Update
AuthRoutes.post("/forgot-password", authController.sendResetLink);
AuthRoutes.post("/reset-password", authController.resetPassword);
AuthRoutes.post("/driver", auth, authController.upgradeToDriver); // Become Driver
AuthRoutes.patch("/driver", auth, authController.updateDrivingLicense); // Update License


module.exports = AuthRoutes;