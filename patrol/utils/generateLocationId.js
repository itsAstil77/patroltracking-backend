// utils/generateLocationId.js
const Counter = require("../models/counter");
const Location = require("../models/locationCodeMaster");

async function generateLocationId() {
  // 1️⃣ Find the current highest locationId like LOC###
  const last = await Location
    .findOne({ locationId: { $regex: /^LOC\d{3}$/ } })
    .sort({ locationId: -1 });

  const maxExisting = last
    ? parseInt(last.locationId.replace("LOC", ""), 10)
    : 0;

  // 2️⃣ Ensure counter starts from higher than existing
  const counter = await Counter.findOneAndUpdate(
    { name: "locationId" },
    { $max: { value: maxExisting + 1 } }, // ensures counter never goes backward
    { new: true, upsert: true }
  );

  // 3️⃣ Format and return the new ID
  return `LOC${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateLocationId;
