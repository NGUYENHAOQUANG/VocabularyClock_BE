import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // ── Connection Pool ─────────────────────────────────────────
      // Tối đa 10 kết nối song song → tối ưu cho concurrent requests
      maxPoolSize: 10,
      minPoolSize: 2,

      // ── Timeout Settings ────────────────────────────────────────
      serverSelectionTimeoutMS: 5000,  // Timeout nếu không kết nối được trong 5s
      socketTimeoutMS: 45000,          // Timeout nếu socket không hoạt động trong 45s
      connectTimeoutMS: 10000,         // Timeout kết nối ban đầu
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ── Graceful Disconnect khi app tắt ─────────────────────────
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed (app terminated)');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
