const express = require('express');
const router = express.Router();
const Workflow = require('../models/workflow');
const Checklist = require('../models/checklist');
const Multimedia = require('../models/media');
const Signature = require('../models/signature');
const authMiddleware = require('../middleware/authMiddleware');

// Regular Report Route
router.get('/:patrolId', async (req, res) => {
  const { patrolId } = req.params;
  const { startDateTime, endDateTime, type } = req.query;
  
  const reportType = type || 'regular';  // Determine the report type (default is 'regular')

  if (reportType === 'regular') {
    try {
      // Step 1: Build dynamic filter for workflows
      const workflowFilter = { status: 'Completed' };

      if (startDateTime && endDateTime) {
        workflowFilter.startDateTime = {
          $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
        };
      } else if (startDateTime) {
        workflowFilter.startDateTime = {
          $gte: new Date(startDateTime),
          $lte: new Date()
        };
      } else if (endDateTime) {
        workflowFilter.startDateTime = {
          $lte: new Date(endDateTime)
        };
      }

      // Step 2: Fetch filtered workflows
      const completedWorkflows = await Workflow.find(workflowFilter);
      if (completedWorkflows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No matching workflows found for given criteria.'
        });
      }

      const workflowIds = completedWorkflows.map(wf => wf.workflowId);

      // Step 3: Get checklists assigned to patrol under these workflows
      const checklists = await Checklist.find({
        assignedTo: patrolId,
        workflowId: { $in: workflowIds }
      });

      // Step 4: Group checklists by workflowId
      const groupedByWorkflow = checklists.reduce((acc, cl) => {
        acc[cl.workflowId] = acc[cl.workflowId] || [];
        acc[cl.workflowId].push(cl);
        return acc;
      }, {});

      // Step 5: Get media and signatures for this patrol
      const [media, signatures] = await Promise.all([
        Multimedia.find({ patrolId }),
        Signature.find({ patrolId })
      ]);

      // Step 6: Assemble final result
      const result = completedWorkflows
        .filter(wf => groupedByWorkflow[wf.workflowId])
        .map(wf => ({
          workflow: wf,
          checklists: groupedByWorkflow[wf.workflowId].map(cl => ({
            ...cl.toObject(),
            media: media.filter(m => m.checklistId === cl.checklistId),
            signatures: signatures.filter(s => s.checklistId === cl.checklistId)
          }))
        }));

      return res.json({
        success: true,
        patrolId,
        filteredBy: startDateTime || endDateTime
          ? {
              ...(startDateTime && { startDateTime }),
              ...(endDateTime && { endDateTime: endDateTime || new Date().toISOString() })
            }
          : 'No date filter applied',
        completedWorkflows: result
      });
    } catch (err) {
      console.error('Error in patrol report with date filter:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
      });
    }
  } else if (reportType === 'media') {
    // Media Report Route
    try {
      // Fetch media where checklistId is null for the given patrolId
      const media = await Multimedia.find({ patrolId, checklistId: null });

      // Fetch signatures where checklistId is null for the given patrolId
      const signatures = await Signature.find({ patrolId, checklistId: null });

      if (media.length === 0 && signatures.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No media or signatures found for the given patrolId with null checklistId.'
        });
      }

      // Prepare the report
      const report = {
        patrolId,
        media: media.map(m => m.toObject()), // Convert mongoose documents to plain objects
        signatures: signatures.map(s => s.toObject()) // Convert mongoose documents to plain objects
      };

      return res.json({
        success: true,
        report
      });
    } catch (err) {
      console.error('Error in generating patrol media report:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid report type. Please specify either "regular" or "media".'
    });
  }
});

module.exports = router;




// outer.get('/:patrolId', async (req, res) => {
//   const { patrolId } = req.params;
//   const { startDateTime, endDateTime,type } = req.query;
  
//   // const reportType = type || 'regular';
  
//   // if (reportType === 'regular') {
  
//   try {
//   // Step 1: Build dynamic filter for workflows
//   const workflowFilter = { status: 'Completed' };
  
  
//   if (startDateTime && endDateTime) {
//     workflowFilter.startDateTime = {
//       $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
//       $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
//     };
    
//   } else if (startDateTime) {
//     workflowFilter.startDateTime = {
//       $gte: new Date(startDateTime),
//       $lte: new Date()
//     };
//   } else if (endDateTime) {
//     workflowFilter.startDateTime = {
//       $lte: new Date(endDateTime)
//     };
//   }
  
//   // Step 2: Fetch filtered workflows
//   const completedWorkflows = await Workflow.find(workflowFilter);
//   if (completedWorkflows.length === 0) {
//     return res.status(404).json({
//       success: false,
//       message: 'No matching workflows found for given criteria.'
//     });
//   }
  
//   const workflowIds = completedWorkflows.map(wf => wf.workflowId);
  
//   // Step 3: Get checklists assigned to patrol under these workflows
//   const checklists = await Checklist.find({
//     assignedTo: patrolId,
//     workflowId: { $in: workflowIds }
//   });
  
