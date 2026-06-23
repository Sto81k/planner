import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// === РЕЄСТРАЦІЯ (/api/auth/register) ===
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Перевіряємо, чи немає вже такого email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Користувач з таким email вже існує.' });
    }

    // Хешуємо пароль (сіль = 10)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Створюємо нового користувача
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'Акаунт успішно створено!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка сервера при реєстрації.' });
  }
});

// === ВХІД (/api/auth/login) ===
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Шукаємо користувача
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Неправильний email або пароль.' });
    }

    // Перевіряємо пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неправильний email або пароль.' });
    }

    // Генеруємо JWT токен доступу (дійсний 30 днів)
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(200).json({
      message: 'Успішний вхід',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка сервера при вході.' });
  }
});

export default router;