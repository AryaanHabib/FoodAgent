// backend/controllers/restaurantController.js
const {
    findByCuisine,

} = require("../services/googleService");

exports.lookupByCuisine = async (req, res) => {
    const { lat, lon, cuisine } = req.query;
    if (!lat||!lon||!cuisine) {
        return res.status(400).json({ error: "lat, lon & cuisine required" });
    }
    try {
        const list = await findByCuisine(lat, lon, cuisine);
        res.json(list);
    } catch (e) {
        console.error(e);
        res.status(502).json({ error: "Failed to fetch restaurants." });
    }
};

