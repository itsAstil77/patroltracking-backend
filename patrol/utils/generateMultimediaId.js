const Multimedia = require("../models/media");

async function generateMultimediaId() {
  // 1️⃣ Find the highest existing multimediaId (e.g., MMD007)
  const last = await Multimedia
    .findOne({ multimediaId: { $regex: /^MMD\d{3}$/ } })
    .sort({ multimediaId: -1 }); // Highest ID first

  // 2️⃣ Extract and increment the number
  const maxExisting = last
    ? parseInt(last.multimediaId.replace("MMD", ""), 10)
    : 0;

  // 3️⃣ Return next formatted ID
  const nextId = maxExisting + 1;
  return `MMD${String(nextId).padStart(3, "0")}`;
}

module.exports = generateMultimediaId;
