// backend/controllers/userController.js
const { getUserData, saveUserData } = require("../utils/userStore");

exports.getUser = (req, res) => {
    const data = getUserData(req.params.userId);
    res.json(data);
};

exports.setUser = (req, res) => {
    saveUserData(req.params.userId, req.body);
    res.sendStatus(204);
};