//   // Step 4: Group checklists by workflowId
//   const groupedByWorkflow = checklists.reduce((acc, cl) => {
//     acc[cl.workflowId] = acc[cl.workflowId] || [];
//     acc[cl.workflowId].push(cl);
//     return acc;
//   }, {});
  
//   // Step 5: Get media and signatures for this patrol
//   const [media, signatures] = await Promise.all([
//     Multimedia.find({ patrolId }),
//     Signature.find({ patrolId })
//   ]);
  
//   // Step 6: Assemble final result
//   const result = completedWorkflows
//     .filter(wf => groupedByWorkflow[wf.workflowId])
//     .map(wf => ({
//       workflow: wf,
//       checklists: groupedByWorkflow[wf.workflowId].map(cl => ({
//         ...cl.toObject(),
//         media: media.filter(m => m.checklistId === cl.checklistId),
//         signatures: signatures.filter(s => s.checklistId === cl.checklistId)
//       }))
//     }));
  
//   return res.json({
//     success: true,
//     patrolId,
//     filteredBy: startDateTime || endDateTime
//       ? {
//           ...(startDateTime && { startDateTime }),
//           ...(endDateTime && { endDateTime: endDateTime || new Date().toISOString() })
//         }
//       : 'No date filter applied',
//     completedWorkflows: result
//   });
  
  
//   } catch (err) {
//   console.error('Error in patrol report with date filter:', err);
//   return res.status(500).json({
//   success: false,
//   message: 'Server error',
//   error: err.message
//   });
//   }
//   });
//   "this is the regular report"
  
  
  
  
//   router.get('/:patrolId/media', async (req, res) => {
//     const { patrolId } = req.params;
  
//     try {
//       // Fetch media where checklistId is null for the given patrolId
//       const media = await Multimedia.find({ patrolId, checklistId: null });
  
//       // Fetch signatures where checklistId is null for the given patrolId
//       const signatures = await Signature.find({ patrolId, checklistId: null });
  
//       if (media.length === 0 && signatures.length === 0) {
//         return res.status(404).json({
//           success: false,
//           message: 'No media or signatures found for the given patrolId with null checklistId.'
//         });
//       }
  
//       // Prepare the report
//       const report = {
//         patrolId,
//         media: media.map(m => m.toObject()), // Convert mongoose documents to plain objects
//         signatures: signatures.map(s => s.toObject()) // Convert mongoose documents to plain objects
//       };
  
//       return res.json({
//         success: true,
//         report
//       });
  
//     } catch (err) {
//       console.error('Error in generating patrol report:', err);
//       return res.status(500).json({
//         success: false,
//         message: 'Server error',
//         error: err.message
//       });
//     }
//   });



// const ExcelJS = require('exceljs');

// router.get('/export/:patrolId', authMiddleware, async (req, res) => {
//   const { patrolId } = req.params;
//   const { startDateTime, endDateTime } = req.query;

//   try {
//     const workflowFilter = { status: 'Completed' };
//     if (startDateTime && endDateTime) {
//       workflowFilter.startDateTime = {
//         $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
//         $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
//       };
//     }
//      else if (startDateTime) {
//       workflowFilter.startDateTime = {
//         $gte: new Date(startDateTime),
//         $lte: new Date()
//       };
//     } else if (endDateTime) {
//       workflowFilter.startDateTime = {
//         $lte: new Date(endDateTime)
//       };
//     }

//     const completedWorkflows = await Workflow.find(workflowFilter);
//     const workflowIds = completedWorkflows.map(wf => wf.workflowId);

//     const checklists = await Checklist.find({
//       assignedTo: patrolId,
//       workflowId: { $in: workflowIds }
//     });

//     const [media, signatures] = await Promise.all([
//       Multimedia.find({ patrolId }),
//       Signature.find({ patrolId })
//     ]);

//     // Create workbook and worksheet
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Patrol Report');

//     // Header row
//     worksheet.columns = [
//       { header: 'Workflow ID', key: 'workflowId', width: 20 },
//       { header: 'Workflow Title', key: 'workflowTitle', width: 25 },
//       { header: 'Checklist ID', key: 'checklistId', width: 20 },
//       { header: 'Checklist Status', key: 'checklistStatus', width: 20 },
//       { header: 'Media Count', key: 'mediaCount', width: 15 },
//       { header: 'Signature Count', key: 'signatureCount', width: 18 },
//     ];

//     for (const cl of checklists) {
//       const wf = completedWorkflows.find(w => w.workflowId === cl.workflowId);
//       const mediaItems = media.filter(m => m.checklistId === cl.checklistId);
//       const signatureItems = signatures.filter(s => s.checklistId === cl.checklistId);

//       worksheet.addRow({
//         workflowId: wf?.workflowId || 'N/A',
//         workflowTitle: wf?.workflowTitle || 'N/A',
//         checklistId: cl.checklistId,
//         checklistStatus: cl.status,
//         mediaCount: mediaItems.length,
//         signatureCount: signatureItems.length
//       });
//     }

//     // Set headers for download
//     res.setHeader(
//       'Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     );
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename=PatrolReport_${patrolId}.xlsx`
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (err) {
//     console.error('Excel export error:', err);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to generate Excel report',
//       error: err.message
//     });
//   }
// });
