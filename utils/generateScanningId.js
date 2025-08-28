const Scanning = require("../models/scanning");

async function generateScanningId() {
  // Step 1: Find the highest existing SCN### in DB
  const lastScan = await Scanning
    .findOne({ scanId: { $regex: /^SCN\d{3}$/ } })
    .sort({ scanId: -1 });

  // Step 2: Extract the number
  const maxExisting = lastScan
    ? parseInt(lastScan.scanId.replace("SCN", ""), 10)
    : 0;

  // Step 3: Return next padded ID
  const nextId = maxExisting + 1;
  return `SCN${String(nextId).padStart(3, "0")}`;
}

module.exports = generateScanningId;
