const { getAllSettings, updateSetting } = require("../services/settings");

// GET /api/admin/settings
const getSettings = async (req, res) => {
  try {
    res.status(200).json({ settings: await getAllSettings() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/admin/settings/:key   body: { enabled?: boolean, markupPercent?: number }
const patchSetting = async (req, res) => {
  try {
    const setting = await updateSetting(req.params.key, req.body);
    res.status(200).json({ message: "Saved", setting });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = { getSettings, patchSetting };