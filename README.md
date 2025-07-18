# Magic Nutritionist Backend API

Secure backend API for Magic Nutritionist iOS app, deployed on Vercel with OpenRouter AI integration.

## 🚀 Features

- **Secure AI Integration**: No API keys exposed to client apps
- **Multiple AI Models**: Claude 3.5 Sonnet (primary), GPT-4o (backup), Claude 3 Haiku (budget)
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Image Processing**: Automatic validation and size limits
- **Multilingual Support**: Chinese and English analysis
- **Comprehensive Logging**: Request tracking and error monitoring
- **Production Ready**: Helmet security, CORS, error handling

## 🏗️ Architecture

```
iOS App → Vercel Backend → OpenRouter API → AI Models
```

### AI Model Selection Strategy

Based on extensive research, we use a tiered approach:

1. **Claude 3.5 Sonnet** (Primary) - $3/$15 per million tokens
   - Best food classification accuracy (75%)
   - Excellent multilingual support
   - Superior nutritional analysis

2. **GPT-4o** (Backup) - $5/$15 per million tokens
   - Fast processing (2x faster than GPT-4)
   - Good recipe generation
   - 50% more cost-effective than GPT-4

3. **Claude 3 Haiku** (Budget) - $0.25/$1.25 per million tokens
   - Ultra-fast processing
   - 20x cheaper than primary model
   - Good for basic analysis

## 📋 API Endpoints

### `POST /api/analyze`
Analyze food images and return nutritional information.

**Request:**
```json
{
  "image": "base64-encoded-image",
  "mealType": "早餐|午餐|晚餐|點心",
  "language": "zh|en", // optional, defaults to zh
  "useModel": "primary|backup|budget" // optional, defaults to primary
}
```

**Response:**
```json
{
  "foodItems": [
    {
      "name": "食物名稱",
      "calories": 250,
      "protein": 12.5,
      "carbs": 30.0,
      "fat": 8.0,
      "quantity": "1 bowl",
      "confidence": 0.85
    }
  ],
  "totalCalories": 250,
  "healthScore": 78,
  "aiConfidence": 0.85,
  "suggestions": ["建議1", "建議2"],
  "mealType": "早餐",
  "autoDetected": true,
  "metadata": {
    "model": "anthropic/claude-3.5-sonnet",
    "timestamp": "2024-01-15T10:30:00Z",
    "processingTime": 2500,
    "version": "1.0.0"
  }
}
```

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Optional
API_SECRET_KEY=your-super-secret-key-here
ALLOWED_ORIGINS=https://yourapp.com,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_IMAGE_SIZE=1920
IMAGE_QUALITY=0.8
MAX_FILE_SIZE=10485760
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd backend
vercel --prod
```

3. **Set Environment Variables:**
```bash
vercel env add OPENROUTER_API_KEY
# Enter your OpenRouter API key when prompted
```

### Local Development

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run development server:**
```bash
npm run dev
```

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: Comprehensive request validation
- **Security Headers**: Helmet.js protection
- **CORS Configuration**: Controlled origin access
- **Error Handling**: Secure error responses
- **API Key Protection**: Server-side only storage

## 📊 Cost Analysis

Estimated monthly costs for different usage levels:

| Usage Level | Requests/Month | Primary Model | Backup Model | Budget Model |
|-------------|---------------|---------------|--------------|--------------|
| Light (1K)  | 1,000        | $3-5         | $5-8         | $0.25-0.5   |
| Medium (10K)| 10,000       | $30-50       | $50-80       | $2.5-5      |
| Heavy (100K)| 100,000      | $300-500     | $500-800     | $25-50      |

## 📈 Performance Optimizations

- **Smart Model Selection**: Cost vs. accuracy trade-offs
- **Request Caching**: Duplicate request detection
- **Image Optimization**: Automatic resizing and compression
- **Timeout Handling**: 30-second request limits
- **Error Recovery**: Automatic model fallback

## 🔍 Monitoring & Logging

All requests are logged with:
- Request metadata (IP, user agent, timestamp)
- Processing time and model used
- Error details and stack traces
- Usage analytics and cost tracking

## 🧪 Testing

Run tests with:
```bash
npm test
```

Test the API locally:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image":"base64-string","mealType":"早餐"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.