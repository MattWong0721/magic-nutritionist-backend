const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  
  // Health check endpoint
  if (parsedUrl.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
    return;
  }
  
  // Food analysis endpoint
  if (parsedUrl.pathname === '/api/analyze' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Mock response with realistic data
        const mockResponse = {
          foodItems: [
            {
              name: "海鲜炒饭",
              calories: 485,
              protein: 24.5,
              carbs: 58.2,
              fat: 16.8,
              quantity: "1 份",
              confidence: 0.92
            },
            {
              name: "炒虾仁",
              calories: 158,
              protein: 18.2,
              carbs: 2.1,
              fat: 8.4,
              quantity: "约100g",
              confidence: 0.88
            }
          ],
          totalCalories: 643,
          healthScore: 78,
          aiConfidence: 0.90,
          suggestions: [
            "这道海鲜炒饭营养丰富，蛋白质含量高",
            "建议搭配蔬菜沙拉增加纤维摄入",
            "注意控制份量，避免过量摄入"
          ],
          mealType: data.mealType || "午餐",
          autoDetected: true,
          metadata: {
            model: "mock-claude-3.5-sonnet",
            timestamp: new Date().toISOString(),
            processingTime: 1200,
            version: "1.0.0"
          }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResponse));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🍎 Food analysis: http://localhost:${PORT}/api/analyze`);
});