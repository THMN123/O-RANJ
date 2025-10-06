const SurveyResponse = require('../models/SurveyResponse');
const SurveyTemplate = require('../models/SurveyTemplate');

// @desc    Submit survey response
// @route   POST /api/survey-responses
// @access  Private
exports.submitResponse = async (req, res, next) => {
  try {
    const {
      surveyTemplate,
      responses,
      deviceInfo,
      location,
      analytics
    } = req.body;

    // Verify survey template exists and is active
    const template = await SurveyTemplate.findOne({
      _id: surveyTemplate,
      team: req.user.team,
      status: 'active'
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Survey template not found or not active'
      });
    }

    const responseData = {
      surveyTemplate,
      collectedBy: req.user.id,
      team: req.user.team,
      responses,
      deviceInfo,
      location,
      analytics: {
        ...analytics,
        startTime: analytics.startTime ? new Date(analytics.startTime) : undefined,
        endTime: analytics.endTime ? new Date(analytics.endTime) : new Date()
      },
      metadata: {
        ipAddress: req.ip,
        language: req.headers['accept-language'],
        timezone: req.headers['timezone']
      }
    };

    const response = await SurveyResponse.create(responseData);

    // Populate for response
    await response.populate('surveyTemplate', 'name version');
    await response.populate('collectedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Survey response submitted successfully',
      data: { response }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync multiple survey responses (offline support)
// @route   POST /api/survey-responses/sync
// @access  Private
exports.syncResponses = async (req, res, next) => {
  try {
    const { responses } = req.body;

    if (!Array.isArray(responses)) {
      return res.status(400).json({
        success: false,
        message: 'Responses must be an array'
      });
    }

    const syncResults = {
      successful: [],
      failed: []
    };

    for (const responseData of responses) {
      try {
        // Check if response already exists (by device ID and timestamp)
        const existingResponse = await SurveyResponse.findOne({
          'deviceInfo.deviceId': responseData.deviceInfo?.deviceId,
          'analytics.startTime': responseData.analytics?.startTime
        });

        if (existingResponse) {
          syncResults.failed.push({
            deviceId: responseData.deviceInfo?.deviceId,
            error: 'Response already synced'
          });
          continue;
        }

        const response = await SurveyResponse.create({
          ...responseData,
          collectedBy: req.user.id,
          team: req.user.team,
          syncStatus: 'synced',
          syncHistory: [{
            timestamp: new Date(),
            status: 'synced',
            message: 'Synced from offline device'
          }]
        });

        syncResults.successful.push(response._id);
      } catch (error) {
        syncResults.failed.push({
          deviceId: responseData.deviceInfo?.deviceId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Sync completed: ${syncResults.successful.length} successful, ${syncResults.failed.length} failed`,
      data: { syncResults }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get survey responses with filtering and pagination
// @route   GET /api/survey-responses
// @access  Private
exports.getResponses = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      surveyTemplate,
      startDate,
      endDate,
      syncStatus
    } = req.query;

    const query = { team: req.user.team };
    
    if (surveyTemplate) query.surveyTemplate = surveyTemplate;
    if (syncStatus) query.syncStatus = syncStatus;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const responses = await SurveyResponse.find(query)
      .populate('surveyTemplate', 'name version category')
      .populate('collectedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SurveyResponse.countDocuments(query);

    // Get analytics for the responses
    const analytics = await SurveyResponse.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          avgCompletionTime: { $avg: '$analytics.completionTime' },
          uniqueDevices: { $addToSet: '$deviceInfo.deviceId' }
        }
      },
      {
        $project: {
          totalResponses: 1,
          avgCompletionTime: 1,
          uniqueDevices: { $size: '$uniqueDevices' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        responses,
        analytics: analytics[0] || {
          totalResponses: 0,
          avgCompletionTime: 0,
          uniqueDevices: 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get response analytics
// @route   GET /api/survey-responses/analytics
// @access  Private
exports.getAnalytics = async (req, res, next) => {
  try {
    const { surveyTemplate, startDate, endDate } = req.query;

    const matchQuery = { team: req.user.team };
    if (surveyTemplate) matchQuery.surveyTemplate = surveyTemplate;
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const analytics = await SurveyResponse.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          completedResponses: {
            $sum: {
              $cond: [{ $ifNull: ['$analytics.endTime', false] }, 1, 0]
            }
          },
          avgCompletionTime: { $avg: '$analytics.completionTime' },
          uniqueDevices: { $addToSet: '$deviceInfo.deviceId' },
          responsesByDate: {
            $push: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: 1
            }
          }
        }
      },
      {
        $project: {
          totalResponses: 1,
          completedResponses: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedResponses', '$totalResponses'] },
              100
            ]
          },
          avgCompletionTime: 1,
          uniqueDevices: { $size: '$uniqueDevices' },
          responsesByDate: {
            $reduce: {
              input: '$responsesByDate',
              initialValue: [],
              in: {
                $concatArrays: [
                  '$$value',
                  [
                    {
                      $mergeObjects: [
                        '$$this',
                        {
                          count: {
                            $sum: [
                              { $arrayElemAt: ['$$value.count', 0] },
                              '$$this.count'
                            ]
                          }
                        }
                      ]
                    }
                  ]
                ]
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        analytics: analytics[0] || {
          totalResponses: 0,
          completedResponses: 0,
          completionRate: 0,
          avgCompletionTime: 0,
          uniqueDevices: 0,
          responsesByDate: []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export survey responses
// @route   GET /api/survey-responses/export
// @access  Private
exports.exportResponses = async (req, res, next) => {
  try {
    const { surveyTemplate, format = 'json', startDate, endDate } = req.query;

    const query = { team: req.user.team };
    if (surveyTemplate) query.surveyTemplate = surveyTemplate;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const responses = await SurveyResponse.find(query)
      .populate('surveyTemplate', 'name version')
      .populate('collectedBy', 'name email')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Implement CSV export logic
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=survey-responses.csv');
      // Return CSV data
      return res.send(generateCSV(responses));
    }

    res.json({
      success: true,
      data: { responses },
      exportInfo: {
        exportedAt: new Date(),
        totalRecords: responses.length,
        format
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate CSV
const generateCSV = (responses) => {
  // Implementation for CSV generation
  return 'CSV data would be generated here';
};