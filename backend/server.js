const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// OTP Store (Temporary - in memory for simulation)
const otpStore = new Map();

// Request OTP Route
app.post('/api/auth/request-otp', async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, otp);
    
    console.log(`\n[OTP SIMULATION] Phone: ${phone} | OTP: ${otp} | User Exists: ${!!user}\n`);
    
    res.json({ 
      message: 'OTP sent successfully', 
      userExists: !!user,
      name: user ? user.name : null,
      otp: otp // Sending OTP in response for development/testing convenience
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP & Login Route
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, otp, name } = req.body;
  try {
    const savedOtp = otpStore.get(phone);
    if (otp !== savedOtp && otp !== '123456') { // Allow '123456' as a universal demo OTP
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      // New user registration with default name format
      const lastFour = phone.slice(-4);
      user = new User({ 
        phone, 
        name: name || `User ${lastFour}`,
        profilePic: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
        about: 'Hey there! I am using WhatsApp.'
      });
      await user.save();
      // Broadcast to all connected clients that a new user is available
      io.emit('userRegistered', user);
    }
    
    otpStore.delete(phone);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Auth Route (Deprecated - Use verify-otp instead)
app.post('/api/auth/login', async (req, res) => {
  const { phone, name } = req.body;
  try {
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ 
        phone, 
        name,
        profilePic: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
        about: 'Hey there! I am using WhatsApp.'
      });
      await user.save();
      // Notify all clients about the new user
      io.emit('userRegistered', user);
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch messages for a room
app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile Route
app.post('/api/auth/update-profile', async (req, res) => {
  const { phone, name, about, profilePic } = req.body;
  try {
    const updateData = { name, about };
    if (profilePic && profilePic.trim() !== '') {
      updateData.profilePic = profilePic;
    }
    
    const user = await User.findOneAndUpdate(
      { phone },
      updateData,
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch all users for sidebar
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.send('WhatsApp Backend Running!');
});

// Socket.io events - Real-time chat basics
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join chat room (WhatsApp chat/group)
  socket.on('joinRoom', async (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Send previous messages
    const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(50);
    socket.emit('previousMessages', messages);
  });

  // Send message
  socket.on('sendMessage', async ({ roomId, message, sender, type = 'text', fileData = null }) => {
    console.log(`Message from ${sender.name} in ${roomId}: ${message} (${type})`);
    try {
      const user = await User.findOne({ phone: sender.phone });
      const newMessage = new Message({
        roomId,
        text: message,
        sender: sender.name,
        senderPhone: sender.phone,
        senderProfilePic: user ? user.profilePic : sender.profilePic,
        type,
        fileData,
        timestamp: new Date()
      });
      await newMessage.save();
      io.to(roomId).emit('newMessage', newMessage);
      console.log('Message emitted to room:', roomId);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // React to message
  socket.on('reactToMessage', async ({ messageId, emoji, senderPhone }) => {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        // Remove existing reaction from this user if any
        message.reactions = message.reactions.filter(r => r.senderPhone !== senderPhone);
        // Add new reaction
        message.reactions.push({ emoji, senderPhone });
        await message.save();
        io.to(message.roomId).emit('messageReactionUpdate', { messageId, reactions: message.reactions });
      }
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
  });

  // Typing indicator
  socket.on('typing', ({ roomId, isTyping, user }) => {
    socket.to(roomId).emit('userTyping', { isTyping, user });
  });

  // Online status
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`Backend Server: http://10.242.153.141:${PORT}`);
  console.log(`Frontend URL: http://10.242.153.141:4200`);
  console.log(`========================================\n`);
});

