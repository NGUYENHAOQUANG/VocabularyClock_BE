import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// --- Load .env ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import {
  User,
  Topic,
  VocabSet,
  Vocabulary,
  UserVocabulary,
  UserSetProgress,
  ReviewLog,
  ScheduledTask,
  DailyPlan,
} from "./models/index.js";

const MONGODB_URI = process.env.MONGODB_URI;

const seedDatabase = async () => {
  try {
    console.log("🔄 Đang kết nối tới MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Đã kết nối MongoDB.");

    console.log("🧹 Đang xóa dữ liệu cũ (Xóa trắng toàn bộ collection)...");
    await Promise.all([
      User.deleteMany({}),
      Topic.deleteMany({}),
      VocabSet.deleteMany({}),
      Vocabulary.deleteMany({}),
      UserVocabulary.deleteMany({}),
      UserSetProgress.deleteMany({}),
      ReviewLog.deleteMany({}),
      ScheduledTask.deleteMany({}),
      DailyPlan.deleteMany({}),
    ]);

    // ==========================================
    // 1. TẠO TEST USER
    // ==========================================
    console.log("👤 Đang tạo Test User...");
    const testUser = new User({
      name: "Test User",
      email: "test@test.com",
      password: "password123", // Hook pre-save trong model User sẽ tự hash
      isEmailVerified: true,
      isActive: true,
      settings: {
        dailyNewWordLimit: 15,
        dailyReviewLimit: 50,
        learningDays: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    });
    await testUser.save();

    // ==========================================
    // 2. TẠO SYSTEM TOPICS
    // ==========================================
    console.log("📚 Đang tạo System Topics...");
    const topicIelts = await Topic.create({
      name: "IELTS Vocabulary (Band 6-8)",
      description: "Từ vựng học thuật cần thiết cho kỳ thi IELTS",
      color: "#4F46E5", // Xanh dương đậm
      typeId: "vocabulary",
      isSystemTopic: true,
      ownerId: null,
    });

    const topicColloc = await Topic.create({
      name: "English Collocations",
      description: "Cụm từ tiếng Anh giao tiếp thông dụng",
      color: "#10B981", // Xanh lá
      typeId: "collocation",
      isSystemTopic: true,
      ownerId: null,
    });

    const topicIdioms = await Topic.create({
      name: "English Idioms",
      description: "Thành ngữ tiếng Anh tự nhiên như người bản xứ",
      color: "#EC4899", // Hồng
      typeId: "idiom",
      isSystemTopic: true,
      ownerId: null,
    });

    const topicPhrasal = await Topic.create({
      name: "Phrasal Verbs",
      description: "Cụm động từ thiết yếu trong giao tiếp hàng ngày",
      color: "#8B5CF6", // Tím
      typeId: "phrasal_verb",
      isSystemTopic: true,
      ownerId: null,
    });

    // ==========================================
    // 3. TẠO SYSTEM VOCAB SETS
    // ==========================================
    console.log("📁 Đang tạo System Vocab Sets...");
    const setEnv = await VocabSet.create({
      name: "Environment & Nature",
      description: "Từ vựng chủ đề Môi trường và Thiên nhiên",
      topicId: topicIelts._id,
      isSystemSet: true,
      ownerId: null,
      order: 1,
    });

    const setEdu = await VocabSet.create({
      name: "Education & Learning",
      description: "Từ vựng chủ đề Giáo dục và Trường học",
      topicId: topicIelts._id,
      isSystemSet: true,
      ownerId: null,
      order: 2,
    });

    const setMakeDo = await VocabSet.create({
      name: "Make & Do Collocations",
      description: "Cách phân biệt và dùng cụm từ với Make và Do",
      topicId: topicColloc._id,
      isSystemSet: true,
      ownerId: null,
      order: 1,
    });

    const setIdioms = await VocabSet.create({
      name: "Common Daily Idioms",
      description: "Các thành ngữ phổ biến nhất trong đời sống",
      topicId: topicIdioms._id,
      isSystemSet: true,
      ownerId: null,
      order: 1,
    });

    const setPhrasal = await VocabSet.create({
      name: "Essential Phrasal Verbs",
      description: "Cụm động từ thường gặp trong công việc và học tập",
      topicId: topicPhrasal._id,
      isSystemSet: true,
      ownerId: null,
      order: 1,
    });

    // ==========================================
    // 4. TẠO SYSTEM VOCABULARIES
    // ==========================================
    console.log("📖 Đang tạo System Vocabularies...");
    const vocabsEnv = await Vocabulary.insertMany([
      {
        content: "Sustainable",
        type: "vocabulary",
        meaning: "Bền vững, không gây hại cho môi trường",
        phonetic: "/səˈsteɪnəbl/",
        partOfSpeech: "adjective",
        examples: [
          {
            en: "We need to find sustainable solutions to the energy crisis.",
            translations: { vi: "Chúng ta cần tìm ra những giải pháp bền vững cho cuộc khủng hoảng năng lượng." },
          },
        ],
        level: "B2",
        tags: ["IELTS", "Environment"],
        isSystemVocab: true,
        setId: setEnv._id,
      },
      {
        content: "Deforestation",
        type: "vocabulary",
        meaning: "Sự phá rừng, nạn chặt cây",
        phonetic: "/ˌdiːˌfɒrɪˈsteɪʃn/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "Deforestation is destroying large areas of tropical rain forest.",
            translations: { vi: "Nạn phá rừng đang tàn phá những khu vực rộng lớn của rừng mưa nhiệt đới." },
          },
        ],
        level: "B2",
        tags: ["IELTS", "Environment"],
        isSystemVocab: true,
        setId: setEnv._id,
      },
      {
        content: "Biodiversity",
        type: "vocabulary",
        meaning: "Đa dạng sinh học",
        phonetic: "/ˌbaɪəʊdaɪˈvɜːsəti/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "The mining project threatens one of the world's richest areas of biodiversity.",
            translations: { vi: "Dự án khai mỏ đe dọa một trong những khu vực đa dạng sinh học phong phú nhất thế giới." },
          },
        ],
        level: "C1",
        tags: ["IELTS", "Environment"],
        isSystemVocab: true,
        setId: setEnv._id,
      },
      {
        content: "Ecosystem",
        type: "vocabulary",
        meaning: "Hệ sinh thái",
        phonetic: "/ˈiːkəʊsɪstəm/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "Pollution can have disastrous effects on the delicately balanced ecosystem.",
            translations: { vi: "Ô nhiễm có thể gây ra những hậu quả thảm khốc cho hệ sinh thái cân bằng tinh tế." },
          },
        ],
        level: "B2",
        tags: ["IELTS", "Environment"],
        isSystemVocab: true,
        setId: setEnv._id,
      },
      {
        content: "Conservation",
        type: "vocabulary",
        meaning: "Sự bảo tồn, gìn giữ",
        phonetic: "/ˌkɒnsəˈveɪʃn/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "Energy conservation reduces your fuel bills and helps the environment.",
            translations: { vi: "Bảo tồn năng lượng giúp giảm hóa đơn nhiên liệu của bạn và bảo vệ môi trường." },
          },
        ],
        level: "C1",
        tags: ["IELTS", "Environment"],
        isSystemVocab: true,
        setId: setEnv._id,
      },
    ]);

    const vocabsEdu = await Vocabulary.insertMany([
      {
        content: "Curriculum",
        type: "vocabulary",
        meaning: "Chương trình giảng dạy",
        phonetic: "/kəˈrɪkjələm/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "Spanish is on the curriculum.",
            translations: { vi: "Tiếng Tây Ban Nha có trong chương trình giảng dạy." },
          },
        ],
        level: "B1",
        tags: ["IELTS", "Education"],
        isSystemVocab: true,
        setId: setEdu._id,
      },
      {
        content: "Pedagogy",
        type: "vocabulary",
        meaning: "Phương pháp sư phạm, khoa học giảng dạy",
        phonetic: "/ˈpedəɡɒdʒi/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "His innovative pedagogy has inspired many young teachers.",
            translations: { vi: "Phương pháp sư phạm đổi mới của ông đã truyền cảm hứng cho nhiều giáo viên trẻ." },
          },
        ],
        level: "C2",
        tags: ["IELTS", "Education"],
        isSystemVocab: true,
        setId: setEdu._id,
      },
      {
        content: "Literacy",
        type: "vocabulary",
        meaning: "Sự biết đọc biết viết, trình độ học vấn",
        phonetic: "/ˈlɪtərəsi/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "The country has a literacy rate of almost 98%.",
            translations: { vi: "Quốc gia này có tỷ lệ biết đọc biết viết lên tới gần 98%." },
          },
        ],
        level: "C1",
        tags: ["IELTS", "Education"],
        isSystemVocab: true,
        setId: setEdu._id,
      },
    ]);

    const vocabsColloc = await Vocabulary.insertMany([
      {
        content: "Make a decision",
        type: "collocation",
        meaning: "Đưa ra quyết định",
        partOfSpeech: "phrase",
        examples: [
          {
            en: "I have to make a decision by tomorrow.",
            translations: { vi: "Tôi phải đưa ra quyết định trước ngày mai." },
          },
        ],
        level: "A2",
        tags: ["Collocation", "Make"],
        isSystemVocab: true,
        setId: setMakeDo._id,
      },
      {
        content: "Do your best",
        type: "collocation",
        meaning: "Cố gắng hết sức",
        partOfSpeech: "phrase",
        examples: [
          {
            en: "Don't worry about the exam, just do your best.",
            translations: { vi: "Đừng lo lắng về kỳ thi, hãy cố gắng hết sức mình." },
          },
        ],
        level: "A1",
        tags: ["Collocation", "Do"],
        isSystemVocab: true,
        setId: setMakeDo._id,
      },
      {
        content: "Take into account",
        type: "collocation",
        meaning: "Cân nhắc, tính toán đến",
        partOfSpeech: "phrase",
        examples: [
          {
            en: "We need to take into account the budget constraints.",
            translations: { vi: "Chúng ta cần tính đến những hạn chế về ngân sách." },
          },
        ],
        level: "B2",
        tags: ["Collocation", "Take"],
        isSystemVocab: true,
        setId: setMakeDo._id,
      },
    ]);

    const vocabsIdioms = await Vocabulary.insertMany([
      {
        content: "Bite the bullet",
        type: "idiom",
        meaning: "Cắn răng chịu đựng, dũng cảm đối mặt với khó khăn",
        partOfSpeech: "idiom",
        examples: [
          {
            en: "I hate going to the dentist, but I'll just have to bite the bullet.",
            translations: { vi: "Tôi ghét đi nha sĩ, nhưng tôi sẽ phải cắn răng chịu đựng thôi." },
          },
        ],
        level: "C1",
        tags: ["Idiom", "Daily"],
        isSystemVocab: true,
        setId: setIdioms._id,
      },
      {
        content: "Piece of cake",
        type: "idiom",
        meaning: "Dễ như ăn bánh",
        partOfSpeech: "idiom",
        examples: [
          {
            en: "The English test was a piece of cake.",
            translations: { vi: "Bài kiểm tra tiếng Anh dễ như ăn bánh." },
          },
        ],
        level: "A2",
        tags: ["Idiom", "Daily"],
        isSystemVocab: true,
        setId: setIdioms._id,
      },
      {
        content: "Under the weather",
        type: "idiom",
        meaning: "Cảm thấy không khỏe, ốm nhẹ",
        partOfSpeech: "idiom",
        examples: [
          {
            en: "I'm feeling a bit under the weather today.",
            translations: { vi: "Hôm nay tôi cảm thấy hơi khó chịu trong người." },
          },
        ],
        level: "B1",
        tags: ["Idiom", "Daily"],
        isSystemVocab: true,
        setId: setIdioms._id,
      },
    ]);

    const vocabsPhrasal = await Vocabulary.insertMany([
      {
        content: "Look forward to",
        type: "phrasal_verb",
        meaning: "Mong đợi, háo hức về điều gì",
        partOfSpeech: "phrasal verb",
        examples: [
          {
            en: "I look forward to hearing from you soon.",
            translations: { vi: "Tôi mong sớm nhận được phản hồi từ bạn." },
          },
        ],
        level: "B1",
        tags: ["Phrasal Verb", "Essential"],
        isSystemVocab: true,
        setId: setPhrasal._id,
      },
      {
        content: "Put off",
        type: "phrasal_verb",
        meaning: "Trì hoãn, dời lịch",
        partOfSpeech: "phrasal verb",
        examples: [
          {
            en: "The meeting has been put off until next week.",
            translations: { vi: "Cuộc họp đã bị hoãn lại cho đến tuần sau." },
          },
        ],
        level: "B2",
        tags: ["Phrasal Verb", "Essential"],
        isSystemVocab: true,
        setId: setPhrasal._id,
      },
    ]);

    // Cập nhật thống kê cho System Sets & Topics
    setEnv.itemCount = vocabsEnv.length;
    setEdu.itemCount = vocabsEdu.length;
    setMakeDo.itemCount = vocabsColloc.length;
    setIdioms.itemCount = vocabsIdioms.length;
    setPhrasal.itemCount = vocabsPhrasal.length;
    await Promise.all([setEnv.save(), setEdu.save(), setMakeDo.save(), setIdioms.save(), setPhrasal.save()]);

    topicIelts.totalSets = 2;
    topicIelts.totalItems = vocabsEnv.length + vocabsEdu.length;
    topicColloc.totalSets = 1;
    topicColloc.totalItems = vocabsColloc.length;
    topicIdioms.totalSets = 1;
    topicIdioms.totalItems = vocabsIdioms.length;
    topicPhrasal.totalSets = 1;
    topicPhrasal.totalItems = vocabsPhrasal.length;
    await Promise.all([topicIelts.save(), topicColloc.save(), topicIdioms.save(), topicPhrasal.save()]);

    // ==========================================
    // 5. TẠO DỮ LIỆU "MY WORDS" CHO TEST USER
    // ==========================================
    console.log('✍️ Đang tạo dữ liệu "My Words" cho User...');

    const userTopic = await Topic.create({
      name: "Từ vựng xem phim Netflix",
      description: "Những từ tôi học được khi xem các series đình đám",
      color: "#F59E0B", // Cam
      typeId: "vocabulary",
      isSystemTopic: false,
      ownerId: testUser._id,
    });

    const userSet = await VocabSet.create({
      name: "Phim Friends - Mùa 1",
      description: "Các câu nói hay trong Friends",
      topicId: userTopic._id,
      isSystemSet: false,
      ownerId: testUser._id,
      order: 1,
    });

    const userVocabs = await Vocabulary.insertMany([
      {
        content: "Binge-watch",
        type: "vocabulary",
        meaning: "Cày phim (xem nhiều tập liên tục)",
        phonetic: "/bɪndʒ wɒtʃ/",
        partOfSpeech: "verb",
        examples: [
          {
            en: "I binge-watched the entire season of Stranger Things in one day.",
            translations: { vi: "Tôi đã cày nguyên một mùa Stranger Things trong một ngày." },
          },
        ],
        isSystemVocab: false,
        setId: userSet._id,
        ownerId: testUser._id,
      },
      {
        content: "Cliffhanger",
        type: "vocabulary",
        meaning: "Đoạn kết lửng lơ gây cấn",
        phonetic: "/ˈklɪfhæŋər/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "The episode ended on a cliffhanger.",
            translations: { vi: "Tập phim kết thúc ở một tình tiết gay cấn." },
          },
        ],
        isSystemVocab: false,
        setId: userSet._id,
        ownerId: testUser._id,
      },
      {
        content: "Plot twist",
        type: "vocabulary",
        meaning: "Tình tiết bất ngờ, cú lật mặt",
        phonetic: "/plɒt twɪst/",
        partOfSpeech: "noun",
        examples: [
          {
            en: "The movie had a massive plot twist at the end.",
            translations: { vi: "Bộ phim có một cú lật mặt cực lớn ở phút cuối." },
          },
        ],
        isSystemVocab: false,
        setId: userSet._id,
        ownerId: testUser._id,
      },
    ]);

    userSet.itemCount = userVocabs.length;
    await userSet.save();

    userTopic.totalSets = 1;
    userTopic.totalItems = userVocabs.length;
    await userTopic.save();

    // ==========================================
    // 6. TẠO DỮ LIỆU USER PROGRESS (UserSetProgress & UserVocabulary)
    // ==========================================
    console.log("📈 Đang tạo tiến trình học tập (UserSetProgress & UserVocabulary)...");

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    // 6.1. UserSetProgress (SRS Progress theo bộ từ)
    await UserSetProgress.insertMany([
      {
        userId: testUser._id,
        setId: setEnv._id,
        status: "mastered",
        interval: 30,
        nextReviewDate: endOfToday, // Cần ôn tập hôm nay
        reviewCount: 15,
        lastReviewedAt: new Date(Date.now() - 30 * 86400000),
      },
      {
        userId: testUser._id,
        setId: setEdu._id,
        status: "fluent",
        interval: 14,
        nextReviewDate: futureDate, // Chưa cần ôn
        reviewCount: 8,
        lastReviewedAt: new Date(Date.now() - 14 * 86400000),
      },
      {
        userId: testUser._id,
        setId: setMakeDo._id,
        status: "applicable",
        interval: 7,
        nextReviewDate: endOfToday, // Cần ôn tập hôm nay
        reviewCount: 5,
        lastReviewedAt: new Date(Date.now() - 7 * 86400000),
      },
      {
        userId: testUser._id,
        setId: setIdioms._id,
        status: "recognized",
        interval: 3,
        nextReviewDate: endOfToday, // Cần ôn tập hôm nay
        reviewCount: 3,
        lastReviewedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        userId: testUser._id,
        setId: setPhrasal._id,
        status: "vague",
        interval: 1,
        nextReviewDate: endOfToday, // Cần ôn tập hôm nay
        reviewCount: 1,
        lastReviewedAt: new Date(Date.now() - 86400000),
      },
      {
        userId: testUser._id,
        setId: userSet._id,
        status: "new",
        interval: 0,
        nextReviewDate: endOfToday, // Đang học / mới học
        reviewCount: 0,
        lastReviewedAt: new Date(),
      },
    ]);

    // 6.2. UserVocabulary (Thống kê chi tiết từng từ)
    await UserVocabulary.insertMany([
      // Set Env (Mastered)
      { userId: testUser._id, vocabId: vocabsEnv[0]._id, setId: setEnv._id, vocabType: "vocabulary", stats: { totalAttempts: 15, correctCount: 13, incorrectCount: 2 }, learnedDayOfWeek: "Monday", isMarkedRemembered: true },
      { userId: testUser._id, vocabId: vocabsEnv[1]._id, setId: setEnv._id, vocabType: "vocabulary", stats: { totalAttempts: 12, correctCount: 9, incorrectCount: 3 }, learnedDayOfWeek: "Monday", isMarkedRemembered: false },
      { userId: testUser._id, vocabId: vocabsEnv[2]._id, setId: setEnv._id, vocabType: "vocabulary", stats: { totalAttempts: 10, correctCount: 6, incorrectCount: 4 }, learnedDayOfWeek: "Monday", isMarkedRemembered: true },
      { userId: testUser._id, vocabId: vocabsEnv[3]._id, setId: setEnv._id, vocabType: "vocabulary", stats: { totalAttempts: 14, correctCount: 12, incorrectCount: 2 }, learnedDayOfWeek: "Monday", isMarkedRemembered: false },
      { userId: testUser._id, vocabId: vocabsEnv[4]._id, setId: setEnv._id, vocabType: "vocabulary", stats: { totalAttempts: 11, correctCount: 10, incorrectCount: 1 }, learnedDayOfWeek: "Monday", isMarkedRemembered: true },

      // Set Edu (Fluent)
      { userId: testUser._id, vocabId: vocabsEdu[0]._id, setId: setEdu._id, vocabType: "vocabulary", stats: { totalAttempts: 8, correctCount: 7, incorrectCount: 1 }, learnedDayOfWeek: "Tuesday", isMarkedRemembered: true },
      { userId: testUser._id, vocabId: vocabsEdu[1]._id, setId: setEdu._id, vocabType: "vocabulary", stats: { totalAttempts: 9, correctCount: 6, incorrectCount: 3 }, learnedDayOfWeek: "Tuesday", isMarkedRemembered: false },
      { userId: testUser._id, vocabId: vocabsEdu[2]._id, setId: setEdu._id, vocabType: "vocabulary", stats: { totalAttempts: 7, correctCount: 5, incorrectCount: 2 }, learnedDayOfWeek: "Tuesday", isMarkedRemembered: true },

      // Set Colloc (Applicable)
      { userId: testUser._id, vocabId: vocabsColloc[0]._id, setId: setMakeDo._id, vocabType: "collocation", stats: { totalAttempts: 6, correctCount: 4, incorrectCount: 2 }, learnedDayOfWeek: "Wednesday", isMarkedRemembered: false },
      { userId: testUser._id, vocabId: vocabsColloc[1]._id, setId: setMakeDo._id, vocabType: "collocation", stats: { totalAttempts: 5, correctCount: 4, incorrectCount: 1 }, learnedDayOfWeek: "Wednesday", isMarkedRemembered: true },
      { userId: testUser._id, vocabId: vocabsColloc[2]._id, setId: setMakeDo._id, vocabType: "collocation", stats: { totalAttempts: 7, correctCount: 4, incorrectCount: 3 }, learnedDayOfWeek: "Wednesday", isMarkedRemembered: false },

      // Set Idioms (Recognized)
      { userId: testUser._id, vocabId: vocabsIdioms[0]._id, setId: setIdioms._id, vocabType: "idiom", stats: { totalAttempts: 5, correctCount: 2, incorrectCount: 3 }, learnedDayOfWeek: "Thursday", isMarkedRemembered: false },
      { userId: testUser._id, vocabId: vocabsIdioms[1]._id, setId: setIdioms._id, vocabType: "idiom", stats: { totalAttempts: 4, correctCount: 3, incorrectCount: 1 }, learnedDayOfWeek: "Thursday", isMarkedRemembered: true },
      { userId: testUser._id, vocabId: vocabsIdioms[2]._id, setId: setIdioms._id, vocabType: "idiom", stats: { totalAttempts: 6, correctCount: 2, incorrectCount: 4 }, learnedDayOfWeek: "Thursday", isMarkedRemembered: false },

      // Set Phrasal (Vague)
      { userId: testUser._id, vocabId: vocabsPhrasal[0]._id, setId: setPhrasal._id, vocabType: "phrasal_verb", stats: { totalAttempts: 3, correctCount: 1, incorrectCount: 2 }, learnedDayOfWeek: "Friday", isMarkedRemembered: false },
      { userId: testUser._id, vocabId: vocabsPhrasal[1]._id, setId: setPhrasal._id, vocabType: "phrasal_verb", stats: { totalAttempts: 2, correctCount: 1, incorrectCount: 1 }, learnedDayOfWeek: "Friday", isMarkedRemembered: false },

      // User Set (New)
      { userId: testUser._id, vocabId: userVocabs[0]._id, setId: userSet._id, vocabType: "vocabulary", stats: { totalAttempts: 1, correctCount: 1, incorrectCount: 0 }, learnedDayOfWeek: "Saturday", isMarkedRemembered: true },
      { userId: testUser._id, vocabId: userVocabs[1]._id, setId: userSet._id, vocabType: "vocabulary", stats: { totalAttempts: 2, correctCount: 1, incorrectCount: 1 }, learnedDayOfWeek: "Saturday", isMarkedRemembered: false },
      { userId: testUser._id, vocabId: userVocabs[2]._id, setId: userSet._id, vocabType: "vocabulary", stats: { totalAttempts: 1, correctCount: 0, incorrectCount: 1 }, learnedDayOfWeek: "Saturday", isMarkedRemembered: false },
    ]);

    // ==========================================
    // 7. TẠO LỊCH TRÌNH ÔN TẬP (ScheduledTask & DailyPlan)
    // ==========================================
    console.log("⏰ Đang tạo Lịch trình và Kế hoạch ngày (ScheduledTask & DailyPlan)...");

    const taskMorning = await ScheduledTask.create({
      userId: testUser._id,
      name: "Học từ mới buổi sáng",
      time: "08:00",
      setIds: [setEnv._id, setEdu._id],
      methods: ["flashcard", "meaning"],
      source: "user",
      status: "todo",
      reminderEnabled: true,
      cachedSetsCount: 2,
    });

    const taskEvening = await ScheduledTask.create({
      userId: testUser._id,
      name: "Ôn tập Collocations & Idioms",
      time: "20:00",
      setIds: [setMakeDo._id, setIdioms._id],
      methods: ["rewrite", "picture"],
      source: "user",
      status: "todo",
      reminderEnabled: true,
      cachedSetsCount: 2,
    });

    const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    await DailyPlan.create({
      userId: testUser._id,
      date: todayDate,
      dayOfWeek: todayStr,
      sessions: [
        {
          scheduledTaskId: taskMorning._id,
          taskName: taskMorning.name,
          time: taskMorning.time,
          vocabIds: [vocabsEnv[0]._id, vocabsEnv[1]._id, vocabsEdu[0]._id],
          actionType: "learn",
          methods: taskMorning.methods,
          isCompleted: false,
        },
        {
          scheduledTaskId: taskEvening._id,
          taskName: taskEvening.name,
          time: taskEvening.time,
          vocabIds: [vocabsColloc[0]._id, vocabsColloc[1]._id, vocabsIdioms[0]._id],
          actionType: "review",
          methods: taskEvening.methods,
          isCompleted: false,
        },
      ],
      isOverallCompleted: false,
      totalWords: 6,
      completedWords: 0,
    });

    // ==========================================
    // 8. TẠO LỊCH SỬ ÔN TẬP (ReviewLog)
    // ==========================================
    console.log("📜 Đang tạo Lịch sử ôn tập (ReviewLog)...");

    await ReviewLog.insertMany([
      // Session 1: Học mới (learning)
      {
        userId: testUser._id,
        sessionId: "session_seed_learn_1",
        setId: setEnv._id,
        sessionType: "learning",
        setName: "Environment & Nature (Học mới)",
        logs: [
          { vocabId: vocabsEnv[0]._id, result: "good", actionType: "flashcard", responseTime: 1200, isFixed: true },
          { vocabId: vocabsEnv[1]._id, result: "easy", actionType: "quiz", responseTime: 1500, isFixed: true },
          { vocabId: vocabsEnv[2]._id, result: "hard", actionType: "quiz", responseTime: 3200, isFixed: false },
          { vocabId: vocabsEnv[3]._id, result: "good", actionType: "flashcard", responseTime: 900, isFixed: true },
          { vocabId: vocabsEnv[4]._id, result: "easy", actionType: "quiz", responseTime: 1100, isFixed: true },
        ],
        reviewedAt: new Date(Date.now() - 2 * 86400000), // 2 ngày trước
      },
      // Session 2: Ôn tập (review)
      {
        userId: testUser._id,
        sessionId: "session_seed_review_1",
        setId: setMakeDo._id,
        sessionType: "review",
        setName: "Make & Do Collocations (Ôn tập định kỳ)",
        logs: [
          { vocabId: vocabsColloc[0]._id, result: "good", actionType: "quiz", responseTime: 1400, isFixed: true },
          { vocabId: vocabsColloc[1]._id, result: "again", actionType: "typing", responseTime: 4200, isFixed: false },
          { vocabId: vocabsColloc[2]._id, result: "hard", actionType: "writing", responseTime: 3100, isFixed: false },
        ],
        reviewedAt: new Date(Date.now() - 86400000), // Hôm qua
      },
      // Session 3: Luyện tập (practice)
      {
        userId: testUser._id,
        sessionId: "session_seed_practice_1",
        setId: setIdioms._id,
        sessionType: "practice",
        setName: "Common Daily Idioms (Game Luyện tập)",
        logs: [
          { vocabId: vocabsIdioms[0]._id, result: "good", actionType: "picture", responseTime: 1800, isFixed: true },
          { vocabId: vocabsIdioms[1]._id, result: "good", actionType: "flashcard", responseTime: 1200, isFixed: true },
          { vocabId: vocabsIdioms[2]._id, result: "easy", actionType: "quiz", responseTime: 850, isFixed: true },
        ],
        reviewedAt: new Date(Date.now() - 4 * 3600000), // 4 giờ trước
      },
      // Session 4: Học mới (learning)
      {
        userId: testUser._id,
        sessionId: "session_seed_learn_2",
        setId: setEdu._id,
        sessionType: "learning",
        setName: "Education & Learning (Học mới)",
        logs: [
          { vocabId: vocabsEdu[0]._id, result: "good", actionType: "flashcard", responseTime: 1300, isFixed: true },
          { vocabId: vocabsEdu[1]._id, result: "good", actionType: "quiz", responseTime: 1600, isFixed: true },
          { vocabId: vocabsEdu[2]._id, result: "easy", actionType: "typing", responseTime: 2100, isFixed: true },
        ],
        reviewedAt: new Date(Date.now() - 3 * 86400000), // 3 ngày trước
      },
      // Session 5: Ôn tập (review)
      {
        userId: testUser._id,
        sessionId: "session_seed_review_2",
        setId: userSet._id,
        sessionType: "review",
        setName: "Phim Friends - Mùa 1 (Ôn tập tự do)",
        logs: [
          { vocabId: userVocabs[0]._id, result: "good", actionType: "flashcard", responseTime: 1100, isFixed: true },
          { vocabId: userVocabs[1]._id, result: "again", actionType: "typing", responseTime: 3800, isFixed: false },
          { vocabId: userVocabs[2]._id, result: "easy", actionType: "quiz", responseTime: 950, isFixed: true },
        ],
        reviewedAt: new Date(Date.now() - 12 * 3600000), // 12 giờ trước
      },
    ]);

    console.log("✅ SEED DATABASE THÀNH CÔNG TOÀN BỘ!");
    console.log("----------------------------------------------------");
    console.log("💡 Tài khoản Test:");
    console.log("   Email: test@test.com");
    console.log("   Pass:  password123");
    console.log("----------------------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi seed database:", error);
    process.exit(1);
  }
};

seedDatabase();
