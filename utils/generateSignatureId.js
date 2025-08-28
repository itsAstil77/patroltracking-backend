const Signature = require("../models/signature");

async function generateSignatureId() {
  // Step 1: Find the signature with the highest ID
  const lastSig = await Signature
    .findOne({ signatureId: { $regex: /^SIG\d{3}$/ } })
    .sort({ signatureId: -1 }); // Sort descending

  // Step 2: Extract number
  const maxExisting = lastSig
    ? parseInt(lastSig.signatureId.replace("SIG", ""), 10)
    : 0;

  // Step 3: Return next padded ID
  return `SIG${String(maxExisting + 1).padStart(3, "0")}`;
}

module.exports = generateSignatureId;
