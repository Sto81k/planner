import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  date: { type: String, required: true }, // YYYY-MM-DD
  isAllDay: { type: Boolean, default: false },
  startHour: { type: Number, default: null },
  duration: { type: Number, default: null },
  completed: { type: Boolean, default: false },
  
  // Для повторюваних задач
  seriesId: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);