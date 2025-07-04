const express = require("express");
const Workflow = require("../models/workflow");
const Signup = require("../models/signup");
// const Location = require("../models/locationCodes"); //
const Checklist = require('../models/checklist');
const authMiddleware = require("../middleware/authMiddleware"); // Middleware to verify token
const generateWorkflowId = require("../utils/generateWorkflowId");


const router = express.Router();


// ✅ Create Event (Requires Token & Valid Admin ID)
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const { workflowTitle, description, createdBy,assignedStart,assignedEnd, isActive } = req.body; // createdBy → adminId
           // Validate createdBy format (adjust regex to your userId format)
        if (!/^USR\d{3}$/.test(createdBy)) {
            return res.status(400).json({ success: false, message: "Invalid createdBy format. Expected: USR###" });
        }
            
            // Check if user exists AND role is Admin
            const user = await Signup.findOne({ userId:createdBy, role: "Admin" });
            
            if (!user) {
                return res.status(400).json({ success: false, message: "Invalid userId: User does not exist or is not an Admin" });
            }
        // const locationExists = await Location.findOne({ locationCode });
        // if (!locationExists) {
        //     return res.status(400).json({ success: false, message: "Invalid locationCode: Location does not exist" });
        // }

        // ✅ Check for duplicate event title
        const existingWorkflow = await Workflow.findOne({ workflowTitle });
        if (existingWorkflow) {
            return res.status(400).json({ success: false, message: "assignment with the same title already exists" });
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

        res.status(200).json({ success: true, message: "assignment created successfully", workflow: newworkflow });
    } catch (error) {
        console.error("❌ Error creating event:", error);
        res.status(500).json({ success: false, message: "Error creating assignment", error: error.message });
    }
});

router.get("/:workflowId/checklists", authMiddleware, async (req, res) => {
    try {
        const { workflowId } = req.params;  // Get workflowId from the route parameters

        // ✅ Check if the workflow exists and is active
        const workflow = await Workflow.findOne({ workflowId, isActive: true });

        if (!workflow) {
            return res.status(404).json({ success: false, message: "assignment not found or inactive" });
        }

        // ✅ Fetch all active checklists associated with the workflow
        const checklists = await Checklist.find({ workflowId, isActive: true });

        if (!checklists || checklists.length === 0) {
            return res.status(404).json({ success: false, message: "No tasks found for this assignment" });
        }

        // ✅ Return the workflow title along with its checklists
        res.status(200).json({
            success: true,
            workflowTitle: workflow.workflowTitle,
            checklists
        });

    } catch (error) {
        console.error("❌ Error fetching tasks for assignment:", error);
        res.status(500).json({ success: false, message: "Error fetching tasks", error: error.message });
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
  

// GET all workflows with pagination
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;     // Default to page 1
    const limit = parseInt(req.query.limit) || 10;  // Default to 10 per page
    const skip = (page - 1) * limit;

    const totalCount = await Workflow.countDocuments();
    const workflows = await Workflow.find()
      .sort({ createdDate: -1 }) // Optional: sort by latest
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      pagination: {
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        pageSize: limit
      },
      workflows
    });
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
            return res.status(404).json({ success: false, message: "assignment not found" });
        }

        if(workflow.status!="Pending"){
            return res.status(400).json({success:false,message:"cannot update assignment which is not Pending"})
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
                return res.status(400).json({ success: false, message: "Another assignment with this title already exists" });
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

        res.status(200).json({ success: true, message: "assignment updated successfully", workflow });
    } catch (error) {
        console.error("❌ Error updating assignment:", error);
        res.status(500).json({ success: false, message: "Error updating assignment", error: error.message });
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
            return res.status(404).json({ success: false, message: "assignment not found" });
        }

        // ✅ Delete the workflow
        await Workflow.deleteOne({ workflowId });

        res.status(200).json({ success: true, message: "assignment deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting assignment:", error);
        res.status(500).json({ success: false, message: "Error deleting assignment", error: error.message });
    }
});


