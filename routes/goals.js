import express from 'express';
import Goal from '../models/Goal.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Отримати всі плани
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user }).sort({ createdAt: 1 });
    res.json(goals);
  } catch (error) { res.status(500).json({ message: 'Помилка завантаження' }); }
});

// Створити ціль (або головну + масив підцілей по тижнях)
router.post('/', async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      const goalsWithUser = req.body.map(g => ({ ...g, userId: req.user }));
      const savedGoals = await Goal.insertMany(goalsWithUser);
      return res.status(201).json(savedGoals);
    } else {
      const newGoal = new Goal({ ...req.body, userId: req.user });
      const savedGoal = await newGoal.save();
      res.status(201).json(savedGoal);
    }
  } catch (error) { res.status(500).json({ message: 'Помилка створення' }); }
});

// Оновити статус (виконано/не виконано)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Помилка оновлення' }); }
});

// ВИДАЛЕННЯ (Каскадне: видаляє ціль + всі її підцілі)
router.delete('/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    // $or означає: видали запис, якщо його _id дорівнює targetId, АБО якщо його parentId дорівнює targetId
    await Goal.deleteMany({
      userId: req.user,
      $or: [{ _id: targetId }, { parentId: targetId }]
    });
    
    res.json({ message: 'Ціль та її підцілі видалено' });
  } catch (error) { res.status(500).json({ message: 'Помилка видалення' }); }
});

export default router;