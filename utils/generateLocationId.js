const Location = require("../models/locationCodeMaster");

async function generateLocationId() {
  // 1️⃣ Find the highest existing locationId like LOC###
  const last = await Location
    .findOne({ locationId: { $regex: /^LOC\d{3}$/ } })
    .sort({ locationId: -1 }); // Sort descending to get the highest ID

  // 2️⃣ Extract the number and compute next
  const maxExisting = last
    ? parseInt(last.locationId.replace("LOC", ""), 10)
    : 0;

  // 3️⃣ Return the next formatted ID
  const nextId = maxExisting + 1;
  return `LOC${String(nextId).padStart(3, "0")}`;
}

module.exports = generateLocationId;
