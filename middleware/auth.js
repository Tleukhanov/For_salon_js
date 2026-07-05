function requireAdmin(req, res, next) {
  if (req.session.isAdmin !== true) {
    return res.status(401).json({ error: 'Требуется авторизация администратора' });
  }
  next();
}

module.exports = { requireAdmin };
