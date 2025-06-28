const express = require("express");
const {
    lookupByCuisine
} = require("../controllers/restaurantController");


const router = express.Router();

router.get("/restaurants",             lookupByCuisine);



module.exports = { restaurantsRouter: router };