// POST /workflow/start/:workflowId
router.post("/start/:workflowId", authMiddleware, async (req, res) => {
    const { workflowId } = req.params;
    const { startDateTime , startCoordinate} = req.body;

    try {
        const workflow = await Workflow.findOne({ workflowId });

        if (!workflow) {
            return res.status(404).json({ success: false, message: "assignment not found" });
        }

        if (workflow.status !== "Pending") {
            return res.status(400).json({ success: false, message: "assignment already started or completed" });
        }

        // ✅ Ensure checklist(s) exist
        const checklistCount = await Checklist.countDocuments({ workflowId });
        if (checklistCount === 0) {
            return res.status(400).json({ success: false, message: "Cannot start assignment without checklists" });
        }

        // ✅ Validate startDateTime
        if (!startDateTime || isNaN(Date.parse(startDateTime))) {
            return res.status(400).json({ success: false, message: "Invalid or missing startDateTime" });
        }

        // ✅ Update workflow status and timestamp
        workflow.status = "Inprogress";
        workflow.startCoordinate = startCoordinate || null; 
        workflow.startDateTime = new Date(startDateTime); // store as UTC
        workflow.modifiedDate = new Date();

        await workflow.save();

        res.status(200).json({ success: true, message: "assignment started successfully", workflow });
    } catch (error) {
        console.error("❌ Error starting assignment:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});


router.post('/done/:workflowId', authMiddleware, async (req, res) => {
    const { workflowId } = req.params;
    const { endCoordinate } = req.body; 

    try {
        const checklists = await Checklist.find({ workflowId });

        if (checklists.length === 0) {
            return res.status(404).json({ success: false, message: "No tasks found for this assignment" });
        }

        const allCompleted = checklists.every(c => c.status === 'Completed'|| c.status === 'Completed with MME');

        if (allCompleted) {
            const workflow = await Workflow.findOne({ workflowId });

            if (!workflow) {
                return res.status(404).json({ success: false, message: "assignment not found" });
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
                        endCoordinate: endCoordinate || workflow.endCoordinate || null,
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
                message: "assignment marked as Completed",
                workflow: updatedWorkflow
            });
        } else {
            return res.status(200).json({
                success: false,
                message: "Not all tasks are completed. assignment status unchanged."
            });
        }
    } catch (error) {
        console.error("❌ Error completing assignment:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});




// for getting checklists based on events and patrol id

router.get('/workflow-patrol',authMiddleware, async (req, res) => {
    try {
        const { workflowId, userId } = req.query;

        // Check if both parameters are provided
        if (!workflowId || !userId) {
            return res.status(400).json({ message: "assignmentId and useridId are required" });
        }
             // Find checklists with matching workflowId, assignedTo (patrolId), and status 'open'
             const checklists = await Checklist.find({ 
                workflowId, 
                assignedTo: userId,
                status: "Open"  // Filter for checklists with status "Open"
            });


        if (checklists.length === 0) {
            return res.status(404).json({ message: "No tasks found for the given assignment and patrol" });
        }

        res.status(200).json({
            message: "tasks fetched successfully",
            checklists
        });

    } catch (error) {
        console.error("❌ Error fetching tasks by assignment and patrol:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.get('/completed', authMiddleware, async (req, res) => {
    try {
        // Fetch all workflows where the status is "Completed"
        const completedWorkflows = await Workflow.find({ status: 'Completed' });

        if (completedWorkflows.length === 0) {
            return res.status(404).json({
                message: "No completed assignment found"
            });
        }

        // Send the response with the list of completed workflows
        res.status(200).json({
            message: "Completed assignment fetched successfully",
            data: completedWorkflows
        });
    } catch (error) {
        console.error("❌ Error fetching completed assignment:", error);
        res.status(500).json({
            message: "Error fetching completed assignment",
            error: error.message
        });
    }
});


router.get('/completed/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        // ✅ Fetch completed workflows only
        const completedWorkflows = await Workflow.find({ status: 'Completed' });

        if (completedWorkflows.length === 0) {
            return res.status(404).json({ message: "No completed assignment found" });
        }

        const result = await Promise.all(
            completedWorkflows.map(async (workflow) => {
                // ✅ Get checklists linked to this workflow AND assigned to the patrol
                const checklists = await Checklist.find({
                    workflowId: workflow.workflowId, // <-- use workflowId for accurate match
                    assignedTo: userId
                });

                return checklists.length > 0
                    ? { workflow, checklists }
                    : null;
            })
        );

        const filteredResult = result.filter(item => item !== null);

        if (filteredResult.length === 0) {
            return res.status(404).json({ message: "No completed assignment found for this patrol" });
        }

        res.status(200).json({
            message: "Completed assignment with tasks fetched successfully",
            data: filteredResult
        });

    } catch (error) {
        console.error("❌ Error fetching assignment:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

// ✅ Copy workflow and its checklists
router.post('/copy/:workflowId', authMiddleware, async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { createdBy } = req.body; // adminId making the copy

        // ✅ Validate admin
        const admin = await Signup.findOne({ adminId: createdBy, role: "Admin" });
        if (!admin) {
            return res.status(400).json({ success: false, message: "Invalid adminId" });
        }

        // ✅ Get the original workflow
        const originalWorkflow = await Workflow.findOne({ workflowId });
        if (!originalWorkflow) {
            return res.status(404).json({ success: false, message: "Original assignment not found" });
        }

        // ✅ Generate new workflowId
        const newWorkflowId = await generateWorkflowId();

        // ✅ Create copied workflow
        const copiedWorkflow = new Workflow({
            workflowId: newWorkflowId,
            workflowTitle: `${originalWorkflow.workflowTitle} (Copy)`,
            description: originalWorkflow.description,
            createdBy: createdBy,
            assignedStart: originalWorkflow.assignedStart,
            assignedEnd: originalWorkflow.assignedEnd,
            status: "Pending",
            isActive: true,
        });

        await copiedWorkflow.save();

        // ✅ Find all checklists under the original workflow
        const checklists = await Checklist.find({ workflowId });

        // ✅ Copy each checklist
        const copiedChecklists = [];
        for (const checklist of checklists) {
            const newChecklistId = await generateChecklistId();
            const newChecklist = new Checklist({
                checklistId: newChecklistId,
                workflowId: newWorkflowId,
                title: checklist.title,
                remarks: checklist.remarks,
                createdBy: createdBy, // You can keep original if needed
                startDateTime: checklist.startDateTime,
                endDateTime: checklist.endDateTime,
                isActive: checklist.isActive,
            });
            await newChecklist.save();
            copiedChecklists.push(newChecklist);
        }

        res.status(200).json({
            success: true,
            message: "assignment and tasks copied successfully",
            workflow: copiedWorkflow,
            checklists: copiedChecklists
        });
    } catch (error) {
        console.error("❌ Error copying assignment:", error);
        res.status(500).json({ success: false, message: "Error copying assignment", error: error.message });
    }
});



module.exports = router