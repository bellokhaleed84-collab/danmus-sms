const axios = require("axios");

const FIVESIM_BASE = "https://5sim.net/v1";

const fivesimAPI = axios.create({
  baseURL: FIVESIM_BASE,
  headers: {
    Authorization: `Bearer ${process.env.FIVESIM_API_KEY}`,
    Accept: "application/json",
  },
});

module.exports = fivesimAPI;