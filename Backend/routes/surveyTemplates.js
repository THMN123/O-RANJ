const express = require('express');
const { body } = require('express-validator');
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate
} = require('../controllers/surveyTemplateController');
const { auth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const templateValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  body('questions.*.questionText')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Question text is required and cannot exceed 500 characters'),
  body('questions.*.type')
    .isIn(['text', 'rating', 'multiple-choice', 'ranking', 'open-ended'])
    .withMessage('Invalid question type')
];

// Routes
router.get('/', auth, getTemplates);
router.get('/:id', auth, getTemplate);
router.post('/', auth, templateValidation, handleValidationErrors, createTemplate);
router.put('/:id', auth, templateValidation, handleValidationErrors, updateTemplate);
router.delete('/:id', auth, deleteTemplate);
router.post('/:id/duplicate', auth, duplicateTemplate);

module.exports = router;