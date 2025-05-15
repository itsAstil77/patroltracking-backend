const express = require("express");
const Workflow = require("../models/workflow");
const Signup = require("../models/signup");
// const Location = require("../models/locationCodes"); //
const Checklist = require('../models/checklist');
const authMiddleware = require("../middleware/authMiddleware"); // Middleware to verify token

const router = express.Router();

// ✅ Function to Generate Next Event ID
const generateWorkflowId = async () => {
    const latestWorkflow = await Workflow.findOne().sort({ createdDate: -1 }); // Sort by createdDate

    let nextNumber = 1;
    if (latestWorkflow && latestWorkflow.workflowId) {
        const match = latestWorkflow.workflowId.match(/\d+/); // Extract numbers
        if (match) {
            nextNumber = parseInt(match[0], 10) + 1;
        }
    }
    return `WF${String(nextNumber).padStart(3, "0")}`;
};

// ✅ Create Event (Requires Token & Valid Admin ID)
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const { workflowTitle, description, createdBy,assignedStart,assignedEnd, isActive } = req.body; // createdBy → adminId

        // ✅ Validate createdBy format (ADM###)
        if (!/^ADM\d{3}$/.test(createdBy)) {
            return res.status(400).json({ success: false, message: "Invalid adminId format. Expected: ADM###" });
        }

        // ✅ Check if adminId exists and belongs to an Admin
        const adminExists = await Signup.findOne({ adminId: createdBy, role: "Admin" });

        if (!adminExists) {
            return res.status(400).json({ success: false, message: "Invalid adminId: Admin does not exist" });
        }
        // const locationExists = await Location.findOne({ locationCode });
        // if (!locationExists) {
        //     return res.status(400).json({ success: false, message: "Invalid locationCode: Location does not exist" });
        // }

        // ✅ Check for duplicate event title
        const existingWorkflow = await Workflow.findOne({ workflowTitle });
        if (existingWorkflow) {
            return res.status(400).json({ success: false, message: "Workflow with the same title already exists" });
        }
        

        // ✅ Generate next WorkflowId
        const workflowId = await generateWorkflowId();

        const newworkflow = new Workflow({
            workflowId,
            workflowTitle,
            // locationCode,
            description,
            createdBy, // Stores the valid adminId
            assignedStart,
            assignedEnd,
            status: "Pending",
            isActive: typeof isActive === "boolean" ? isActive : true
        });

        await newworkflow.save();

        res.status(200).json({ success: true, message: "Workflow created successfully", workflow: newworkflow });
    } catch (error) {
        console.error("❌ Error creating event:", error);
        res.status(500).json({ success: false, message: "Error creating Workflow", error: error.message });
    }
});

router.get("/:workflowId/checklists", authMiddleware, async (req, res) => {
    try {
        const { workflowId } = req.params;  // Get workflowId from the route parameters

        // ✅ Check if the workflow exists and is active
        const workflow = await Workflow.findOne({ workflowId, isActive: true });

        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found or inactive" });
        }

        // ✅ Fetch all active checklists associated with the workflow
        const checklists = await Checklist.find({ workflowId, isActive: true });

        if (!checklists || checklists.length === 0) {
            return res.status(404).json({ success: false, message: "No checklists found for this workflow" });
        }

        // ✅ Return the workflow title along with its checklists
        res.status(200).json({
            success: true,
            workflowTitle: workflow.workflowTitle,
            checklists
        });

    } catch (error) {
        console.error("❌ Error fetching checklists for workflow:", error);
        res.status(500).json({ success: false, message: "Error fetching checklists", error: error.message });
    }
});

// // PUT /workflow/toggle-active/:workflowId
// router.put("/active/:workflowId", authMiddleware, async (req, res) => {
//     try {
//       const { workflowId } = req.params;
//       const { isActive, modifiedBy } = req.body;
  
//       // ✅ Validate workflow exists
//       const workflow = await Workflow.findOne({ workflowId });
//       if (!workflow) {
//         return res.status(404).json({ message: "Workflow not found" });
//       }
  
//       // ✅ Update isActive and modifiedBy
//       workflow.isActive = isActive;
//       workflow.modifiedBy = modifiedBy;
//       workflow.modifiedDate = new Date();
  
