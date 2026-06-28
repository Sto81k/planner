import express from 'express';
import Event from '../models/Event.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect); // Захищаємо всі маршрути

// ================= КАТЕГОРІЇ (ВИДИ ЗАДАЧ) =================

// Отримати всі категорії
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user });
    res.json(categories);
  } catch (error) { res.status(500).json({ message: 'Помилка сервера' }); }
});

// Створити нову категорію
router.post('/categories', async (req, res) => {
  try {
    const newCategory = new Category({ ...req.body, userId: req.user });
    const saved = await newCategory.save();
    res.status(201).json(saved);
  } catch (error) { res.status(500).json({ message: 'Помилка збереження' }); }
});

// Видалити категорію
router.delete('/categories/:id', async (req, res) => {
  try {
    // Не дозволяємо видаляти системні категорії
    const cat = await Category.findOne({ _id: req.params.id, userId: req.user });
    if (!cat) return res.status(404).json({ message: 'Категорію не знайдено' });
    if (cat.isSystem) return res.status(400).json({ message: 'Не можна видалити системну категорію' });

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Категорію видалено' });
  } catch (error) { res.status(500).json({ message: 'Помилка видалення' }); }
});


// ================= ПОДІЇ (САМ КАЛЕНДАР) =================

// Отримати власні події
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user });
    res.json(events);
  } catch (error) { res.status(500).json({ message: 'Помилка' }); }
});

// ЧИТАННЯ ЧУЖОГО КАЛЕНДАРЯ (За Email)
router.get('/events/shared/:email', async (req, res) => {
  try {
    const targetUser = await User.findOne({ email: req.params.email });
    if (!targetUser) return res.status(404).json({ message: 'Користувача з таким Email не знайдено' });
    
    // Повертаємо події іншої людини (тільки для читання)
    const events = await Event.find({ userId: targetUser._id });
    res.json({ calendarId: targetUser._id, name: targetUser.name, events });
  } catch (error) { res.status(500).json({ message: 'Помилка' }); }
});

// Створити нову подію (підтримує як одну, так і масив для повторюваних)
router.post('/events', async (req, res) => {
  try {
    // Якщо прийшов масив подій (серія)
    if (Array.isArray(req.body)) {
      const eventsWithUser = req.body.map(ev => ({ ...ev, userId: req.user }));
      const savedEvents = await Event.insertMany(eventsWithUser);
      return res.status(201).json(savedEvents);
    } 
    // Якщо прийшла одна подія
    else {
      const newEvent = new Event({ ...req.body, userId: req.user });
      const saved = await newEvent.save();
      return res.status(201).json(saved);
    }
  } catch (error) { 
    console.error(error);
    res.status(500).json({ message: 'Помилка створення події' }); 
  }
});

// Оновити подію
router.put('/events/:id', async (req, res) => {
  try {
    const updated = await Event.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Помилка оновлення' }); }
});

// Оновити ВЕСЬ ЛАНЦЮГ подій (по seriesId)
router.put('/events/series/:seriesId', async (req, res) => {
  try {
    const { fromDate, updates } = req.body;
    await Event.updateMany(
      { seriesId: req.params.seriesId, userId: req.user, date: { $gte: fromDate } },
      { $set: updates }
    );
    res.json({ message: 'Ланцюг оновлено' });
  } catch (error) { res.status(500).json({ message: 'Помилка' }); }
});

// Видалити подію
router.delete('/events/:id', async (req, res) => {
  try {
    await Event.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: 'Видалено' });
  } catch (error) { res.status(500).json({ message: 'Помилка' }); }
});

// Видалити ЛАНЦЮГ подій (з певної дати)
router.delete('/events/series/:seriesId/:fromDate', async (req, res) => {
  try {
    await Event.deleteMany({ 
      seriesId: req.params.seriesId, 
      userId: req.user, 
      date: { $gte: req.params.fromDate } 
    });
    res.json({ message: 'Ланцюг видалено' });
  } catch (error) { res.status(500).json({ message: 'Помилка' }); }
});

export default router;