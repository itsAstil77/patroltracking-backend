const Counter = require("../models/counter");
const Signature = require("../models/signature");

async function generateSignatureId() {
  // Step 1: Find highest SIG### in DB
  const lastSig = await Signature
    .findOne({ signatureId: { $regex: /^SIG\d{3}$/ } })
    .sort({ signatureId: -1 });

  const maxExisting = lastSig
    ? parseInt(lastSig.signatureId.replace("SIG", ""), 10)
    : 0;

  // Step 2: Sync with counter
  const counter = await Counter.findOneAndUpdate(
    { name: "signatureId" },
    { $max: { value: maxExisting + 1 } },
    { new: true, upsert: true }
  );

  // Step 3: Return formatted ID
  return `SIG${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateSignatureId;
