const Counter = require("../models/counter");
const Multimedia = require("../models/media");

async function generateMultimediaId() {
  // 1️⃣ Find the highest existing multimediaId (e.g., MMD007)
  const last = await Multimedia
    .findOne({ multimediaId: { $regex: /^MMD\d{3}$/ } })
    .sort({ multimediaId: -1 });

  const maxExisting = last
    ? parseInt(last.multimediaId.replace("MMD", ""), 10)
    : 0;

  // 2️⃣ Update the counter safely to be at least maxExisting + 1
  const counter = await Counter.findOneAndUpdate(
    { name: "multimediaId" },
    { $max: { value: maxExisting + 1 } },
    { new: true, upsert: true }
  );

  // 3️⃣ Return new formatted ID
  return `MMD${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateMultimediaId;
