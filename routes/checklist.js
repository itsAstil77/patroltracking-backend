const express = require('express');
const router = express.Router();
const Checklist = require('../models/checklist');
const Workflow = require('../models/workflow');
const Location = require('../models/locationCodeMaster');
const Signup = require('../models/signup'); // Import Signup model
const authMiddleware = require('../middleware/authMiddleware');
const Multimedia = require("../models/media");
const generateChecklistId = require('../utils/generateChecklistId'); 
// ✅ Create a new checklist
router.post('/',authMiddleware, async (req, res) => {
    try {
        const { workflowId, title, remarks, createdBy, startDateTime, endDateTime,  isActive, } = req.body;    
        // latitude,longitude,locationName,locationCode,ETA,coordinates,

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
            return res.status(400).json({ message: 'Invalid createdBy format' });
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
            createdBy, // ✅ Store the valid Admin/Patrol ID
            startDateTime,
            endDateTime,
            // coordinates,
            // latitude,
            // longitude,
            // locationName,
            // locationCode,
            // ETA,
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
// routes/checklist.js
router.put('/assign',async (req, res) => {
    try {
        const { checklistIds, assignedTo, assignedBy } = req.body;

        if (!Array.isArray(checklistIds) || checklistIds.length === 0) {
            return res.status(400).json({ message: 'Select tasks to Assign to a User' });
        }

        // ✅ Validate assigned users (all must be Patrols, not Admins)
        const assignedUsers = await Signup.find({
        userId: { $in: assignedTo },
        role: { $ne: 'Admin' }
        });

        if (assignedUsers.length !== assignedTo.length) {
        return res.status(400).json({ message: 'One or more users are invalid or Admins' });
        }

        // ✅ Validate admin
        const admin = await Signup.findOne({ userId: assignedBy, role: 'Admin' });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid admin ID s' });
        }

    //         // ✅ Get patrol's locationId
    //         const patrolLocationId = assignedUser.locationId;

    //                 // ✅ Find locationCode using locationName
    //         const location = await Location.findOne({ locationId:patrolLocationId});
    // if (!location) {
    //   return res.status(400).json({ message: 'Location not found for the patrol' });
    // }
    // const locationCode = location.locationCode;

    // ✅ Collect all unique locationIds for the patrols
    const patrolLocationIds = [...new Set(assignedUsers.flatMap(u => u.locationId))];

// ✅ Fetch all matching location documents
const locations = await Location.find({ locationId: { $in: patrolLocationIds } });

if (locations.length !== patrolLocationIds.length) {
    return res.status(400).json({ message: 'Some locationIds for the user are invalid or missing' });
}

// ✅ Extract all locationCodes
const locationCodes = locations.map(loc => loc.locationCode);
const locationNames = patrolLocationIds.map(id => {
  const loc = locations.find(l => l.locationId === id);
  return loc?.description || "";
});


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
            checklist.locationId = patrolLocationIds; // 
            checklist.locationCode = locationCodes;
              checklist.locationName = locationNames; 
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
         const { scanEndDate } = req.body;

             const endDate = scanEndDate ? new Date(scanEndDate) : new Date();
  
      const updatedChecklist = await Checklist.findOneAndUpdate(
        { checklistId },
        {
          $set: {
             scanEndDate: endDate,
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
            // latitude,longitude,
            // locationName,
            // ETA,
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
        // if(latitude) checklist.latitude = latitude
        // if(longitude) checklist.longitude = longitude
        // if(locationName) checklist.locationName = locationName
        // if(ETA) checklist.ETA = ETA

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
   
    

// // ✅ Update checklist status from Open to Completed
// router.put('/complete', authMiddleware, async (req, res) => {
//     try {
//         const { checklistIds } = req.body; // Array of checklistIds
        
//         if (!checklistIds || checklistIds.length === 0) {
//             return res.status(400).json({ message: "task IDs are required" });
//         }

//         // ✅ Update status to "Completed" for given checklistIds
//         const result = await Checklist.updateMany(
//             { checklistId: { $in: checklistIds }, status: "Open" }, // Only update if status is Open
//             { $set: { status: "Completed",isActive:false, modifiedDate: new Date() } }
//         );

//         res.status(200).json({
//             message: "task(s) marked as Completed successfully",
//             modifiedCount: result.nModified
//         });
//     } catch (error) {
//         console.error("❌ Error updating task status:", error);
//         res.status(500).json({ message: "Error updating task status", error: error.message });
//     }
// });



router.put('/complete', authMiddleware, async (req, res) => {
    try {
        const { checklistIds } = req.body;

        if (!Array.isArray(checklistIds) || checklistIds.length === 0) {
            return res.status(400).json({ message: "task IDs are required" });
        }

        let completed = 0;
        let completedWithMME = 0;

        for (const checklistId of checklistIds) {
            const mediaCount = await Multimedia.countDocuments({ checklistId });

            const status = mediaCount > 0 ? "Completed with MME" : "Completed";

            const result = await Checklist.updateOne(
                { checklistId, status: "Open" },
                { $set: { status, isActive: false, modifiedDate: new Date() } }
            );

            if (result.modifiedCount > 0) {
                if (status === "Completed with MME") completedWithMME++;
                else completed++;
            }
        }

        return res.status(200).json({
            message: "Checklist(s) updated successfully",
            completed,
            completedWithMME
        });

    } catch (error) {
        console.error("❌ Error updating checklist status:", error);
        return res.status(500).json({ message: "Error updating checklist status", error: error.message });
    }
});





module.exports = router;
