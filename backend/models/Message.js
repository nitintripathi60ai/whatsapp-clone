const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  text: { type: String, required: true },
  sender: { type: String, required: true },
  senderPhone: { type: String, required: true },
  senderProfilePic: { type: String },
  type: { type: String, enum: ['text', 'image', 'video', 'file'], default: 'text' },
  fileData: { type: String }, // Base64 data for files/images
  reactions: [{
    emoji: String,
    senderPhone: String
  }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

