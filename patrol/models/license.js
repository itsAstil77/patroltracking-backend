const mongoose = require("mongoose");

const licenseSchema = new mongoose.Schema({
  serialNumber: { type: String, required: true },
  deviceId: { type: String, required: true },
  uniqueKey: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("License", licenseSchema);
