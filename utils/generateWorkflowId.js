const Workflow = require("../models/workflow");

async function generateWorkflowId() {
  // Step 1: Find the workflow with the highest number
  const latest = await Workflow
    .findOne({ workflowId: { $regex: /^WF\d{3}$/ } })
    .sort({ workflowId: -1 });

  const lastNumber = latest
    ? parseInt(latest.workflowId.replace("WF", ""), 10)
    : 0;

  const nextNumber = lastNumber + 1;

  return `WF${String(nextNumber).padStart(3, "0")}`;
}

module.exports = generateWorkflowId;
