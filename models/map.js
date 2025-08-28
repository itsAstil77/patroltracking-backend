const mongoose = require("mongoose");

const mapSchema = new mongoose.Schema({
  checklistId: { type: String, required: true },
geoCoordinates: {
  type: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
}

});

module.exports = mongoose.model("Map", mapSchema);
