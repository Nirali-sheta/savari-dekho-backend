

const BankRoutes = require("express").Router();
const { bankController } = require("../controllers");

BankRoutes.post("/", bankController.addBanks); // Create
BankRoutes.get("/", bankController.fetchBanks); // Read all
BankRoutes.get("/:id", bankController.fetchBankById); // Read
BankRoutes.put("/:id", bankController.updateBankById); // Update
BankRoutes.delete("/:id", bankController.deleteBankById); // Delete

module.exports = BankRoutes;