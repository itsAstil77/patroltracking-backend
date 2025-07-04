const Counter = require("../models/counter");
const Signup = require("../models/signup");

async function generateUserId() {
  // Step 1: Get the highest existing userId in Signup collection
  const lastUser = await Signup
    .findOne({ userId: { $regex: /^USR\d{3}$/ } })
    .sort({ userId: -1 });

  const maxExisting = lastUser
    ? parseInt(lastUser.userId.replace("USR", ""), 10)
    : 0;

  // Step 2: Sync counter to at least (maxExisting + 1)
  const counter = await Counter.findOneAndUpdate(
    { name: "userId" },
    { $max: { value: maxExisting + 1 } },
    { new: true, upsert: true }
  );

  // Step 3: Return padded ID
  return `USR${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateUserId;
