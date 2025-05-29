const express = require('express');
const router = express.Router();
const Checklist = require('../models/checklist');
const Workflow = require('../models/workflow');
const Location = require('../models/locationCodeMaster');
const Signup = require('../models/signup'); // Import Signup model
const authMiddleware = require('../middleware/authMiddleware');

// Function to generate the next checklistId
async function generateChecklistId() {
    const lastChecklist = await Checklist.findOne().sort({ createdDate: -1 });
    if (!lastChecklist || !lastChecklist.checklistId) {
        return 'CHK001';
    }
    const lastIdNum = parseInt(lastChecklist.checklistId.replace('CHK', ''), 10);
    const nextIdNum = lastIdNum + 1;
    return `CHK${nextIdNum.toString().padStart(3, '0')}`;
}

// ✅ Create a new checklist
router.post('/',authMiddleware, async (req, res) => {
    try {
        const { workflowId, title, remarks, createdBy, startDateTime, endDateTime, isActive } = req.body;

        // ✅ Validate eventId
        const workflowExists = await Workflow.findOne({ workflowId });
        if (!workflowExists) {
            return res.status(400).json({ message: 'Invalid assignmentId: assignment does not exist' });
        }

        // // ✅ Validate locationCode
        // const locationExists = await Location.findOne({ locationCode });
        // if (!locationExists) {
        //     return res.status(400).json({ message: 'Invalid locationCode: Location does not exist' });
        // }

        // // ✅ Validate assignedBy (Check if it exists and is an admin)
        // const adminExists = await Signup.findOne({ adminId: assignedBy, role: "Admin" });
        // if (!adminExists) {
        //     return res.status(400).json({ message: 'Invalid assignedBy: Admin does not exist' });
        // }

        // // ✅ Validate assignedTo (Check if it exists and is a patrol)
        // const patrolExists = await Signup.findOne({ patrolId: assignedTo, role: "Patrol" });
        // if (!patrolExists) {
        //     return res.status(400).json({ message: 'Invalid assignedTo: Patrol does not exist' });
        // }


        // ✅ Validate createdBy format (USR###)
        if (!/^USR\d{3}$/.test(createdBy)) {
            return res.status(400).json({ message: 'Invalid createdBy format. Expected: USR###' });
        }

        // ✅ Validate createdBy exists (any user)
        const createdByUser = await Signup.findOne({ userId: createdBy });

        if (!createdByUser) {
            return res.status(400).json({ message: 'Invalid createdBy: User does not exist' });
        }


        // ✅ Generate the next checklistId
        const checklistId = await generateChecklistId();

        // ✅ Set status to "Open" if assignedTo exists
        // const checklistStatus = "Open";

        // ✅ Create checklist entry
        const newChecklist = new Checklist({
            checklistId,
            workflowId,
            title,
            remarks,
            // status, // Auto-updated based on assignedTo
            // assignedTo,
            // assignedBy,
            createdBy, // ✅ Store the valid Admin/Patrol ID
            startDateTime,
            endDateTime,
            isActive
        });

        const savedChecklist = await newChecklist.save();

        res.status(200).json({
            message: 'task added successfully',
            checklist: savedChecklist
        });
    } catch (error) {
        console.error("❌ Error adding task:", error);
        res.status(500).json({ message: 'Error adding task', error: error.message });
    }
});



// routes/checklist.js
router.put('/assign', authMiddleware,async (req, res) => {
    try {
        const { checklistIds, assignedTo, assignedBy } = req.body;

        if (!Array.isArray(checklistIds) || checklistIds.length === 0) {
            return res.status(400).json({ message: 'taskIds must be a non-empty array' });
        }

        // ✅ Validate assignedTo user is not an Admin
        const assignedUser = await Signup.findOne({ userId: assignedTo, role: { $ne: 'Admin' } });
        if (!assignedUser) {
            return res.status(400).json({ message: 'Invalid user ID (assignedTo) or user is an Admin' });
        }


        // ✅ Validate admin
        const admin = await Signup.findOne({ userId: assignedBy, role: 'Admin' });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid admin ID (assignedBy)' });
        }

            // ✅ Get patrol's locationName
            const locationName = assignedUser.locationName;

                    // ✅ Find locationCode using locationName
            const location = await Location.findOne({ description: locationName });
            if (!location) {
                return res.status(400).json({ message: 'Location not found for the patrol' });
            }
            const locationCode = location.locationCode;

        // ✅ Find all checklists and update them
        const checklists = await Checklist.find({ checklistId: { $in: checklistIds } });

        if (checklists.length !== checklistIds.length) {
            return res.status(404).json({ message: 'Some task IDs were not found' });
        }
             // ✅ Filter out any checklists that are not "Unassigned"
             const invalidChecklists = checklists.filter(cl => cl.status !== 'Unassigned');
             if (invalidChecklists.length > 0) {
                 return res.status(400).json({
                     message: 'Only tasks with status "Unassigned" can be assigned',
                     invalidChecklistIds: invalidChecklists.map(cl => cl.checklistId)
                 });
             }


        // ✅ Update each checklist
        const updatePromises = checklists.map((checklist) => {
            checklist.assignedTo = assignedTo;
            checklist.assignedBy = assignedBy;
            checklist.status = 'Open'; // or "Assigned"
            checklist.locationName = locationName; // 
            checklist.locationCode = locationCode;
            return checklist.save();
        });

        await Promise.all(updatePromises);

        res.status(200).json({ message: 'tasks assigned successfully', checklistIds });
    } catch (error) {
        console.error('❌ Error in bulk assigning tasks:', error);
        res.status(500).json({ message: 'Error assigning tasks', error: error.message });
    }
});



