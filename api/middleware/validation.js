import { logger } from '../utils/logger.js';

export function validateRequest(req, res, next) {
  const startTime = Date.now();
  req.startTime = startTime;

  // Log request
  logger.info('API request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Validate Content-Type for POST requests
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json'
    });
  }

  // Validate request body for food analysis
  if (req.url === '/api/analyze' && req.method === 'POST') {
    const { image, mealType } = req.body;
    
    // Check required fields
    if (!image || !mealType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both image and mealType are required',
        required: ['image', 'mealType']
      });
    }

    // Validate image format (base64)
    if (typeof image !== 'string' || !isValidBase64(image)) {
      return res.status(400).json({
        error: 'Invalid image format',
        message: 'Image must be a valid base64 string'
      });
    }

    // Validate image size (approximate from base64)
    const imageSizeBytes = (image.length * 3) / 4;
    const maxSizeBytes = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    
    if (imageSizeBytes > maxSizeBytes) {
      return res.status(413).json({
        error: 'Image too large',
        message: `Image size must be less than ${Math.round(maxSizeBytes / (1024 * 1024))}MB`
      });
    }

    // Validate mealType
    const validMealTypes = ['早餐', '午餐', '晚餐', '點心', 'breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({
        error: 'Invalid meal type',
        message: 'Meal type must be one of: ' + validMealTypes.join(', ')
      });
    }

    // Validate optional fields
    const { language, useModel } = req.body;
    
    if (language && !['zh', 'en'].includes(language)) {
      return res.status(400).json({
        error: 'Invalid language',
        message: 'Language must be either "zh" or "en"'
      });
    }

    if (useModel && !['primary', 'backup', 'budget'].includes(useModel)) {
      return res.status(400).json({
        error: 'Invalid model selection',
        message: 'Model must be one of: primary, backup, budget'
      });
    }
  }

  next();
}

function isValidBase64(str) {
  try {
    // Check if string is valid base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    
    // Additional validation: try to decode
    const decoded = Buffer.from(str, 'base64').toString('base64');
    return decoded === str;
  } catch (error) {
    return false;
  }
}