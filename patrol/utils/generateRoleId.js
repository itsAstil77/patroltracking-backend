const Role = require("../models/role");

async function generateRoleId() {
  // Step 1: Get the role with highest ID (e.g., ROL009)
  const last = await Role
    .findOne({ roleId: { $regex: /^ROL\d{3}$/ } })
    .sort({ roleId: -1 }); // Sort in descending order

  // Step 2: Extract number part
  const maxExisting = last
    ? parseInt(last.roleId.replace("ROL", ""), 10)
    : 0;

  // Step 3: Generate next ID
  const nextId = maxExisting + 1;
  return `ROL${String(nextId).padStart(3, "0")}`;
}

module.exports = generateRoleId;
