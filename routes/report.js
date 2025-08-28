const express = require('express');
const router = express.Router();
const Workflow = require('../models/workflow');
const Checklist = require('../models/checklist');
const Multimedia = require('../models/media');
const Signature = require('../models/signature');
const authMiddleware = require('../middleware/authMiddleware');



router.get('/all', authMiddleware,async (req, res) => {
  const { startDateTime, endDateTime, type } = req.query;
  const reportType = type || 'regular';

  if (reportType === 'regular') {
    try {
      let workflowFilter = {};

      if (req.query.status && req.query.status !== 'all') {
        workflowFilter.status = req.query.status;
      }


      if (startDateTime && endDateTime) {
        workflowFilter.startDateTime = {
          $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
        };
      } else if (startDateTime) {
        workflowFilter.startDateTime = {
          $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
          $lte: new Date()
        };
      } else if (endDateTime) {
        workflowFilter.startDateTime = {
          $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
        };
      }

          // Pagination params from query (default page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;


      // Step 2: Fetch filtered workflows
      const completedWorkflows = await Workflow.find(workflowFilter);
      if (completedWorkflows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No matching workflows found for given criteria.'
        });
      }

      const workflowIds = completedWorkflows.map(wf => wf.workflowId);

      // Step 3: Get all checklists under these workflows
      // no patrolId filter here to get for all patrols
      const checklists = await Checklist.find({
        workflowId: { $in: workflowIds }
      });

      // Group checklists by patrolId and workflowId
      const grouped = {};
      checklists.forEach(cl => {
        if (!grouped[cl.assignedTo]) grouped[cl.assignedTo] = {};
        if (!grouped[cl.assignedTo][cl.workflowId]) grouped[cl.assignedTo][cl.workflowId] = [];
        grouped[cl.assignedTo][cl.workflowId].push(cl);
      });

          // Convert grouped object to array for pagination
    const allPatrols = Object.entries(grouped); // [ [userId, workflows], ... ]

    // Apply pagination on patrols
    const paginatedPatrols = allPatrols.slice(startIndex, endIndex);

      // Step 4: Get all media and signatures for all patrols
      const [media, signatures] = await Promise.all([
        Multimedia.find({}),
        Signature.find({})
      ]);

          // Step 6: Assemble final result for paginated patrols
    const result = paginatedPatrols.map(([userId, workflows]) => {
      const workflowsArr = Object.entries(workflows).map(([workflowId, cls]) => {
        const wf = completedWorkflows.find(wf => wf.workflowId === workflowId);
        return {
          workflow: wf,
          checklists: cls.map(cl => ({
            ...cl.toObject(),
            media: media.filter(m => m.checklistId === cl.checklistId && m.userId === userId),
            signatures: signatures.filter(s => s.checklistId === cl.checklistId && s.userId === userId)
          }))
        };
      });

      return {
        userId,
        workflows: workflowsArr
      };
    });

    return res.json({
      success: true,
      filteredBy: startDateTime || endDateTime
        ? {
            ...(startDateTime && { startDateTime }),
            ...(endDateTime && { endDateTime: endDateTime || new Date().toISOString() })
          }
        : 'No date filter applied',
      pagination: {
        totalPatrols: allPatrols.length,
        page,
        limit,
        totalPages: Math.ceil(allPatrols.length / limit)
      },
      report: result
    });

  } catch (err) {
    console.error('Error in all patrols report:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
} else if (reportType === 'media') {
    try {
         // Pagination params (defaults)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
      // date filters same as before
      const dateFilter = {};

      if (startDateTime && endDateTime) {
        dateFilter.createdDate = {
          $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
        };
      } else if (startDateTime) {
        dateFilter.createdDate = {
          $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
          $lte: new Date()
        };
      } else if (endDateTime) {
        dateFilter.createdDate = {
          $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
        };
      }

      // Fetch media and signatures where checklistId is null for all patrols, filtered by date
      const media = await Multimedia.find({
        checklistId: null,
        ...(Object.keys(dateFilter).length ? dateFilter : {})
      });

      const signatures = await Signature.find({
        checklistId: null,
        ...(Object.keys(dateFilter).length ? dateFilter : {})
      });

      if (media.length === 0 && signatures.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No media or signatures found for the given date range.'
        });
      }

      // Group media and signatures by patrolId
      const mediaByUser = media.reduce((acc, m) => {
        if (!acc[m.userId]) acc[m.userId] = [];
        acc[m.userId].push(m);
        return acc;
      }, {});

      const signaturesByUser = signatures.reduce((acc, s) => {
        if (!acc[s.userId]) acc[s.userId] = [];
        acc[s.userId].push(s);
        return acc;
      }, {});

          // Convert to entries for pagination
    const userIds = new Set([
      ...Object.keys(mediaByUser),
      ...Object.keys(signaturesByUser)
    ]);
    const allUsers = Array.from(userIds);

    const paginatedUsers = allUsers.slice(startIndex, endIndex);

    // Rebuild paginated result object
    const paginatedMediaByUser = {};
    const paginatedSignaturesByUser = {};

    paginatedUsers.forEach(userId => {
      if (mediaByUser[userId]) paginatedMediaByUser[userId] = mediaByUser[userId];
      if (signaturesByUser[userId]) paginatedSignaturesByUser[userId] = signaturesByUser[userId];
    });

    return res.json({
      success: true,
      filteredBy: startDateTime || endDateTime
        ? {
            ...(startDateTime && { startDateTime }),
            ...(endDateTime && { endDateTime })
          }
        : 'No date filter applied',
      pagination: {
        totalPatrols: allUsers.length,
        page,
        limit,
        totalPages: Math.ceil(allUsers.length / limit)
      },
      mediaByUser: paginatedMediaByUser,
      signaturesByUser: paginatedSignaturesByUser
    });

  } catch (err) {
    console.error('Error in all patrols media report:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
}
});




