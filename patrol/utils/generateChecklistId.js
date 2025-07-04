// utils/generateChecklistId.js
const Checklist = require("../models/checklist");
const Counter = require("../models/counter");

async function generateChecklistId() {
  // Step 1: Get the highest existing CHK### in the DB
  const last = await Checklist
    .findOne({ checklistId: { $regex: /^CHK\d{3}$/ } })
    .sort({ checklistId: -1 });

  const maxExisting = last
    ? parseInt(last.checklistId.replace("CHK", ""), 10)
    : 0;

  // Step 2: Sync or increment counter
  const counter = await Counter.findOneAndUpdate(
    { name: "checklistId" },
    { $max: { value: maxExisting + 1 } }, // Ensures counter never goes backward
    { new: true, upsert: true }
  );

  // Step 3: Return the generated ID
  return `CHK${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateChecklistId;
