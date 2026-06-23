import express from 'express';
import Task from '../models/Task.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Усі маршрути нижче будуть проходити через перевірку токена
router.use(protect); 

// 1. ОТРИМАТИ ВСІ ЗАВДАННЯ КОРИСТУВАЧА
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні завдань' });
  }
});

// 2. СТВОРИТИ НОВЕ ЗАВДАННЯ
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    const newTask = new Task({
      userId: req.user, // Беремо ID з токена
      title
    });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при створенні завдання' });
  }
});

// 3. ОНОВИТИ ЗАВДАННЯ (Виконано / Закріплено / Назва)
router.put('/:id', async (req, res) => {
  try {
    // Перевіряємо, чи належить задача цьому юзеру
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      { $set: req.body },
      { new: true } // Повертає оновлений документ
    );
    if (!task) return res.status(404).json({ message: 'Завдання не знайдено' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при оновленні' });
  }
});

// 4. ВИДАЛИТИ ЗАВДАННЯ
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user });
    if (!task) return res.status(404).json({ message: 'Завдання не знайдено' });
    res.json({ message: 'Завдання видалено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при видаленні' });
  }
});

export default router;