// Regular Report Route
router.get('/:userId',authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { startDateTime, endDateTime, type } = req.query;
  
  const reportType = type || 'regular';  // Determine the report type (default is 'regular')

  if (reportType === 'regular') {
    try {
     let workflowFilter = {};

      if (req.query.status && req.query.status !== 'all') {
        workflowFilter.status = req.query.status;
      }

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
        assignedTo: userId,
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
        Multimedia.find({ userId }),
        Signature.find({ userId })
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

      // return res.json({
      //   success: true,
      //   patrolId,
      //   filteredBy: startDateTime || endDateTime
      //     ? {
      //         ...(startDateTime && { startDateTime }),
      //         ...(endDateTime && { endDateTime: endDateTime || new Date().toISOString() })
      //       }
      //     : 'No date filter applied',
      //   completedWorkflows: result
      // });
//       // ✅ Pagination logic
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 2;
const startIndex = (page - 1) * limit;
const endIndex = page * limit;

const paginatedResult = result.slice(startIndex, endIndex);

return res.json({
  success: true,
  userId,
  filteredBy: startDateTime || endDateTime
    ? {
        ...(startDateTime && { startDateTime }),
        ...(endDateTime && { endDateTime: endDateTime || new Date().toISOString() })
      }
    : 'No date filter applied',
  completedWorkflows: paginatedResult,
  pagination: {
    total: result.length,
    page,
    limit,
    totalPages: Math.ceil(result.length / limit)
  }
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
    try {
      const { startDateTime, endDateTime } = req.query;
  
      const dateFilter = {};
  
      if (startDateTime && endDateTime) {
        dateFilter.createdDate = {
          $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
        };
      } else if (startDateTime) {
        dateFilter.createdDate = {
          $gte: new Date(new Date(startDateTime).setHours(0, 0, 0, 0)),
          $lte: new Date()
        };
      } else if (endDateTime) {
        dateFilter.createdDate = {
          $lte: new Date(new Date(endDateTime).setHours(23, 59, 59, 999))
        };
      }
  
      const media = await Multimedia.find({
        userId,
        checklistId: null,
        ...(Object.keys(dateFilter).length ? dateFilter : {})
      });
  
      const signatures = await Signature.find({
        userId,
        checklistId: null,
        ...(Object.keys(dateFilter).length ? dateFilter : {})
      });
  
      if (media.length === 0 && signatures.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No media or signatures found for the given patrolId and date range.'
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      // Paginate results
      const paginatedMedia = media.slice(startIndex, endIndex);
      const paginatedSignatures = signatures.slice(startIndex, endIndex);
  
      return res.json({
  success: true,
  userId,
  filteredBy: startDateTime || endDateTime
    ? {
        ...(startDateTime && { startDateTime }),
        ...(endDateTime && { endDateTime })
      }
    : 'No date filter applied',
  media: paginatedMedia,
  signatures: paginatedSignatures,
  pagination: {
    totalMedia: media.length,
    totalSignatures: signatures.length,
    page,
    limit,
    totalPages: Math.ceil(Math.max(media.length, signatures.length) / limit)
  }
});

  
    } catch (err) {
      console.error('Error in generating patrol media report:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message
      });
    }
  }
});

module.exports = router;



