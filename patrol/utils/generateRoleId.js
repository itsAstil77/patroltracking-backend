// utils/generateRoleId.js
const Role = require("../models/role");
const Counter = require("../models/counter");

async function generateRoleId() {
  // Step 1: Get max from DB (existing documents)
  const last = await Role
    .findOne({ roleId: { $regex: /^ROL\d{3}$/ } })
    .sort({ roleId: -1 });

  const maxExisting = last
    ? parseInt(last.roleId.replace("ROL", ""), 10)
    : 0;

  // Step 2: Get counter
  const counter = await Counter.findOneAndUpdate(
    { name: "roleId" },
    { $max: { value: maxExisting + 1 } }, // Set only if higher
    { new: true, upsert: true }
  );

  // Step 3: Return formatted ID
  return `ROL${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateRoleId;
