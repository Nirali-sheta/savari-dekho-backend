
const VehicleRoutes = require("express").Router();
const { vehicleController } = require("../controllers");


VehicleRoutes.post("/", vehicleController.createVehicle);  // Create
VehicleRoutes.get("/", vehicleController.fetchVehicles);  // Read all
VehicleRoutes.get("/:id", vehicleController.fetchVehicleById);  // Read
VehicleRoutes.put("/:id", vehicleController.updateVehicleById);  // Update
VehicleRoutes.delete("/:id", vehicleController.deleteVehicleById);  // Delete


module.exports = VehicleRoutes;