// GET /checklists/workflow/:workflowId - Get all checklists for a specific workflow
router.get("/:workflowId", authMiddleware, async (req, res) => {
    try {
      const { workflowId } = req.params;
  
      const checklists = await Checklist.find({ workflowId });
  
      if (checklists.length === 0) {
        return res.status(404).json({ message: "No tasks found for the given workflowId" });
      }
  
      res.status(200).json({ success: true, checklists });
    } catch (error) {
      console.error("❌ Error fetching tasks:", error);
      res.status(500).json({ success: false, message: "Error fetching tasks", error: error.message });
    }
  });

  

  // PATCH /checklists/end/:checklistId
router.patch("/end/:checklistId", authMiddleware, async (req, res) => {
    try {
      const { checklistId } = req.params;
  
      const updatedChecklist = await Checklist.findOneAndUpdate(
        { checklistId },
        {
          $set: {
            scanEndDate: new Date(), // set to now
            modifiedDate: new Date(),
            modifiedBy: req.user?.username || "System",
          },
        },
        { new: true }
      );
  
      if (!updatedChecklist) {
        return res.status(404).json({ message: "task not found" });
      }
  
      res.status(200).json({
        success: true,
        message: "End datetime recorded",
        scanEndDate: updatedChecklist.scanEndDate,
      });
    } catch (error) {
      console.error("❌ Error updating end datetime:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  

router.get('/assigned', authMiddleware, async (req, res) => {
    try {
        const { assignedTo, status, isActive } = req.query; // Extract query parameters

        // Validate the presence of required query parameters
        if (!assignedTo || !status || !isActive) {
            return res.status(400).json({ message: "assignedTo, status and isActive are required" });
        }

        // Fetch checklists matching the provided parameters
        const checklists = await Checklist.find({
            assignedTo,
            status,
            isActive
        });

        // If no checklists are found, return a not found response
        if (checklists.length === 0) {
            return res.status(404).json({ message: "No tasks found matching the provided criteria" });
        }

        // Return the fetched checklists
        res.status(200).json({
            message: 'tasks retrieved successfully',
            checklists
        });
    } catch (error) {
        console.error("❌ Error fetching tasks:", error);
        res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
});

// ✅ Update Checklist by checklistId (only if status is "Open")
router.put("/update/:checklistId", authMiddleware, async (req, res) => {
    try {
        const { checklistId } = req.params;
        const {
            title,
            remarks,
            assignedTo,
            assignedBy,
            // startDateTime,
            // endDateTime,
            modifiedBy,
            isActive
        } = req.body;

        // ✅ Find checklist
        const checklist = await Checklist.findOne({ checklistId });
        if (!checklist) {
            return res.status(404).json({ success: false, message: "task not found" });
        }

        // ❌ Block update if status is not "Open"
        if (checklist.status !== "Open") {
            return res.status(403).json({
                success: false,
                message: `task cannot be updated because its status is "${checklist.status}". Only 'Open' task can be edited.`
            });
        }

        // ✅ Proceed with update validations (same as before)

        // if (workflowId && workflowId !== checklist.workflowId) {
        //     const workflowExists = await Workflow.findOne({ workflowId });
        //     if (!workflowExists) {
        //         return res.status(400).json({ success: false, message: "Invalid workflowId" });
        //     }
        //     checklist.workflowId = workflowId;
        // }

        // if (locationCode && locationCode !== checklist.locationCode) {
        //     const locationExists = await Location.findOne({ locationCode });
        //     if (!locationExists) {
        //         return res.status(400).json({ success: false, message: "Invalid locationCode" });
        //     }
        //     checklist.locationCode = locationCode;
        // }

        if (assignedBy && assignedBy !== checklist.assignedBy) {
            const adminExists = await Signup.findOne({ userId: assignedBy, role: "Admin" });
            if (!adminExists) {
                return res.status(400).json({ success: false, message: "Invalid assignedBy" });
            }
            checklist.assignedBy = assignedBy;
        }

        if (assignedTo && assignedTo !== checklist.assignedTo) {
            const userExists = await Signup.findOne({ userId: assignedTo, role: { $ne: "Admin" } });
            if (!userExists) {
                return res.status(400).json({ success: false, message: "Invalid assignedTo: must be a non-admin user" });
            }
            checklist.assignedTo = assignedTo;
        }
        

        // ✅ Update fields
        if (title) checklist.title = title;
        if (remarks) checklist.remarks = remarks;
        // if (status) checklist.status = status;
        // if (startDateTime) checklist.startDateTime = new Date(startDateTime);
        // if (endDateTime) checklist.endDateTime = new Date(endDateTime);
        if (typeof isActive === 'boolean') checklist.isActive = isActive;

        // ✅ Validate modifiedBy is a valid admin in Signup
        if (!modifiedBy) {
            return res.status(400).json({ success: false, message: "modifiedBy is required" });
        }

        const admin = await Signup.findOne({ userId: modifiedBy, role: "Admin" });
        if (!admin) {
            return res.status(400).json({ success: false, message: "Invalid modifiedBy: admin not found" });
        }

        checklist.modifiedBy = modifiedBy;

        checklist.modifiedDate = new Date();


        await checklist.save();

        res.status(200).json({
            success: true,
            message: "task updated successfully",
            checklist
        });
    } catch (error) {
        console.error("❌ Error updating task:", error);
        res.status(500).json({ success: false, message: "Error updating task", error: error.message });
    }
});



// getting events and checklists for a patrol id 
router.get('/grouped/:userId', authMiddleware, async (req, res) => {
    try {
    const { userId } = req.params;
    
    
        // Fetch all checklists assigned to the given patrolId
        const checklists = await Checklist.find({ assignedTo: userId });
    
        if (!checklists || checklists.length === 0) {
            return res.status(404).json({
                message: "No tasks found for this patrolId."
            });
        }
    
        const groupedByWorkflow = {};
    
        // Group checklists by their respective workflow
        for (const checklist of checklists) {
            const workflow = await Workflow.findOne({ workflowId: checklist.workflowId });
            if (!workflow) continue;
    
            // Initialize the workflow if not already done
            if (!groupedByWorkflow[checklist.workflowId]) {
                groupedByWorkflow[checklist.workflowId] = {
                    workflowId: workflow.workflowId,
                    workflowTitle: workflow.workflowTitle,
                    locationCode: workflow.locationCode,
                    isActive: workflow.isActive,
                    status: workflow.status,
                    AssignedStart:workflow.assignedStart,
                    AssignedEnd:workflow.assignedEnd,
                    checklists: []
                };
            }
    
            // Push checklist data under the corresponding workflow
            groupedByWorkflow[checklist.workflowId].checklists.push({
                checklistId: checklist.checklistId,
                title: checklist.title,
                status: checklist.status,
                locationCode: checklist.locationCode,
                startDateTime: checklist.startDateTime,
                endDateTime: checklist.endDateTime,
                isActive: checklist.isActive
            });
        }
    
        const groupedArray = Object.values(groupedByWorkflow);
    
        res.status(200).json({
            message: "Grouped tasks by Workflow fetched successfully",
            data: groupedArray
        });
    
    } catch (error) {
        console.error("❌ Error grouping tasks:", error);
        res.status(500).json({ message: "Error fetching grouped tasks", error: error.message });
    }
    
    
    });
   
    

// ✅ Update checklist status from Open to Completed
router.put('/complete', authMiddleware, async (req, res) => {
    try {
        const { checklistIds } = req.body; // Array of checklistIds
        
        if (!checklistIds || checklistIds.length === 0) {
            return res.status(400).json({ message: "task IDs are required" });
        }

        // ✅ Update status to "Completed" for given checklistIds
        const result = await Checklist.updateMany(
            { checklistId: { $in: checklistIds }, status: "Open" }, // Only update if status is Open
            { $set: { status: "Completed",isActive:false, modifiedDate: new Date() } }
        );

        res.status(200).json({
            message: "task(s) marked as Completed successfully",
            modifiedCount: result.nModified
        });
    } catch (error) {
        console.error("❌ Error updating task status:", error);
        res.status(500).json({ message: "Error updating task status", error: error.message });
    }
});





module.exports = router;
