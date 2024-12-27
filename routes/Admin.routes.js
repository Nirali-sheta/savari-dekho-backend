


const AdminRoutes = require("express").Router();
const { adminController } = require("../controllers");

AdminRoutes.get("/users", adminController.fetchUser);
AdminRoutes.get("/driver", adminController.fetchDriverRequests);
AdminRoutes.put("/driver", adminController.updateDriverRequests);
AdminRoutes.get("/vehicle", adminController.fetchVehicleRequests);
AdminRoutes.put("/vehicle", adminController.updateVehicleRequests);

module.exports = AdminRoutes;

