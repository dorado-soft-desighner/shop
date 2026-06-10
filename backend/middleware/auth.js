const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dorado-pos-secret-super-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Supporting both formats: "Bearer TOKEN" and "TOKEN"
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader);

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden. Administrative privileges required.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  isAdmin,
  JWT_SECRET
};
