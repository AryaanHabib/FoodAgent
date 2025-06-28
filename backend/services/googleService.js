const axios = require("axios");
const KEY   = process.env.GOOGLE_PLACES_API_KEY;
axios.defaults.timeout = 5000;

const { Client } = require("@googlemaps/google-maps-services-js");
const OpenAI = require("openai");

const PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";


/** Fetch full details for a place_id (minus photos) */
async function fetchDetails(place_id) {
    const resp = await axios.get(
        "https://maps.googleapis.com/maps/api/place/details/json",
        {
            params: {
                key:      KEY,
                place_id: place_id,
                fields: [
                    "place_id",
                    "name",
                    "formatted_address",
                    "geometry",
                    "formatted_phone_number",
                    "opening_hours",
                    "website",
                    "price_level",
                    "rating",
                    "user_ratings_total",
                    "business_status",
                    "permanently_closed",
                    "vicinity"
                ].join(",")
            }
        }
    );
    return resp.data.result;
}

async function enrichPlaces(basics) {
    const details = await Promise.all(
        basics.map(b => fetchDetails(b.place_id))
    );
    return details.map(d => ({
        place_id:           d.place_id,
        name:               d.name,
        address:            d.formatted_address || d.vicinity,
        location:           d.geometry?.location,
        phone:              d.formatted_phone_number || null,
        website:            d.website || null,
        price_level:        d.price_level ?? null,
        rating:             d.rating?.toFixed(1) || null,
        user_ratings_total: d.user_ratings_total ?? null,
        business_status:    d.business_status || null,
        permanently_closed: d.permanently_closed || false,
        opening_hours:      d.opening_hours?.weekday_text || []
    }));
}

exports.findByCuisine = async (lat, lon, cuisine) => {
    let resp = await axios.get(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
        { params: { key:KEY, location:`${lat},${lon}`, radius:10000, type:"restaurant", keyword:`${cuisine} restaurant` } }
    );
    if (!resp.data.results.length) {
        resp = await axios.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            { params: { key:KEY, query:`${cuisine} restaurant`, location:`${lat},${lon}`, radius:10000 } }
        );
    }
    return enrichPlaces(resp.data.results.slice(0,30));
};

