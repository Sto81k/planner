import express from 'express';
import Task from '../models/Task.js';
import Event from '../models/Event.js';
import Goal from '../models/Goal.js';
import Note from '../models/Note.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.post('/cleanup', async (req, res) => {
  try {
    const { fromDate, toDate, modules } = req.body;
    
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'Оберіть період для видалення' });
    }

    const startObj = new Date(`${fromDate}T00:00:00.000Z`);
    const endObj = new Date(`${toDate}T23:59:59.999Z`);

    const deletedStats = { calendar: 0, tasks: 0, plans: 0, notes: 0 };

    // 1. Очищення Календаря (події)
    if (modules.calendar) {
      const result = await Event.deleteMany({ 
        userId: req.user, 
        date: { $gte: fromDate, $lte: toDate } 
      });
      deletedStats.calendar = result.deletedCount;
    }

    // 2. Очищення Завдань (To-Do)
    if (modules.tasks) {
      const result = await Task.deleteMany({ 
        userId: req.user, 
        createdAt: { $gte: startObj, $lte: endObj } 
      });
      deletedStats.tasks = result.deletedCount;
    }

    // 3. Очищення Планів (Цілі) - ВИПРАВЛЕНО НА deadline
    if (modules.plans) {
      const result = await Goal.deleteMany({ 
        userId: req.user, 
        deadline: { $gte: fromDate, $lte: toDate } 
      });
      deletedStats.plans = result.deletedCount;
    }

    // 4. Очищення Notion (Сторінки)
    if (modules.notes) {
      const result = await Note.deleteMany({ 
        userId: req.user, 
        updatedAt: { $gte: startObj, $lte: endObj } 
      });
      deletedStats.notes = result.deletedCount;
    }

    res.json({ 
      message: 'Дані успішно та безповоротно видалено', 
      stats: deletedStats 
    });
  } catch (error) {
    console.error('Помилка очищення БД:', error);
    res.status(500).json({ message: 'Помилка на сервері при очищенні: ' + error.message });
  }
});

export default router;