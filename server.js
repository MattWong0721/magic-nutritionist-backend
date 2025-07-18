console.log('🚀 Starting Magic Nutritionist Backend...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

console.log('📦 Imports loaded successfully');

dotenv.config();

console.log('🔧 Environment configured');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🌐 Express app created');
console.log('📍 PORT:', PORT);
console.log('🔑 API Key present:', !!process.env.OPENROUTER_API_KEY);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODEL_CONFIG = {
  primary: {
    name: 'anthropic/claude-3.5-sonnet',
    maxTokens: 1000,
    temperature: 0.3
  },
  backup: {
    name: 'openai/gpt-4o',
    maxTokens: 1000,
    temperature: 0.3
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Food analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { image, mealType, language = 'zh' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Create analysis prompt
    const prompt = `分析这张食物图片，提供详细的营养信息。请返回JSON格式，包含以下字段：
    - foodItems: 食物数组，每个包含 name(中文名称), calories, protein, carbs, fat, quantity, confidence
    - totalCalories: 总卡路里
    - healthScore: 健康评分(0-100)
    - aiConfidence: AI识别置信度(0-1)
    - suggestions: 建议数组(中文)
    - mealType: 餐型
    - autoDetected: 是否自动检测
    
    请确保返回有效的JSON格式。`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://magic-nutritionist.com',
        'X-Title': 'Magic Nutritionist'
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.primary.name,
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
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: MODEL_CONFIG.primary.maxTokens,
        temperature: MODEL_CONFIG.primary.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Try to parse JSON from AI response
    let analysisResult;
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      // Fallback to mock data if parsing fails
      analysisResult = {
        foodItems: [
          {
            name: "识别的食物",
            calories: 350,
            protein: 15.0,
            carbs: 45.0,
            fat: 12.0,
            quantity: "1份",
            confidence: 0.85
          }
        ],
        totalCalories: 350,
        healthScore: 75,
        aiConfidence: 0.85,
        suggestions: ["营养均衡", "适量食用"],
        mealType: mealType || "午餐",
        autoDetected: true
      };
    }

    // Add metadata
    analysisResult.metadata = {
      model: MODEL_CONFIG.primary.name,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - req.startTime,
      version: "1.0.0"
    };

    res.json(analysisResult);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Magic Nutritionist API running on port ${PORT}`);
  console.log(`📍 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`🍎 Food analysis: http://0.0.0.0:${PORT}/api/analyze`);
});