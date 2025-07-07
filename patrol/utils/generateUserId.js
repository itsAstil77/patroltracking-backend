const Signup = require("../models/signup");

async function generateUserId() {
  // Step 1: Find highest existing USR number
  const lastUser = await Signup
    .findOne({ userId: { $regex: /^USR\d{3}$/ } })
    .sort({ userId: -1 }); // Sort descending to get the highest

  const maxNumber = lastUser
    ? parseInt(lastUser.userId.replace("USR", ""), 10)
    : 0;

  // Step 2: Generate next ID
  const nextNumber = maxNumber + 1;
  return `USR${String(nextNumber).padStart(3, "0")}`;
}

module.exports = generateUserId;
