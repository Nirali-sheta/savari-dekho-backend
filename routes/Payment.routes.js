

const PaymentRoutes = require("express").Router();
const { paymentController, transactionController, payoutController } = require("../controllers");
const auth = require("../middlewares/auth");


PaymentRoutes.get("/transaction", auth, transactionController.getTransactions);  // Fetch wallet history
PaymentRoutes.post("/transaction", auth, transactionController.createTransaction);  // Credit/Debit wallet balance

PaymentRoutes.post("/checkout", auth, paymentController.createPaymentOrder);  // Create Payment Order
PaymentRoutes.post("/verify", auth, paymentController.validatePaymentOrder);  // Check if payment is successful
PaymentRoutes.put('/cancel', auth, paymentController.cancelPaymentOrder);

// Payout Routes - RazorpayX
PaymentRoutes.post("/webhook", payoutController.capturePayoutWebhook);
PaymentRoutes.post("/withdraw", auth, payoutController.createPayoutOrder);

module.exports = PaymentRoutes;