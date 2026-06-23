import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  color: { type: String, required: true },
  isSystem: { type: Boolean, default: false } // Щоб не можна було видалити базові (напр. "Інше")
});

export default mongoose.model('Category', categorySchema);