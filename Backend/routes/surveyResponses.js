const express = require('express');
const { body } = require('express-validator');
const {
  submitResponse,
  syncResponses,
  getResponses,
  getAnalytics,
  exportResponses
} = require('../controllers/surveyResponseController');
const { auth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const responseValidation = [
  body('surveyTemplate')
    .isMongoId()
    .withMessage('Valid survey template ID is required'),
  body('responses')
    .isObject()
    .withMessage('Responses must be an object')
];

const syncValidation = [
  body('responses')
    .isArray()
    .withMessage('Responses must be an array'),
  body('responses.*.surveyTemplate')
    .isMongoId()
    .withMessage('Valid survey template ID is required for each response')
];

// Routes
router.get('/', auth, getResponses);
router.get('/analytics', auth, getAnalytics);
router.get('/export', auth, exportResponses);
router.post('/', auth, responseValidation, handleValidationErrors, submitResponse);
router.post('/sync', auth, syncValidation, handleValidationErrors, syncResponses);

module.exports = router;