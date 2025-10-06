const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'rating', 'multiple-choice', 'ranking', 'open-ended'],
    required: true
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [500, 'Question text cannot exceed 500 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  options: [{
    text: String,
    value: mongoose.Schema.Types.Mixed
  }],
  required: {
    type: Boolean,
    default: false
  },
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    minLength: Number,
    maxLength: Number
  },
  order: {
    type: Number,
    required: true
  }
});

const surveyTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Survey template name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: false
    },
    multipleResponses: {
      type: Boolean,
      default: false
    },
    expirationDate: Date,
    requireLocation: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  category: {
    type: String,
    enum: ['student', 'customer', 'employee', 'market', 'other'],
    default: 'student'
  },
  tags: [String]
}, {
  timestamps: true
});

surveyTemplateSchema.index({ createdBy: 1 });
surveyTemplateSchema.index({ team: 1 });
surveyTemplateSchema.index({ status: 1 });
surveyTemplateSchema.index({ category: 1 });
surveyTemplateSchema.index({ tags: 1 });

module.exports = mongoose.model('SurveyTemplate', surveyTemplateSchema);