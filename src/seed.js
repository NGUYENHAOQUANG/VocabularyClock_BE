import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Load .env ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from './models/User.js';
import Topic from './models/Topic.js';
import VocabSet from './models/VocabSet.js';
import Vocabulary from './models/Vocabulary.js';
import UserVocabulary from './models/UserVocabulary.js';

const MONGODB_URI = process.env.MONGODB_URI;

const seedDatabase = async () => {
  try {
    console.log('🔄 Đang kết nối tới MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB.');

    console.log('🧹 Đang xóa dữ liệu cũ (Xóa trắng)...');
    await Promise.all([
      User.deleteMany({}),
      Topic.deleteMany({}),
      VocabSet.deleteMany({}),
      Vocabulary.deleteMany({}),
      UserVocabulary.deleteMany({})
    ]);

    // ==========================================
    // 1. TẠO TEST USER
    // ==========================================
    console.log('👤 Đang tạo Test User...');
    const testUser = new User({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password123', // Hook pre-save trong model User sẽ tự hash
      isEmailVerified: true,
      isActive: true,
      settings: {
        dailyNewWordLimit: 15,
        dailyReviewLimit: 50,
        learningDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }
    });
    await testUser.save();

    // ==========================================
    // 2. TẠO SYSTEM TOPICS
    // ==========================================
    console.log('📚 Đang tạo System Topics...');
    const topicIelts = await Topic.create({
      name: 'IELTS Vocabulary (Band 6-8)',
      description: 'Từ vựng học thuật cần thiết cho kỳ thi IELTS',
      color: '#4F46E5', // Xanh dương đậm
      typeId: 'vocabulary',
      isSystemTopic: true,
      ownerId: null
    });

    const topicColloc = await Topic.create({
      name: 'English Collocations',
      description: 'Cụm từ tiếng Anh giao tiếp thông dụng',
      color: '#10B981', // Xanh lá
      typeId: 'collocation',
      isSystemTopic: true,
      ownerId: null
    });

    // ==========================================
    // 3. TẠO SYSTEM VOCAB SETS
    // ==========================================
    console.log('📁 Đang tạo System Vocab Sets...');
    const setEnv = await VocabSet.create({
      name: 'Environment & Nature',
      description: 'Từ vựng chủ đề Môi trường và Thiên nhiên',
      topicId: topicIelts._id,
      isSystemSet: true,
      ownerId: null,
      order: 1
    });

    const setEdu = await VocabSet.create({
      name: 'Education & Learning',
      description: 'Từ vựng chủ đề Giáo dục',
      topicId: topicIelts._id,
      isSystemSet: true,
      ownerId: null,
      order: 2
    });

    const setMakeDo = await VocabSet.create({
      name: 'Make & Do',
      description: 'Cách phân biệt và dùng cụm từ với Make và Do',
      topicId: topicColloc._id,
      isSystemSet: true,
      ownerId: null,
      order: 1
    });

    // ==========================================
    // 4. TẠO SYSTEM VOCABULARIES
    // ==========================================
    console.log('📖 Đang tạo System Vocabularies...');
    const systemVocabs = await Vocabulary.insertMany([
      // ---- Set: Environment ----
      {
        content: 'Sustainable',
        type: 'vocabulary',
        meaning: 'Bền vững, không gây hại cho môi trường',
        phonetic: '/səˈsteɪnəbl/',
        partOfSpeech: 'adjective',
        examples: [
          {
            en: 'We need to find sustainable solutions to the energy crisis.',
            translations: { vi: 'Chúng ta cần tìm ra những giải pháp bền vững cho cuộc khủng hoảng năng lượng.' }
          }
        ],
        level: 'B2',
        tags: ['IELTS', 'Environment'],
        isSystemVocab: true,
        setId: setEnv._id,
        ownerId: null
      },
      {
        content: 'Deforestation',
        type: 'vocabulary',
        meaning: 'Sự phá rừng',
        phonetic: '/ˌdiːˌfɒrɪˈsteɪʃn/',
        partOfSpeech: 'noun',
        examples: [
          {
            en: 'Deforestation is destroying large areas of tropical rain forest.',
            translations: { vi: 'Nạn phá rừng đang tàn phá những khu vực rộng lớn của rừng mưa nhiệt đới.' }
          }
        ],
        level: 'B2',
        tags: ['IELTS', 'Environment'],
        isSystemVocab: true,
        setId: setEnv._id,
        ownerId: null
      },

      // ---- Set: Education ----
      {
        content: 'Curriculum',
        type: 'vocabulary',
        meaning: 'Chương trình giảng dạy',
        phonetic: '/kəˈrɪkjələm/',
        partOfSpeech: 'noun',
        examples: [
          {
            en: 'Spanish is on the curriculum.',
            translations: { vi: 'Tiếng Tây Ban Nha có trong chương trình giảng dạy.' }
          }
        ],
        level: 'B1',
        tags: ['IELTS', 'Education'],
        isSystemVocab: true,
        setId: setEdu._id,
        ownerId: null
      },

      // ---- Set: Collocations ----
      {
        content: 'Make a decision',
        type: 'collocation',
        meaning: 'Đưa ra quyết định',
        partOfSpeech: 'phrase',
        examples: [
          {
            en: 'I have to make a decision by tomorrow.',
            translations: { vi: 'Tôi phải đưa ra quyết định trước ngày mai.' }
          }
        ],
        level: 'A2',
        tags: ['Collocation', 'Make'],
        isSystemVocab: true,
        setId: setMakeDo._id,
        ownerId: null
      }
    ]);

    // Cập nhật thống kê cho System Sets & Topics
    setEnv.itemCount = 2;
    setEdu.itemCount = 1;
    setMakeDo.itemCount = 1;
    await Promise.all([setEnv.save(), setEdu.save(), setMakeDo.save()]);

    topicIelts.totalSets = 2;
    topicIelts.totalItems = 3;
    topicColloc.totalSets = 1;
    topicColloc.totalItems = 1;
    await Promise.all([topicIelts.save(), topicColloc.save()]);

    // ==========================================
    // 5. TẠO DỮ LIỆU "MY WORDS" CHO TEST USER
    // ==========================================
    console.log('✍️ Đang tạo dữ liệu "My Words" cho User...');
    
    const userTopic = await Topic.create({
      name: 'Từ vựng xem phim',
      description: 'Những từ tôi học được khi xem Netflix',
      color: '#F59E0B', // Cam
      typeId: 'vocabulary',
      isSystemTopic: false,
      ownerId: testUser._id,
    });

    const userSet = await VocabSet.create({
      name: 'Phim Friends - Mùa 1',
      description: 'Các câu nói hay trong Friends',
      topicId: userTopic._id,
      isSystemSet: false,
      ownerId: testUser._id,
      order: 1
    });

    const userVocabs = await Vocabulary.insertMany([
      {
        content: 'Binge-watch',
        type: 'vocabulary',
        meaning: 'Cày phim (xem nhiều tập liên tục)',
        phonetic: '/bɪndʒ wɒtʃ/',
        partOfSpeech: 'verb',
        examples: [
          {
            en: 'I binge-watched the entire season of Stranger Things in one day.',
            translations: { vi: 'Tôi đã cày nguyên một mùa Stranger Things trong một ngày.' }
          }
        ],
        isSystemVocab: false,
        setId: userSet._id,
        ownerId: testUser._id
      },
      {
        content: 'Cliffhanger',
        type: 'vocabulary',
        meaning: 'Đoạn kết lửng lơ gây cấn',
        phonetic: '/ˈklɪfhæŋər/',
        partOfSpeech: 'noun',
        examples: [
          {
            en: 'The episode ended on a cliffhanger.',
            translations: { vi: 'Tập phim kết thúc ở một tình tiết gay cấn.' }
          }
        ],
        isSystemVocab: false,
        setId: userSet._id,
        ownerId: testUser._id
      }
    ]);

    userSet.itemCount = 2;
    await userSet.save();

    userTopic.totalSets = 1;
    userTopic.totalItems = 2;
    await userTopic.save();

    // ==========================================
    // 6. TẠO DỮ LIỆU USER PROGRESS (UserVocabulary)
    // ==========================================
    console.log('📈 Đang tạo tiến trình học tập (UserVocabulary)...');
    
    await UserVocabulary.insertMany([
      // Đã học 1 từ hệ thống (Sustainable) vào Thứ Hai
      {
        userId: testUser._id,
        vocabId: systemVocabs[0]._id, // Sustainable
        setId: setEnv._id,
        vocabType: 'vocabulary',
        learnedDayOfWeek: 'Monday',
        isMarkedRemembered: false,
      },
      // Đã học 1 từ tự tạo (Binge-watch) vào Thứ Ba
      {
        userId: testUser._id,
        vocabId: userVocabs[0]._id, // Binge-watch
        setId: userSet._id,
        vocabType: 'vocabulary',
        learnedDayOfWeek: 'Tuesday',
        isMarkedRemembered: true, // Đánh dấu đã nhớ
      }
    ]);

    console.log('✅ SEED DATABASE THÀNH CÔNG!');
    console.log('----------------------------------------------------');
    console.log('💡 Tài khoản test:');
    console.log('   Email: test@test.com');
    console.log('   Pass:  password123');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed database:', error);
    process.exit(1);
  }
};

seedDatabase();
