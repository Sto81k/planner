import express from 'express';
import Note from '../models/Note.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Отримати всі сторінки Notion (без вмісту блоків, щоб не вантажити пам'ять)
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user }).select('-blocks').sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Помилка завантаження сторінок' });
  }
});

// Отримати одну сторінку повністю (з блоками)
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user });
    if (!note) return res.status(404).json({ message: 'Сторінку не знайдено' });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Помилка завантаження' });
  }
});

// Створити нову пусту сторінку
router.post('/', async (req, res) => {
  try {
    const { title, blocks } = req.body;
    const newNote = new Note({ userId: req.user, title, blocks });
    const savedNote = await newNote.save();
    res.status(201).json(savedNote);
  } catch (error) {
    res.status(500).json({ message: 'Помилка створення' });
  }
});

// Зберегти зміни в сторінці (оновлення блоків/заголовка)
router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      { $set: { title: req.body.title, blocks: req.body.blocks } },
      { new: true }
    );
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Помилка збереження' });
  }
});

// Видалити сторінку
router.delete('/:id', async (req, res) => {
  try {
    await Note.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: 'Сторінку видалено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка видалення' });
  }
});

export default router;