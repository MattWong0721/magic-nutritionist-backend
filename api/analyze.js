import axios from 'axios';
import { logger } from './utils/logger.js';

// AI Model Configuration based on research
const MODEL_CONFIG = {
  // Primary model: Claude 3.5 Sonnet - Best for food classification (75% accuracy)
  primary: {
    name: 'anthropic/claude-3.5-sonnet',
    maxTokens: 1000,
    temperature: 0.3,
    cost: 'medium', // $3/$15 per million tokens
    strengths: ['food_classification', 'nutrition_analysis', 'multilingual']
  },
  
  // Backup model: GPT-4o - Good for recipe generation and composition
  backup: {
    name: 'openai/gpt-4o',
    maxTokens: 1000,
    temperature: 0.3,
    cost: 'low', // $5/$15 per million tokens
    strengths: ['recipe_generation', 'food_composition', 'speed']
  },
  
  // Budget option: Claude 3 Haiku - Fast and cost-effective
  budget: {
    name: 'anthropic/claude-3-haiku',
    maxTokens: 800,
    temperature: 0.2,
    cost: 'very_low', // $0.25/$1.25 per million tokens
    strengths: ['speed', 'cost_effective', 'basic_analysis']
  }
};

export async function analyzeFood(req, res) {
  try {
    const { image, mealType, language = 'zh', useModel = 'primary' } = req.body;
    
    logger.info('Starting food analysis', { 
      mealType, 
      language, 
      useModel,
      imageSize: image?.length || 0 
    });

    // Validate inputs
    if (!image || !mealType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both image and mealType are required'
      });
    }

    // Select model based on request
    const selectedModel = MODEL_CONFIG[useModel] || MODEL_CONFIG.primary;
    
    // Create analysis prompt
    const prompt = createFoodAnalysisPrompt(mealType, language);
    
    // Call OpenRouter API
    const analysisResult = await callOpenRouterAPI(
      prompt, 
      image, 
      selectedModel
    );
    
    // Parse and validate response
    const foodData = parseOpenRouterResponse(analysisResult, mealType);
    
    // Add metadata
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
    
    // Handle specific error types
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
      timeout: 30000 // 30 second timeout
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
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : response;
    
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.food_items || !Array.isArray(parsed.food_items)) {
      throw new Error('Invalid food_items in response');
    }
    
    // Ensure all food items have required fields
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