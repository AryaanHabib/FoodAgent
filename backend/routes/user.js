// backend/routes/user.js
const express = require("express");
const { getUser, setUser } = require("../controllers/userController");
const router = express.Router();

router.get("/:userId", getUser);
router.post("/:userId", setUser);

module.exports = { userRouter: router };