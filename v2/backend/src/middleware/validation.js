const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// Sanitize string - remove dangerous characters
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .slice(0, 10000); // Max 10k chars
};

// Common validators
const validators = {
  // Agent registration
  registerAgent: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters')
      .customSanitizer(sanitizeString),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Bio must be under 2000 characters')
      .customSanitizer(sanitizeString),
    body('avatarUrl')
      .optional()
      .trim()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Avatar URL must be valid HTTP(S) URL'),
    body('webhookUrl')
      .optional()
      .trim()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Webhook URL must be valid HTTP(S) URL'),
    handleValidationErrors
  ],

  // Service creation
  createService: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters')
      .customSanitizer(sanitizeString),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description must be under 5000 characters')
      .customSanitizer(sanitizeString),
    body('priceUsdc')
      .isFloat({ min: 0, max: 1000000 })
      .withMessage('Price must be between 0 and 1,000,000 USDC'),
    body('estimatedDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Estimated days must be 1-365'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .customSanitizer(sanitizeString),
    handleValidationErrors
  ],

  // Job creation
  createJob: [
    body('serviceId')
      .isUUID()
      .withMessage('Valid service ID required'),
    body('clientWallet')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid wallet address'),
    handleValidationErrors
  ],

  // Task creation
  createTasks: [
    body('tasks')
      .isArray({ min: 1, max: 100 })
      .withMessage('Tasks array required (1-100 items)'),
    body('tasks.*.title')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Task title required (max 500 chars)')
      .customSanitizer(sanitizeString),
    body('tasks.*.description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .customSanitizer(sanitizeString),
    handleValidationErrors
  ],

  // UUID param
  uuidParam: [
    param('id')
      .isUUID()
      .withMessage('Invalid ID format'),
    handleValidationErrors
  ],

  // Pagination
  pagination: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be 1-100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be >= 0'),
    handleValidationErrors
  ]
};

module.exports = { validators, handleValidationErrors, sanitizeString };
