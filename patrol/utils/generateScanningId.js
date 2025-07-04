const Counter = require("../models/counter");
const Scanning = require("../models/scanning");

async function generateScanningId() {
  // 1️⃣ Get highest existing scanId in DB (e.g., SCN007)
  const lastScan = await Scanning
    .findOne({ scanId: { $regex: /^SCN\d{3}$/ } })
    .sort({ scanId: -1 });

  const maxExisting = lastScan
    ? parseInt(lastScan.scanId.replace("SCN", ""), 10)
    : 0;

  // 2️⃣ Sync and increment counter
  const counter = await Counter.findOneAndUpdate(
    { name: "scanId" },
    { $max: { value: maxExisting + 1 } },
    { new: true, upsert: true }
  );

  // 3️⃣ Return formatted scanId
  return `SCN${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateScanningId;