//       await workflow.save();
  
//       res.status(200).json({
//         message: `Workflow ${isActive ? "activated" : "deactivated"} successfully`,
//         workflow
//       });
//     } catch (error) {
//       console.error("❌ Error updating workflow active status:", error);
//       res.status(500).json({ message: "Error updating workflow", error: error.message });
//     }
//   });
  

// GET all workflows
router.get("/", authMiddleware, async (req, res) => {
    try {
      const workflows = await Workflow.find(); // latest first  .sort({ createdDate: -1 })
      res.status(200).json({ success: true, workflows });
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });




  // ✅ Update Workflow by workflowId
router.put("/update/:workflowId", authMiddleware, async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { workflowTitle, description, status, modifiedBy, assignedStart, assignedEnd } = req.body;


        // ✅ Validate workflow exists
        const workflow = await Workflow.findOne({ workflowId });
        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        if(workflow.status!="Pending"){
            return res.status(400).json({success:false,message:"cannot update workflow which is not Pending"})
        }

        // // ✅ Validate modifiedBy (must be Admin)
        // const modifier = await Signup.findOne({ adminId: modifiedBy, role: "Admin" });
        // if (!modifier) {
        //     return res.status(400).json({ success: false, message: "Invalid modifier: Admin does not exist" });
        // }

        // ✅ Optional: Prevent duplicate workflowTitle
        if (workflowTitle && workflowTitle !== workflow.workflowTitle) {
            const duplicate = await Workflow.findOne({ workflowTitle });
            if (duplicate) {
                return res.status(400).json({ success: false, message: "Another workflow with this title already exists" });
            }
        }

        // ✅ Update fields if provided
        if (workflowTitle) workflow.workflowTitle = workflowTitle;
        if (description) workflow.description = description;
        if (status) workflow.status = status;
        if (assignedStart) workflow.assignedStart = new Date(assignedStart);
        if (assignedEnd) workflow.assignedEnd = new Date(assignedEnd);
        workflow.modifiedBy = modifiedBy;
        workflow.modifiedDate = new Date();

        await workflow.save();

        res.status(200).json({ success: true, message: "Workflow updated successfully", workflow });
    } catch (error) {
        console.error("❌ Error updating workflow:", error);
        res.status(500).json({ success: false, message: "Error updating workflow", error: error.message });
    }
});



// ✅ Delete Workflow by workflowId
router.delete("/delete/:workflowId", authMiddleware, async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { deletedBy } = req.body;

        // ✅ Validate admin ID
        const admin = await Signup.findOne({ adminId: deletedBy, role: "Admin" });
        if (!admin) {
            return res.status(400).json({ success: false, message: "Invalid adminId: Admin does not exist" });
        }

        // ✅ Check if workflow exists
        const workflow = await Workflow.findOne({ workflowId });
        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        // ✅ Delete the workflow
        await Workflow.deleteOne({ workflowId });

        res.status(200).json({ success: true, message: "Workflow deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting workflow:", error);
        res.status(500).json({ success: false, message: "Error deleting workflow", error: error.message });
    }
});


