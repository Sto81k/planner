import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import systemRoutes from './routes/system.js';

// Імпорти всіх наших маршрутів
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import calendarRoutes from './routes/calendar.js'; // <--- ДОДАНО
import goalRoutes from './routes/goals.js';       // <--- ДОДАНО

dotenv.config();

import './bot.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); 
app.use(express.json()); 

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Успішно підключено до MongoDB!'))
  .catch((err) => console.error(err));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// === ПІДКЛЮЧЕННЯ API ===
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/calendar', calendarRoutes); // <--- ДОДАНО
app.use('/api/goals', goalRoutes);        // <--- ДОДАНО
app.use('/api/system', systemRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порту ${PORT}`);
});