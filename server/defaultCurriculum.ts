import { Question, SectionType, EnglishLevel } from '../src/types/learning.js';

export interface CurriculumItem {
  id: string;
  section: SectionType;
  skill_id: string;
  skill_name: string;
  difficulty: EnglishLevel;
  context_topic: 'general' | 'workplace_tech';
  question: Question;
}

export const DEFAULT_CURRICULUM: CurriculumItem[] = [
  // --- PART A: GRAMMAR ---
  {
    id: 'gram-b2-past-perf-1',
    section: 'grammar',
    skill_id: 'past_simple_vs_past_perfect',
    skill_name: 'Past Simple vs. Past Perfect',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-past-perf-1',
      section: 'grammar',
      skill_id: 'past_simple_vs_past_perfect',
      skill_name: 'Past Simple vs. Past Perfect',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Dùng Past Perfect (had + V3/ed) để diễn tả một hành động đã hoàn tất TRƯỚC một thời điểm hoặc một hành động khác trong quá khứ.',
      prompt: 'By the time the lead developer joined the post-mortem meeting, the team ____ the critical memory leak.',
      options: [
        { id: 'A', text: 'already resolved' },
        { id: 'B', text: 'had already resolved' },
        { id: 'C', text: 'has already resolved' },
        { id: 'D', text: 'was already resolving' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'had already resolved',
      accepted_alternatives: ['had resolved'],
      hint: 'Chú ý cụm từ "By the time + Past Simple" (Vào thời điểm...). Việc sửa lỗi rò rỉ bộ nhớ xảy ra trước hay sau khi lead developer tham gia cuộc họp?',
      explanation_rule: 'Cấu trúc "By the time + S + V(past simple), S + had + V3/ed". Hành động sửa lỗi xảy ra và hoàn tất trước thời điểm lead developer vào họp.'
    }
  },
  {
    id: 'gram-b2-conditionals-1',
    section: 'grammar',
    skill_id: 'third_and_mixed_conditionals',
    skill_name: 'Third & Mixed Conditionals',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-cond-1',
      section: 'grammar',
      skill_id: 'third_and_mixed_conditionals',
      skill_name: 'Third & Mixed Conditionals',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Mixed Conditional kết hợp điều kiện trong quá khứ với kết quả ở hiện tại: If + had + V3/ed, S + would + V(nguyên mẫu).',
      prompt: 'If we had implemented automated integration tests last month, our deployment process ____ much smoother today.',
      options: [
        { id: 'A', text: 'would have been' },
        { id: 'B', text: 'would be' },
        { id: 'C', text: 'will be' },
        { id: 'D', text: 'had been' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'would be',
      accepted_alternatives: ['would be'],
      hint: 'Hãy nhìn từ chỉ thời gian ở vế kết quả: "today" (hôm nay - hiện tại). Nếu một việc trong quá khứ (last month) ảnh hưởng đến hiện tại (today), ta dùng câu điều kiện trộn.',
      explanation_rule: 'Mixed Conditional loại 3-2: Vế If nói về giả định quá khứ ("had implemented last month"), vế kết quả nói về thực tế hiện tại ("today"), do đó dùng "would + V" thay vì "would have + V3".'
    }
  },
  {
    id: 'gram-b2-inversion-1',
    section: 'grammar',
    skill_id: 'negative_inversion',
    skill_name: 'Inversion with Negative Adverbials',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-inv-1',
      section: 'grammar',
      skill_id: 'negative_inversion',
      skill_name: 'Inversion with Negative Adverbials',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Khi đặt các trạng từ mang ý nghĩa phủ định/giới hạn (Rarely, Seldom, Never, Hardly) lên đầu câu để nhấn mạnh, ta đảo trợ động từ lên trước chủ ngữ.',
      prompt: 'Seldom ____ such a significant performance improvement after just a minor configuration tweak.',
      options: [
        { id: 'A', text: 'we have observed' },
        { id: 'B', text: 'have we observed' },
        { id: 'C', text: 'we observed' },
        { id: 'D', text: 'did we observed' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'have we observed',
      accepted_alternatives: ['have we observed'],
      hint: 'Khi "Seldom" đứng đầu câu, cần đảo trợ động từ lên trước chủ ngữ (như dạng câu hỏi).',
      explanation_rule: 'Cấu trúc đảo ngữ: Negative Adverb + Auxiliary Verb + Subject + Main Verb. "have we observed" là dạng chuẩn xác.'
    }
  },
  {
    id: 'gram-b2-passive-tech-1',
    section: 'grammar',
    skill_id: 'passive_voice_tech',
    skill_name: 'Passive Voice in Technical Reports',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-passive-1',
      section: 'grammar',
      skill_id: 'passive_voice_tech',
      skill_name: 'Passive Voice in Technical Reports',
      question_type: 'fill_in_blank',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Trong báo cáo kỹ thuật và ticket Jira, thể bị động (be + V3/ed) thường được dùng để nhấn mạnh vào hệ thống/lỗi thay vì người thực hiện.',
      prompt: 'Complete the sentence with the correct passive form of "identify":\nDuring the security audit, two major vulnerabilities ________________ (identify) in the authentication flow.',
      expected_answer_text: 'were identified',
      accepted_alternatives: ['were identified', 'had been identified'],
      hint: 'Chủ ngữ "two major vulnerabilities" là số nhiều, và sự kiện "During the security audit" xảy ra trong quá khứ.',
      explanation_rule: 'Dùng thì Past Simple thể bị động cho chủ ngữ số nhiều: "were + identified".'
    }
  },
  {
    id: 'gram-b2-used-to-1',
    section: 'grammar',
    skill_id: 'used_to_patterns',
    skill_name: 'used to vs. be/get used to',
    difficulty: 'B2',
    context_topic: 'general',
    question: {
      id: 'q-used-to-1',
      section: 'grammar',
      skill_id: 'used_to_patterns',
      skill_name: 'used to vs. be/get used to',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'general',
      concept_intro: '"used to + V" = thói quen trong quá khứ (nay không còn). "be/get used to + V-ing/Noun" = đã quen hoặc đang dần quen với điều gì.',
      prompt: 'After three months of working remotely, Lan is finally getting used to ____ her daily schedule independently.',
      options: [
        { id: 'A', text: 'manage' },
        { id: 'B', text: 'managing' },
        { id: 'C', text: 'managed' },
        { id: 'D', text: 'have managed' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'managing',
      accepted_alternatives: ['managing'],
      hint: 'Sau cụm "get used to" (dần quen với việc gì), động từ theo sau ở dạng nào?',
      explanation_rule: 'Cấu trúc "get used to + V-ing". Trong cấu trúc này, "to" là giới từ, nên động từ phải thêm đuôi -ing.'
    }
  },

  // --- PART B: VOCABULARY ---
  {
    id: 'vocab-b2-mitigate',
    section: 'vocabulary',
    skill_id: 'collocation_mitigate',
    skill_name: 'Collocations with Mitigate',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-mitigate',
      section: 'vocabulary',
      skill_id: 'collocation_mitigate',
      skill_name: 'Collocations with Mitigate',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'mitigate',
        part_of_speech: 'verb',
        ipa: '/ˈmɪtɪɡeɪt/',
        pronunciation_tip: 'Trọng âm rơi vào âm tiết đầu tiên: MIT-i-gate. Đọc dứt khoát âm cuối /t/.',
        meaning: 'giảm nhẹ mức độ nghiêm trọng hoặc tác động tiêu cực của một vấn đề/rủi ro',
        collocation_pattern: 'mitigate + risk / impact / damage / vulnerability',
        example_general: 'Planting more trees along the riverbank helped mitigate soil erosion.',
        example_workplace: 'Implementing rate limiting will mitigate the risk of denial-of-service attacks.',
        similar_word_comparison: {
          word: 'minimize',
          difference: '"mitigate" nhấn mạnh vào việc làm dịu bớt hậu quả tai hại; trong khi "minimize" nhấn mạnh vào việc giảm số lượng/quy mô xuống mức nhỏ nhất có thể.'
        }
      },
      prompt: 'Choose the most natural collocation to complete the sentence:\n"To ____ the impact of unexpected database downtime, we configured automatic read replicas across two separate availability zones."',
      options: [
        { id: 'A', text: 'mitigate' },
        { id: 'B', text: 'decline' },
        { id: 'C', text: 'refuse' },
        { id: 'D', text: 'fade' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'mitigate',
      accepted_alternatives: ['mitigate'],
      hint: 'Từ nào thường đi kèm với danh từ "the impact" mang nghĩa làm giảm tác hại tiêu cực?',
      explanation_rule: 'Collocation chuẩn trong môi trường chuyên nghiệp: "mitigate the impact / risk". Các từ khác (decline, refuse, fade) không kết hợp với tân ngữ "the impact" theo nghĩa này.'
    }
  },
  {
    id: 'vocab-b2-streamline',
    section: 'vocabulary',
    skill_id: 'collocation_streamline',
    skill_name: 'Collocations with Streamline',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-streamline',
      section: 'vocabulary',
      skill_id: 'collocation_streamline',
      skill_name: 'Collocations with Streamline',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'streamline',
        part_of_speech: 'verb',
        ipa: '/ˈstriːmlaɪn/',
        pronunciation_tip: 'Âm /iː/ kéo dài trong "stream", trọng âm rơi vào âm đầu: STREAM-line.',
        meaning: 'tinh gọn hoá, đơn giản hoá quy trình để tăng hiệu quả và tiết kiệm thời gian',
        collocation_pattern: 'streamline + process / workflow / operations',
        example_general: 'The clinic introduced an online booking form to streamline patient admissions.',
        example_workplace: 'Our engineering lead introduced CI/CD pipelines to streamline the release workflow.',
        similar_word_comparison: {
          word: 'simplify',
          difference: '"simplify" chỉ đơn thuần là làm cho dễ hiểu hơn; "streamline" ngụ ý loại bỏ các bước thừa mứa để hoạt động trơn tru và nhanh gọn hơn.'
        }
      },
      prompt: 'Which word best fills the blank to describe eliminating redundant operational steps?\n"Our company upgraded its software infrastructure to ____ the customer onboarding process."',
      options: [
        { id: 'A', text: 'streamline' },
        { id: 'B', text: 'elongate' },
        { id: 'C', text: 'scatter' },
        { id: 'D', text: 'postpone' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'streamline',
      accepted_alternatives: ['streamline'],
      hint: 'Tìm từ mang nghĩa làm tinh gọn quy trình bằng cách cắt bỏ các bước rườm rà.',
      explanation_rule: '"streamline the process" là collocation mang ý nghĩa tối ưu hoá và làm cho quy trình diễn ra nhanh chóng, trơn tru hơn.'
    }
  },
  {
    id: 'vocab-b2-leverage',
    section: 'vocabulary',
    skill_id: 'collocation_leverage',
    skill_name: 'Collocations with Leverage',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-leverage',
      section: 'vocabulary',
      skill_id: 'collocation_leverage',
      skill_name: 'Collocations with Leverage',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'leverage',
        part_of_speech: 'verb',
        ipa: '/ˈlev.ər.ɪdʒ/',
        pronunciation_tip: 'Trọng âm rơi vào âm đầu tiên LEV-er-idge. Chú ý âm cuối /dʒ/.',
        meaning: 'tận dụng tối đa nguồn lực, công cụ hoặc lợi thế sẵn có để đạt kết quả tốt nhất',
        collocation_pattern: 'leverage + technology / existing tools / data / strengths',
        example_general: 'She was able to leverage her background in graphic design when building the website.',
        example_workplace: 'We should leverage existing caching layers instead of writing custom memoization.',
        similar_word_comparison: {
          word: 'use',
          difference: '"use" là sử dụng thông thường; "leverage" mang hàm ý tận dụng một đòn bẩy hoặc thế mạnh có sẵn để nhân đôi hiệu quả.'
        }
      },
      prompt: 'Choose the best verb to describe taking strategic advantage of existing systems:\n"Rather than starting from scratch, we decided to ____ our existing cloud infrastructure."',
      options: [
        { id: 'A', text: 'leverage' },
        { id: 'B', text: 'discard' },
        { id: 'C', text: 'evade' },
        { id: 'D', text: 'suppress' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'leverage',
      accepted_alternatives: ['leverage'],
      hint: 'Từ nào mang nghĩa tận dụng đòn bẩy/thế mạnh có sẵn trong môi trường công việc?',
      explanation_rule: '"leverage existing infrastructure" là cách diễn đạt chuyên nghiệp phổ biến để chỉ việc tận dụng tối đa hệ thống đã có.'
    }
  },

  // --- PART C: READING ---
  {
    id: 'read-b2-tech-1',
    section: 'reading',
    skill_id: 'reading_inference_tech',
    skill_name: 'Reading Comprehension & Inference',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-1',
      section: 'reading',
      skill_id: 'reading_inference_tech',
      skill_name: 'Reading Comprehension & Inference',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'Balancing Speed and Code Maintainability',
        word_count: 128,
        topic: 'Software Engineering Best Practices',
        text: 'Early-stage startups frequently face a critical dilemma: ship new product features quickly to attract users, or invest engineering time in building robust, modular architecture. While shortcuts—often referred to as technical debt—can accelerate immediate product launches, neglecting automated testing and documentation consistently leads to severe bottlenecks later. When a code repository grows without clear boundaries, adding even a minor change can introduce unforeseen regressions. Experienced tech leads therefore advocate for an incremental compromise. Rather than halting development for a complete rewrite, high-performing teams allocate roughly twenty percent of every sprint specifically to refactoring vulnerable modules and expanding test coverage. This disciplined rhythm ensures momentum without compromising system resilience.'
      },
      prompt: 'Based on the passage, what strategy do experienced tech leads recommend to manage technical debt?',
      options: [
        { id: 'A', text: 'Halting all new feature development until the entire codebase is rewritten' },
        { id: 'B', text: 'Dedicate a fixed portion of each development sprint to continuous refactoring' },
        { id: 'C', text: 'Prioritizing immediate product launches over long-term code resilience' },
        { id: 'D', text: 'Relying exclusively on manual QA testers instead of automated testing' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'Dedicate a fixed portion of each development sprint to continuous refactoring',
      accepted_alternatives: ['B'],
      hint: 'Đọc kỹ 2 câu cuối cùng của đoạn văn: "high-performing teams allocate roughly twenty percent of every sprint specifically to refactoring..."',
      explanation_rule: 'Đoạn văn nêu rõ: "Rather than halting development for a complete rewrite, high-performing teams allocate roughly twenty percent of every sprint specifically to refactoring". Đáp án B phản ánh chính xác giải pháp này.'
    }
  },
  {
    id: 'read-b2-async-1',
    section: 'reading',
    skill_id: 'reading_async_comm',
    skill_name: 'Async Communication Nuance',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-2',
      section: 'reading',
      skill_id: 'reading_async_comm',
      skill_name: 'Async Communication Nuance',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'The Art of Asynchronous Collaboration',
        word_count: 122,
        topic: 'Remote Engineering Culture',
        text: 'In globally distributed engineering teams, asynchronous communication is not merely a convenience; it is a prerequisite for deep focus. Constantly requiring synchronous meetings interrupts engineers during complex problem-solving intervals, fracturing productivity. Successful distributed teams establish clear communication protocols. Instead of sending fragmentary Slack messages asking "Are you free to talk?", developers compose thorough context-rich updates: detailing the problem, linking relevant commits, outlining attempted solutions, and stating the exact decision required. This deliberate discipline eliminates needless back-and-forth messaging and empowers teammates across opposing time zones to make autonomous progress without awaiting live consensus.'
      },
      prompt: 'According to the passage, what characterizes effective asynchronous communication?',
      options: [
        { id: 'A', text: 'Sending frequent brief messages to check if teammates are available' },
        { id: 'B', text: 'Providing self-contained, context-rich documentation of problems and proposed decisions' },
        { id: 'C', text: 'Requiring live video calls whenever a non-trivial issue arises' },
        { id: 'D', text: 'Waiting for synchronous consensus before making any engineering progress' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'Providing self-contained, context-rich documentation of problems and proposed decisions',
      accepted_alternatives: ['B'],
      hint: 'Nhìn vào đoạn: "developers compose thorough context-rich updates: detailing the problem, linking relevant commits..."',
      explanation_rule: 'Đoạn văn nhấn mạnh việc cung cấp đầy đủ bối cảnh, liên kết commit và yêu cầu quyết định rõ ràng trong một thông điệp trọn vẹn để tránh trao đổi vụn vặt.'
    }
  },

  // --- PART D: WRITING ---
  {
    id: 'write-b2-workplace-1',
    section: 'writing',
    skill_id: 'workplace_slack_update',
    skill_name: 'Clear Workplace Status Updates',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-1',
      section: 'writing',
      skill_id: 'workplace_slack_update',
      skill_name: 'Clear Workplace Status Updates',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Trong giao tiếp công việc (Slack / email), một cập nhật trạng thái tốt cần ngắn gọn: nêu rõ tình hình hiện tại, lý do chậm trễ (nếu có), và bước tiếp theo cụ thể.',
      prompt: 'Write 2 to 3 sentences updating your team on a task that is taking longer than expected due to an unexpected bug. State what happened, what you are doing now, and when you expect to finish.',
      hint: 'Bạn có thể sử dụng các mẫu câu như: "I ran into an issue with...", "I am currently investigating...", hoặc "I expect to push the fix by 4 PM."',
      explanation_rule: 'Tập trung vào tính rõ ràng, thì động từ phù hợp (Past Simple cho sự cố, Present Continuous cho hành động hiện tại, Future cho mốc hoàn thành) và từ nối lịch sự, chuyên nghiệp.'
    }
  },
  {
    id: 'write-b2-code-review-1',
    section: 'writing',
    skill_id: 'workplace_pr_request',
    skill_name: 'Constructive Pull Request Note',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-2',
      section: 'writing',
      skill_id: 'workplace_pr_request',
      skill_name: 'Constructive Pull Request Note',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Khi gửi Pull Request, một mô tả ngắn gọn giúp đồng nghiệp review nhanh hơn: tóm tắt thay đổi chính và chỉ ra module cần lưu ý.',
      prompt: 'Write 2 to 3 sentences submitting a pull request for review. Mention what feature was added, note that unit tests were included, and ask a colleague to review when available.',
      hint: 'Sử dụng cấu trúc: "I have opened a PR for...", "Unit test coverage has been updated to...", "Please take a look when you have a moment."',
      explanation_rule: 'Sử dụng Present Perfect (have opened/added) cho công việc vừa hoàn thành và lời đề nghị lịch sự (Could you please review...).'
    }
  },
  {
    id: 'write-b2-client-delay-1',
    section: 'writing',
    skill_id: 'workplace_delay_notice',
    skill_name: 'Transparent Client Delay Notification',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-delay-1',
      section: 'writing',
      skill_id: 'workplace_delay_notice',
      skill_name: 'Transparent Client Delay Notification',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Khi phải thông báo chậm trễ tiến độ cho khách hàng hoặc bên liên quan, cần giữ thái độ chuyên nghiệp, giải thích ngắn gọn nguyên nhân kỹ thuật và đưa ra cam kết mới khả thi.',
      prompt: 'Write 2 to 3 sentences informing an external client that the scheduled milestone demo will be postponed by 24 hours to ensure thorough data validation.',
      hint: 'Mẫu câu gợi ý: "Due to additional validation checks on our latest build, we would like to reschedule...", "We want to ensure everything runs smoothly, so the new demo time will be tomorrow at..."',
      explanation_rule: 'Tập trung vào từ ngữ lịch sự (reschedule, ensure stability), giải thích nguyên nhân tích cực (data validation) và đưa ra mốc thời gian rõ ràng.'
    }
  },
  {
    id: 'write-b2-postmortem-1',
    section: 'writing',
    skill_id: 'workplace_postmortem_action',
    skill_name: 'Post-Mortem Preventative Action Item',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-postmortem-1',
      section: 'writing',
      skill_id: 'workplace_postmortem_action',
      skill_name: 'Post-Mortem Preventative Action Item',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Trong tài liệu Post-mortem sau sự cố hệ thống, phần Action Items cần cụ thể: ai làm gì, công cụ nào, và ngăn chặn lỗi tái diễn như thế nào.',
      prompt: 'Write 2 sentences proposing an engineering preventative measure following a production outage caused by an unhandled database timeout.',
      hint: 'Mẫu câu gợi ý: "To prevent similar timeouts in production, we will implement exponential backoff retry logic...", "Additionally, alerting thresholds on database latency will be tightened to notify on-call engineers earlier."',
      explanation_rule: 'Sử dụng các cụm từ hành động dứt khoát: "we will implement...", "to prevent recurrence...", "thresholds will be calibrated...".'
    }
  },

  // --- ADDITIONAL RICH GRAMMAR ITEMS ---
  {
    id: 'gram-b2-modals-deduction-1',
    section: 'grammar',
    skill_id: 'modals_of_deduction_past',
    skill_name: 'Modals of Deduction in the Past',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-modal-ded-1',
      section: 'grammar',
      skill_id: 'modals_of_deduction_past',
      skill_name: 'Modals of Deduction in the Past',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Dùng "must have + V3" khi gần như chắc chắn điều gì đã xảy ra trong quá khứ dựa trên bằng chứng cụ thể. Dùng "can\'t / couldn\'t have + V3" khi điều đó là bất khả thi.',
      prompt: 'The server crashed immediately after the midnight deploy. Looking at the error stack, the database migration ____ properly before traffic surged.',
      options: [
        { id: 'A', text: 'must not have run' },
        { id: 'B', text: 'should have run' },
        { id: 'C', text: 'would not run' },
        { id: 'D', text: 'might not run' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'must not have run',
      accepted_alternatives: ['must not have run', 'cannot have run'],
      hint: 'Dựa trên bằng chứng lỗi (error stack), người nói đưa ra kết luận gần như chắc chắn về việc migration đã không được chạy.',
      explanation_rule: 'Dùng "must not have + V3" để suy đoán chắc chắn về một sự việc không diễn ra trong quá khứ dựa trên bằng chứng rõ ràng.'
    }
  },
  {
    id: 'gram-b2-subjunctive-1',
    section: 'grammar',
    skill_id: 'subjunctive_recommendations',
    skill_name: 'Subjunctive in Formal Directives',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-subj-1',
      section: 'grammar',
      skill_id: 'subjunctive_recommendations',
      skill_name: 'Subjunctive in Formal Directives',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Sau các tính từ hoặc động từ mang tính yêu cầu/khuyến nghị (crucial, essential, vital, recommend that), mệnh đề theo sau dùng động từ nguyên mẫu không chia (bare infinitive).',
      prompt: 'It is essential that every backend developer ____ the multi-factor authentication protocol before accessing staging environments.',
      options: [
        { id: 'A', text: 'follow' },
        { id: 'B', text: 'follows' },
        { id: 'C', text: 'followed' },
        { id: 'D', text: 'is following' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'follow',
      accepted_alternatives: ['follow'],
      hint: 'Cấu trúc giả định thức hiện tại (Present Subjunctive): "It is essential that + S + V(nguyên thể không to)". Dù chủ ngữ là số ít, động từ vẫn không thêm -s.',
      explanation_rule: 'Quy tắc: It is essential/crucial/vital that + S + V(bare infinitive). Do đó chọn "follow" thay vì "follows".'
    }
  },
  {
    id: 'gram-b2-cleft-emphasis-1',
    section: 'grammar',
    skill_id: 'cleft_sentences_emphasis',
    skill_name: 'Cleft Sentences for Precision',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-cleft-1',
      section: 'grammar',
      skill_id: 'cleft_sentences_emphasis',
      skill_name: 'Cleft Sentences for Precision',
      question_type: 'fill_in_blank',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Dùng cấu trúc câu chẻ "It was [X] that/which [Y]" để nhấn mạnh chính xác yếu tố cốt lõi gây ra kết quả.',
      prompt: 'Complete the cleft sentence to emphasize that misconfigured environment variables triggered the issue:\n"It ________________ misconfigured environment variables that triggered the build failure, not code syntax."',
      expected_answer_text: 'was',
      accepted_alternatives: ['was', 'is'],
      hint: 'Sự việc xảy ra trong quá khứ ("triggered"). Cấu trúc câu chẻ bắt đầu bằng "It + be..."',
      explanation_rule: 'Cấu trúc Cleft sentence quá khứ: "It was + [thành phần nhấn mạnh] + that + V(past)".'
    }
  },

  // --- ADDITIONAL RICH VOCABULARY ITEMS ---
  {
    id: 'vocab-b2-tradeoff',
    section: 'vocabulary',
    skill_id: 'collocation_tradeoff',
    skill_name: 'Collocations with Trade-off',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-tradeoff',
      section: 'vocabulary',
      skill_id: 'collocation_tradeoff',
      skill_name: 'Collocations with Trade-off',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'trade-off',
        part_of_speech: 'noun',
        ipa: '/ˈtreɪd.ɒf/',
        pronunciation_tip: 'Trọng âm ở âm đầu TRADE-off. Nối âm /d/ sang /ɒ/.',
        meaning: 'sự đánh đổi, sự thoả hiệp giữa hai mục tiêu đối nghịch nhau (ví dụ tốc độ vs độ an toàn)',
        collocation_pattern: 'make / evaluate / balance a trade-off between X and Y',
        example_general: 'Choosing to live downtown involves a trade-off between higher rent and shorter commute times.',
        example_workplace: 'Architects must carefully evaluate the trade-off between memory footprint and execution latency.',
        similar_word_comparison: {
          word: 'compromise',
          difference: '"compromise" thường mang sắc thái nhượng bộ hai bên; "trade-off" là sự cân nhắc kỹ thuật khách quan giữa hai thông số đối nghịch.'
        }
      },
      prompt: 'Select the most natural phrase:\n"In distributed systems, there is an inherent ____ between instant consistency and high availability."',
      options: [
        { id: 'A', text: 'trade-off' },
        { id: 'B', text: 'trade-in' },
        { id: 'C', text: 'turn-around' },
        { id: 'D', text: 'takeover' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'trade-off',
      accepted_alternatives: ['trade-off', 'tradeoff'],
      hint: 'Khái niệm đánh đổi giữa hai yếu tố (consistency và availability) trong định lý CAP.',
      explanation_rule: '"an inherent trade-off between A and B" là cụm từ học thuật và kỹ thuật chuẩn xác.'
    }
  },
  {
    id: 'vocab-b2-discrepancy',
    section: 'vocabulary',
    skill_id: 'collocation_discrepancy',
    skill_name: 'Collocations with Discrepancy',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-discrepancy',
      section: 'vocabulary',
      skill_id: 'collocation_discrepancy',
      skill_name: 'Collocations with Discrepancy',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'discrepancy',
        part_of_speech: 'noun',
        ipa: '/dɪˈskrep.ən.si/',
        pronunciation_tip: 'Trọng âm rơi vào âm thứ hai: dis-CREP-an-cy.',
        meaning: 'sự sai khác, bất đồng không lý giải được giữa hai dữ liệu, con số hoặc bản ghi đáng lẽ phải trùng khớp',
        collocation_pattern: 'notice / resolve / identify a discrepancy between X and Y',
        example_general: 'There was a noticeable discrepancy between the bank statement and her actual receipts.',
        example_workplace: 'The QA team flagged an unexpected discrepancy between staging analytics and live production numbers.',
        similar_word_comparison: {
          word: 'difference',
          difference: '"difference" chỉ sự khác biệt chung; "discrepancy" nhấn mạnh vào sai lệch bất thường cần được điều tra nguyên nhân.'
        }
      },
      prompt: 'Choose the best word to describe an unexplained variance between recorded data sets:\n"During reconciliation, finance spotted a notable ____ between the invoice totals and the payment logs."',
      options: [
        { id: 'A', text: 'discrepancy' },
        { id: 'B', text: 'allegation' },
        { id: 'C', text: 'redundancy' },
        { id: 'D', text: 'substitute' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'discrepancy',
      accepted_alternatives: ['discrepancy'],
      hint: 'Từ nào mang nghĩa sự chênh lệch hoặc sai khác bất thường giữa hai số liệu?',
      explanation_rule: '"a discrepancy between X and Y" là từ chuyên ngành chỉ sai lệch số liệu cần đối chiếu và xử lý.'
    }
  },
  {
    id: 'vocab-b2-robust',
    section: 'vocabulary',
    skill_id: 'collocation_robust',
    skill_name: 'Collocations with Robust',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-robust',
      section: 'vocabulary',
      skill_id: 'collocation_robust',
      skill_name: 'Collocations with Robust',
      question_type: 'fill_in_blank',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'robust',
        part_of_speech: 'adjective',
        ipa: '/roʊˈbʌst/',
        pronunciation_tip: 'Trọng âm rơi vào âm thứ hai: ro-BUST. Âm đuôi /st/ phát âm rõ.',
        meaning: 'vững chắc, có khả năng chịu tải tốt và không dễ bị lỗi khi gặp điều kiện bất lợi',
        collocation_pattern: 'robust architecture / testing suite / solution / security',
        example_general: 'A robust economy can recover quickly from seasonal downturns.',
        example_workplace: 'We need to engineer a robust caching mechanism to withstand sudden traffic spikes.',
        similar_word_comparison: {
          word: 'strong',
          difference: '"strong" chỉ sức mạnh nói chung; "robust" đặc biệt mô tả hệ thống kiên cố, bền bỉ và có khả năng chống chịu lỗi ngoại cảnh.'
        }
      },
      prompt: 'Fill in the blank with the appropriate adjective meaning sturdy and resilient under pressure:\n"To handle millions of concurrent requests, our team built a highly _________ data processing pipeline."',
      expected_answer_text: 'robust',
      accepted_alternatives: ['robust', 'resilient'],
      hint: 'Bắt đầu bằng chữ "r". Thường dùng để chỉ kiến trúc hệ thống hoặc giải pháp bền bỉ chịu tải.',
      explanation_rule: '"a robust pipeline / architecture" là collocation chuẩn quốc tế trong thiết kế phần mềm.'
    }
  },

  // --- ADDITIONAL RICH READING ITEMS ---
  {
    id: 'read-b2-codereview-1',
    section: 'reading',
    skill_id: 'reading_code_review_culture',
    skill_name: 'Code Review Culture & Constructive Tone',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-review-1',
      section: 'reading',
      skill_id: 'reading_code_review_culture',
      skill_name: 'Code Review Culture & Constructive Tone',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'Fostering Psychological Safety in Code Reviews',
        word_count: 135,
        topic: 'Engineering Collaboration',
        text: 'Code reviews are frequently perceived as technical gatekeeping, yet their primary impact is cultural. When senior engineers formulate comments as blunt directives—such as "This is wrong, change it"—they unintentionally create defensiveness and discourage junior engineers from taking creative initiative. Conversely, high-performing engineering cultures establish review norms rooted in inquiry and empathy. Reviewers phrase feedback as collaborative questions: "Have we considered how this function behaves when the payload is null?" or "What would happen if we decoupled the validation layer here?" By shifting from critique of the author to objective exploration of the codebase, teams protect psychological safety. Consequently, junior engineers ask for feedback earlier, reducing costly architectural revisions before production releases.'
      },
      prompt: 'According to the author, how does phrasing review feedback as collaborative questions benefit engineering teams?',
      options: [
        { id: 'A', text: 'It speeds up merge times by bypassing standard security validations' },
        { id: 'B', text: 'It creates psychological safety and encourages engineers to seek feedback earlier' },
        { id: 'C', text: 'It transfers responsibility for code quality entirely to senior staff' },
        { id: 'D', text: 'It eliminates the need for unit tests before submitting pull requests' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'It creates psychological safety and encourages engineers to seek feedback earlier',
      accepted_alternatives: ['B'],
      hint: 'Nhìn vào câu: "By shifting from critique of the author to objective exploration... junior engineers ask for feedback earlier..."',
      explanation_rule: 'Đoạn văn kết luận: "By shifting from critique of the author to objective exploration... teams protect psychological safety. Consequently, junior engineers ask for feedback earlier".'
    }
  }
];
