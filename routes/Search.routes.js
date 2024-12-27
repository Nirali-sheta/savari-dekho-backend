
const SearchRoutes = require("express").Router();
const { searchHistoryController } = require("../controllers");
const auth = require("../middlewares/auth");


SearchRoutes.get("/", searchHistoryController.searchRide);
SearchRoutes.get("/history", auth, searchHistoryController.fetchSearchHistoryByUserId);


module.exports = SearchRoutes;