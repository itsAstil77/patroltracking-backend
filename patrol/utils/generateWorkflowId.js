const Counter = require("../models/counter");
const Workflow = require("../models/workflow"); // Assuming this is the model name

async function generateWorkflowId() {
  // Step 1: Find the highest existing workflowId in DB (e.g., WF001, WF002...)
  const lastWorkflow = await Workflow
    .findOne({ workflowId: { $regex: /^WF\d{3}$/ } })
    .sort({ workflowId: -1 });

  const maxExisting = lastWorkflow
    ? parseInt(lastWorkflow.workflowId.replace("WF", ""), 10)
    : 0;

  // Step 2: Sync counter to be at least maxExisting + 1
  const counter = await Counter.findOneAndUpdate(
    { name: "workflowId" },
    { $max: { value: maxExisting + 1 } },
    { new: true, upsert: true }
  );

  // Step 3: Return padded ID
  return `WF${String(counter.value).padStart(3, "0")}`;
}

module.exports = generateWorkflowId;
