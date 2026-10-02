const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  profilePic: { type: String, default: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png' },
  about: { type: String, default: 'Hey there! I am using WhatsApp.' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

