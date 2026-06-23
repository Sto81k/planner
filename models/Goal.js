import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  deadline: { type: String, required: true }, // Формат YYYY-MM-DD
  type: { type: String, enum: ['text', 'numeric'], required: true },
  target: { type: Number, default: null }, // Тільки для числових
  completed: { type: Boolean, default: false },
  isSubGoal: { type: Boolean, default: false },
  parentId: { type: String, default: null }, // Зв'язок підцілі з головною
  parentTitle: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Goal', goalSchema);