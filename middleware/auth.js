import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;

  // Перевіряємо, чи є токен у заголовках запиту
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Отримуємо сам токен (відкидаємо слово "Bearer ")
      token = req.headers.authorization.split(' ')[1];

      // Розшифровуємо токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Записуємо ID користувача в req, щоб його бачили інші функції
      req.user = decoded.userId;

      next(); // Пропускаємо далі
    } catch (error) {
      res.status(401).json({ message: 'Не авторизовано, токен недійсний' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Не авторизовано, немає токена' });
  }
};