import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: '' },
  blocks: { type: Array, default: [] } // Тут ми будемо зберігати весь масив блоків (текст, чекбокси, кольори)
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);