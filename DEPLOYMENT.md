# Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites
- Vercel account
- OpenRouter API key
- Git repository

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy Backend
```bash
cd backend
vercel --prod
```

### Step 3: Set Environment Variables
After deployment, set these environment variables in Vercel:

```bash
# Set your OpenRouter API key
vercel env add OPENROUTER_API_KEY production
# Enter your API key when prompted

# Set other variables
vercel env add API_SECRET_KEY production
vercel env add ALLOWED_ORIGINS production
```

Or via Vercel Dashboard:
1. Go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Production |
| `API_SECRET_KEY` | Random secure string | Production |
| `ALLOWED_ORIGINS` | Your app domains | Production |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Production |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Production |

### Step 4: Update iOS App
Update the production URL in `Config.swift`:
```swift
static let productionURL = "https://your-vercel-app-name.vercel.app/api"
```

### Step 5: Test Deployment
```bash
curl -X GET https://your-vercel-app-name.vercel.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

## 🔧 Manual Steps Required

### 1. Get OpenRouter API Key
1. Go to [OpenRouter](https://openrouter.ai)
2. Sign up/Login
3. Go to "Keys" section
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

### 2. Deploy and Configure
1. **Clone/Fork** this repository
2. **Deploy** to Vercel using steps above
3. **Set environment variables** in Vercel dashboard
4. **Update iOS app** with your production URL
5. **Test** the deployment

### 3. Monitor Usage
- Check Vercel dashboard for function logs
- Monitor OpenRouter dashboard for API usage
- Set up alerts for rate limits

## 📊 Cost Estimates

Based on research, here are the estimated costs:

### OpenRouter API Costs
- **Claude 3.5 Sonnet**: $3 input / $15 output per 1M tokens
- **GPT-4o**: $5 input / $15 output per 1M tokens  
- **Claude 3 Haiku**: $0.25 input / $1.25 output per 1M tokens

### Monthly Usage Estimates
| Users | Requests/Month | Claude 3.5 | GPT-4o | Claude Haiku |
|-------|---------------|------------|---------|--------------|
| 100   | 3,000         | $9-15      | $15-25  | $0.75-1.25   |
| 1000  | 30,000        | $90-150    | $150-250| $7.5-12.5    |
| 10000 | 300,000       | $900-1500  | $1500-2500| $75-125    |

### Vercel Costs
- **Free Tier**: 100GB-hours/month, 1000 serverless function invocations
- **Pro**: $20/month for higher limits
- **Enterprise**: Custom pricing for large scale

## 🛠️ Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
cd backend
npm install
vercel --prod
```

**2. Environment variables not working**
- Check Vercel dashboard → Settings → Environment Variables
- Ensure variables are set for "Production" environment
- Redeploy after adding variables

**3. CORS errors**
- Update `ALLOWED_ORIGINS` to include your app domain
- Check that iOS app is using correct production URL

**4. Rate limiting too aggressive**
- Increase `RATE_LIMIT_MAX_REQUESTS` in environment variables
- Adjust `RATE_LIMIT_WINDOW_MS` for longer windows

**5. API key errors**
- Verify OpenRouter API key is correct
- Check that key has sufficient credits
- Ensure key is set in Production environment

### Debug Commands
```bash
# Check deployment status
vercel ls

# View function logs
vercel logs [deployment-url]

# Test health endpoint
curl https://your-app.vercel.app/api/health

# Test analyze endpoint
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image":"base64-string","mealType":"breakfast"}'
```

## 🔒 Security Checklist

- [ ] OpenRouter API key is only in Vercel environment variables
- [ ] API key is NOT in any Git repository
- [ ] Rate limiting is configured appropriately
- [ ] CORS is configured for your specific domains
- [ ] SSL/HTTPS is enabled (automatic with Vercel)
- [ ] Error messages don't expose sensitive information
- [ ] Request validation is working properly

## 📈 Performance Optimization

- [ ] Image compression is working (check logs)
- [ ] Request timeout is reasonable (30s)
- [ ] Rate limiting prevents abuse
- [ ] Health checks are responsive
- [ ] Error handling is comprehensive

## 📞 Support

If you need help:
1. Check Vercel function logs
2. Check OpenRouter dashboard for API issues
3. Review this deployment guide
4. Test each component individually

Remember: **Never commit API keys to Git!** Always use environment variables.