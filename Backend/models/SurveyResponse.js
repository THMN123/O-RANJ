const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  surveyTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SurveyTemplate',
    required: true
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  deviceInfo: {
    deviceId: String,
    platform: String,
    userAgent: String,
    appVersion: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    address: String
  },
  responses: {
    // Dynamic structure based on survey template
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  analytics: {
    completionTime: Number, // in seconds
    startTime: Date,
    endTime: Date,
    sectionsCompleted: [String]
  },
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'synced'
  },
  syncHistory: [{
    timestamp: Date,
    status: String,
    message: String
  }],
  metadata: {
    ipAddress: String,
    language: String,
    timezone: String
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
responseSchema.index({ surveyTemplate: 1, createdAt: -1 });
responseSchema.index({ collectedBy: 1, createdAt: -1 });
responseSchema.index({ team: 1, syncStatus: 1 });
responseSchema.index({ createdAt: -1 });
responseSchema.index({ 'deviceInfo.deviceId': 1 });

// Virtual for response duration
responseSchema.virtual('duration').get(function() {
  if (this.analytics.startTime && this.analytics.endTime) {
    return (this.analytics.endTime - this.analytics.startTime) / 1000;
  }
  return null;
});

module.exports = mongoose.model('SurveyResponse', responseSchema);