// POST /workflow/start/:workflowId
router.post("/start/:workflowId", authMiddleware, async (req, res) => {
    const { workflowId } = req.params;
    const { startDateTime } = req.body;

    try {
        const workflow = await Workflow.findOne({ workflowId });

        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        if (workflow.status !== "Pending") {
            return res.status(400).json({ success: false, message: "Workflow already started or completed" });
        }

        // ✅ Ensure checklist(s) exist
        const checklistCount = await Checklist.countDocuments({ workflowId });
        if (checklistCount === 0) {
            return res.status(400).json({ success: false, message: "Cannot start workflow without checklists" });
        }

        // ✅ Validate startDateTime
        if (!startDateTime || isNaN(Date.parse(startDateTime))) {
            return res.status(400).json({ success: false, message: "Invalid or missing startDateTime" });
        }

        // ✅ Update workflow status and timestamp
        workflow.status = "Inprogress";
        workflow.startDateTime = new Date(startDateTime); // store as UTC
        workflow.modifiedDate = new Date();

        await workflow.save();

        res.status(200).json({ success: true, message: "Workflow started successfully", workflow });
    } catch (error) {
        console.error("❌ Error starting workflow:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});


router.post('/done/:workflowId', authMiddleware, async (req, res) => {
    const { workflowId } = req.params;

    try {
        const checklists = await Checklist.find({ workflowId });

        if (checklists.length === 0) {
            return res.status(404).json({ success: false, message: "No checklists found for this workflow" });
        }

        const allCompleted = checklists.every(c => c.status === 'Completed');

        if (allCompleted) {
            const workflow = await Workflow.findOne({ workflowId });

            if (!workflow) {
                return res.status(404).json({ success: false, message: "Workflow not found" });
            }

            const endDateTime = new Date();

            // ✅ Calculate workflowStatus
            let workflowStatus = "Ontime";
            if (workflow.assignedEnd && endDateTime > workflow.assignedEnd) {
                workflowStatus = "Late";
            }

            const updatedWorkflow = await Workflow.findOneAndUpdate(
                { workflowId },
                {
                    $set: {
                        status: "Completed",
                        isActive: false,
                        endDateTime,
                        workflowStatus, // ✅ updated
                        modifiedDate: new Date()
                    }
                },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Workflow marked as Completed",
                workflow: updatedWorkflow
            });
        } else {
            return res.status(200).json({
                success: false,
                message: "Not all checklists are completed. Workflow status unchanged."
            });
        }
    } catch (error) {
        console.error("❌ Error completing workflow:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});




// for getting checklists based on events and patrol id

router.get('/workflow-patrol', async (req, res) => {
    try {
        const { workflowId, patrolId } = req.query;

        // Check if both parameters are provided
        if (!workflowId || !patrolId) {
            return res.status(400).json({ message: "WorkflowId and patrolId are required" });
        }
             // Find checklists with matching workflowId, assignedTo (patrolId), and status 'open'
             const checklists = await Checklist.find({ 
                workflowId, 
                assignedTo: patrolId,
                status: "Open"  // Filter for checklists with status "Open"
            });


        if (checklists.length === 0) {
            return res.status(404).json({ message: "No checklists found for the given Workflow and patrol" });
        }

        res.status(200).json({
            message: "Checklists fetched successfully",
            checklists
        });

    } catch (error) {
        console.error("❌ Error fetching checklists by Workflow and patrol:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.get('/completed', authMiddleware, async (req, res) => {
    try {
        // Fetch all workflows where the status is "Completed"
        const completedWorkflows = await Workflow.find({ status: 'Completed' });

        if (completedWorkflows.length === 0) {
            return res.status(404).json({
                message: "No completed workflows found"
            });
        }

        // Send the response with the list of completed workflows
        res.status(200).json({
            message: "Completed workflows fetched successfully",
            data: completedWorkflows
        });
    } catch (error) {
        console.error("❌ Error fetching completed workflows:", error);
        res.status(500).json({
            message: "Error fetching completed workflows",
            error: error.message
        });
    }
});


router.get('/completed/:patrolId', authMiddleware, async (req, res) => {
    try {
        const { patrolId } = req.params;

        // ✅ Fetch completed workflows only
        const completedWorkflows = await Workflow.find({ status: 'Completed' });

        if (completedWorkflows.length === 0) {
            return res.status(404).json({ message: "No completed workflows found" });
        }

        const result = await Promise.all(
            completedWorkflows.map(async (workflow) => {
                // ✅ Get checklists linked to this workflow AND assigned to the patrol
                const checklists = await Checklist.find({
                    workflowId: workflow.workflowId, // <-- use workflowId for accurate match
                    assignedTo: patrolId
                });

                return checklists.length > 0
                    ? { workflow, checklists }
                    : null;
            })
        );

        const filteredResult = result.filter(item => item !== null);

        if (filteredResult.length === 0) {
            return res.status(404).json({ message: "No completed workflows found for this patrol" });
        }

        res.status(200).json({
            message: "Completed workflows with checklists fetched successfully",
            data: filteredResult
        });

    } catch (error) {
        console.error("❌ Error fetching workflows:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});




module.exports = router