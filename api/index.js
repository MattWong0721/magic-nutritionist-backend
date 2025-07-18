import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple logger
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  error: (message, error = null, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};

// Validation middleware
function validateRequest(req, res, next) {
  const startTime = Date.now();
  req.startTime = startTime;

  logger.info('API request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json'
    });
  }

  if (req.url === '/api/analyze' && req.method === 'POST') {
    const { image, mealType } = req.body;
    
    if (!image || !mealType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both image and mealType are required',
        required: ['image', 'mealType']
      });
    }

    if (typeof image !== 'string' || !isValidBase64(image)) {
      return res.status(400).json({
        error: 'Invalid image format',
        message: 'Image must be a valid base64 string'
      });
    }

    const imageSizeBytes = (image.length * 3) / 4;
    const maxSizeBytes = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
    
    if (imageSizeBytes > maxSizeBytes) {
      return res.status(413).json({
        error: 'Image too large',
        message: `Image size must be less than ${Math.round(maxSizeBytes / (1024 * 1024))}MB`
      });
    }

    const validMealTypes = ['早餐', '午餐', '晚餐', '點心', 'breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({
        error: 'Invalid meal type',
        message: 'Meal type must be one of: ' + validMealTypes.join(', ')
      });
    }

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
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    
    const decoded = Buffer.from(str, 'base64').toString('base64');
    return decoded === str;
  } catch (error) {
    return false;
  }
}

// AI Model Configuration
const MODEL_CONFIG = {
  primary: {
    name: 'anthropic/claude-3.5-sonnet',
    maxTokens: 1000,
    temperature: 0.3,
    cost: 'medium'
  },
  backup: {
    name: 'openai/gpt-4o',
    maxTokens: 1000,
    temperature: 0.3,
    cost: 'low'
  },
  budget: {
    name: 'anthropic/claude-3-haiku',
    maxTokens: 800,
    temperature: 0.2,
    cost: 'very_low'
  }
};

// Food analysis endpoint
async function analyzeFood(req, res) {
  try {
    const { image, mealType, language = 'zh', useModel = 'primary' } = req.body;
    
    logger.info('Starting food analysis', { 
      mealType, 
      language, 
      useModel,
      imageSize: image?.length || 0 
    });

    const selectedModel = MODEL_CONFIG[useModel] || MODEL_CONFIG.primary;
    const prompt = createFoodAnalysisPrompt(mealType, language);
    const analysisResult = await callOpenRouterAPI(prompt, image, selectedModel);
    const foodData = parseOpenRouterResponse(analysisResult, mealType);
    
    const response = {
      ...foodData,
      metadata: {
        model: selectedModel.name,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - req.startTime,
        version: '1.0.0'
      }
    };

    logger.info('Food analysis completed successfully', {
      totalCalories: foodData.totalCalories,
      itemCount: foodData.foodItems?.length || 0,
      model: selectedModel.name
    });

    res.json(response);

  } catch (error) {
    logger.error('Food analysis failed', error);
    
    if (error.response?.status === 401) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'AI service authentication failed'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later'
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request timeout',
        message: 'AI service took too long to respond'
      });
    }

    res.status(500).json({
      error: 'Analysis failed',
      message: 'Unable to analyze food image at this time'
    });
  }
}

async function callOpenRouterAPI(prompt, base64Image, modelConfig) {
  const openRouterUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const requestBody = {
    model: modelConfig.name,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: modelConfig.maxTokens,
    temperature: modelConfig.temperature
  };

  const response = await axios.post(
    `${openRouterUrl}/chat/completions`,
    requestBody,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://magic-nutritionist.com',
        'X-Title': 'Magic Nutritionist'
      },
      timeout: 30000
    }
  );

  if (!response.data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from AI service');
  }

  return response.data.choices[0].message.content;
}

function createFoodAnalysisPrompt(mealType, language) {
  const prompts = {
    zh: `請分析這張食物照片，並以JSON格式回覆營養資訊。餐次類型是：${mealType}

請回覆以下格式的JSON：
{
  "food_items": [
    {
      "name": "食物名稱",
      "calories": 卡路里數值,
      "protein": 蛋白質克數,
      "carbs": 碳水化合物克數,
      "fat": 脂肪克數,
      "quantity": "份量描述",
      "confidence": 信心度(0-1)
    }
  ],
  "total_calories": 總卡路里,
  "health_score": 健康分數(0-100),
  "ai_confidence": 整體分析信心度(0-1),
  "suggestions": ["建議1", "建議2"]
}

請準確識別食物並提供營養資訊。如果無法清楚識別某些食物，請在confidence中反映較低的信心度。`,

    en: `Please analyze this food image and respond with nutritional information in JSON format. Meal type: ${mealType}

Please respond with JSON in this format:
{
  "food_items": [
    {
      "name": "Food name",
      "calories": calorie_value,
      "protein": protein_grams,
      "carbs": carbs_grams,
      "fat": fat_grams,
      "quantity": "portion description",
      "confidence": confidence_score(0-1)
    }
  ],
  "total_calories": total_calories,
  "health_score": health_score(0-100),
  "ai_confidence": overall_confidence(0-1),
  "suggestions": ["suggestion1", "suggestion2"]
}

Please accurately identify foods and provide nutritional information. If you cannot clearly identify certain foods, reflect lower confidence in the confidence score.`
  };

  return prompts[language] || prompts.en;
}

function parseOpenRouterResponse(response, mealType) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : response;
    
    const parsed = JSON.parse(jsonString);
    
    if (!parsed.food_items || !Array.isArray(parsed.food_items)) {
      throw new Error('Invalid food_items in response');
    }
    
    const validatedItems = parsed.food_items.map(item => ({
      name: item.name || 'Unknown Food',
      calories: Number(item.calories) || 0,
      protein: Number(item.protein) || 0,
      carbs: Number(item.carbs) || 0,
      fat: Number(item.fat) || 0,
      quantity: item.quantity || 'Unknown',
      confidence: Number(item.confidence) || 0.5
    }));
    
    return {
      foodItems: validatedItems,
      totalCalories: Number(parsed.total_calories) || validatedItems.reduce((sum, item) => sum + item.calories, 0),
      healthScore: Number(parsed.health_score) || 70,
      aiConfidence: Number(parsed.ai_confidence) || 0.7,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : ['Analysis completed'],
      mealType: mealType,
      autoDetected: true
    };
  } catch (error) {
    logger.error('Failed to parse OpenRouter response', error);
    throw new Error('Failed to parse AI response');
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Food analysis endpoint
app.post('/api/analyze', validateRequest, analyzeFood);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An unexpected error occurred'
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;