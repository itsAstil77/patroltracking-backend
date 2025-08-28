const Checklist = require("../models/checklist");

async function generateChecklistId() {
  // Step 1: Find the highest existing CHK### in DB
  const last = await Checklist
    .findOne({ checklistId: { $regex: /^CHK\d{3}$/ } })
    .sort({ checklistId: -1 }); // Descending sort to get highest

  // Step 2: Extract number and compute next
  const maxExisting = last
    ? parseInt(last.checklistId.replace("CHK", ""), 10)
    : 0;

  // Step 3: Return formatted next ID
  const nextId = maxExisting + 1;
  return `CHK${String(nextId).padStart(3, "0")}`;
}

module.exports = generateChecklistId;
