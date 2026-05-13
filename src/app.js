import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import dictionaryRoutes from './routes/dictionaryRoutes.js';
import myWordsRoutes from './routes/myWordsRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import practiceRoutes from './routes/practiceRoutes.js';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── 1. Security Headers (helmet) ─────────────────────────────────
app.use(helmet());

// ── 2. CORS ──────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:8081']; // RN Metro + Web

app.use(cors({
  origin: isProd
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
      }
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── 3. Request Logging ───────────────────────────────────────────
// Dev: màu sắc chi tiết | Prod: format nhỏ gọn để lưu log
app.use(morgan(isProd ? 'combined' : 'dev'));

// ── 4. Compression (gzip) ────────────────────────────────────────
// Giảm kích thước response ~70% → tải nhanh hơn trên mobile
app.use(compression());

// ── 5. Body Parser với giới hạn size ────────────────────────────
// Giới hạn 2mb để tránh payload quá lớn (DoS protection)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── 6. Trust Proxy (cần khi deploy sau Nginx/load balancer) ─────
if (isProd) app.set('trust proxy', 1);

// ── 7. Global Rate Limit ─────────────────────────────────────────
// Tối đa 100 request / 15 phút / IP → chống DDoS cơ bản
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

// ── 8. Auth Rate Limit (nghiêm ngặt hơn) ────────────────────────
// Tối đa 10 request / 15 phút / IP → chống brute-force đăng nhập
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/auth/login',           authLimiter);
app.use('/api/auth/register',        authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ── 9. Health Check ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Vocabulary Clock API is running 🚀',
    env: process.env.NODE_ENV || 'development',
  });
});

// ── 10. API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', dictionaryRoutes);
app.use('/api/my-words', myWordsRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/practice', practiceRoutes);

// ── 11. 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── 12. Global Error Handler ─────────────────────────────────────
// Không lộ stack trace khi production
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error('[GlobalError]', { method: req.method, url: req.originalUrl, error: err.message });
  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500 ? 'Internal server error' : err.message || 'Internal server error',
    ...(isProd ? {} : { stack: err.stack }),
  });
});

export default app;
