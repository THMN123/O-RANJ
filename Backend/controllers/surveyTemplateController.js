const SurveyTemplate = require('../models/SurveyTemplate');
const SurveyResponse = require('../models/SurveyResponse');

// @desc    Get all survey templates for user's team
// @route   GET /api/survey-templates
// @access  Private
exports.getTemplates = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search
    } = req.query;

    const query = { team: req.user.team };
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await SurveyTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SurveyTemplate.countDocuments(query);

    res.json({
      success: true,
      data: {
        templates,
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

// @desc    Get single survey template
// @route   GET /api/survey-templates/:id
// @access  Private
exports.getTemplate = async (req, res, next) => {
  try {
    const template = await SurveyTemplate.findOne({
      _id: req.params.id,
      team: req.user.team
    }).populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Survey template not found'
      });
    }

    res.json({
      success: true,
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create survey template
// @route   POST /api/survey-templates
// @access  Private
exports.createTemplate = async (req, res, next) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user.id,
      team: req.user.team
    };

    const template = await SurveyTemplate.create(templateData);

    res.status(201).json({
      success: true,
      message: 'Survey template created successfully',
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update survey template
// @route   PUT /api/survey-templates/:id
// @access  Private
exports.updateTemplate = async (req, res, next) => {
  try {
    let template = await SurveyTemplate.findOne({
      _id: req.params.id,
      team: req.user.team
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Survey template not found'
      });
    }

    template = await SurveyTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Survey template updated successfully',
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete survey template
// @route   DELETE /api/survey-templates/:id
// @access  Private
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await SurveyTemplate.findOne({
      _id: req.params.id,
      team: req.user.team
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Survey template not found'
      });
    }

    // Check if template has responses
    const responseCount = await SurveyResponse.countDocuments({
      surveyTemplate: req.params.id
    });

    if (responseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete template with existing responses. Archive it instead.'
      });
    }

    await SurveyTemplate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Survey template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate survey template
// @route   POST /api/survey-templates/:id/duplicate
// @access  Private
exports.duplicateTemplate = async (req, res, next) => {
  try {
    const originalTemplate = await SurveyTemplate.findOne({
      _id: req.params.id,
      team: req.user.team
    });

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Survey template not found'
      });
    }

    const duplicateData = {
      ...originalTemplate.toObject(),
      _id: undefined,
      name: `${originalTemplate.name} (Copy)`,
      status: 'draft',
      createdBy: req.user.id,
      createdAt: undefined,
      updatedAt: undefined
    };

    const duplicateTemplate = await SurveyTemplate.create(duplicateData);

    res.status(201).json({
      success: true,
      message: 'Survey template duplicated successfully',
      data: { template: duplicateTemplate }
    });
  } catch (error) {
    next(error);
  }
};