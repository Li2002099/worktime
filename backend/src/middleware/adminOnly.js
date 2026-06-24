const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '權限不足，僅限管理者操作' });
  }
  next();
};

module.exports = adminOnly;
