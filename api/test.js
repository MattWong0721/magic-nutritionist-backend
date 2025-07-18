export default function handler(req, res) {
  // Simple test endpoint
  res.status(200).json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}