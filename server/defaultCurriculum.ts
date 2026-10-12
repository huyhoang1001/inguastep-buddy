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
  },

  // --- ADDITIONAL GRAMMAR ITEMS ---
  {
    id: 'gram-b2-subjunctive-1',
    section: 'grammar',
    skill_id: 'subjunctive_mood',
    skill_name: 'Subjunctive Mood in Recommendations',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-subj-1',
      section: 'grammar',
      skill_id: 'subjunctive_mood',
      skill_name: 'Subjunctive Mood in Recommendations',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Sau các động từ khuyên bảo hoặc yêu cầu trang trọng (recommend, insist, propose, suggest that S + V_bare), động từ ở mệnh đề that luôn ở dạng nguyên mẫu không "to".',
      prompt: 'The security auditor strongly recommended that our operations team ____ all root credentials before the weekend.',
      options: [
        { id: 'A', text: 'rotates' },
        { id: 'B', text: 'rotate' },
        { id: 'C', text: 'rotated' },
        { id: 'D', text: 'would rotate' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'rotate',
      accepted_alternatives: ['rotate'],
      hint: 'Cấu trúc giả định thức: recommend that S + V_nguyên thể (bare infinitive).',
      explanation_rule: 'Cấu trúc Subjunctive: "recommend that + S + (should) + V_bare". "rotate" là dạng đúng dù chủ ngữ là số ít hay thì quá khứ.'
    }
  },
  {
    id: 'gram-b2-cleft-1',
    section: 'grammar',
    skill_id: 'cleft_sentences',
    skill_name: 'Cleft Sentences for Precision Emphasis',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-cleft-1',
      section: 'grammar',
      skill_id: 'cleft_sentences',
      skill_name: 'Cleft Sentences for Precision Emphasis',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Cleft sentence (It was X that... / What we need is...) dùng để nhấn mạnh chính xác yếu tố cốt lõi của một vấn đề.',
      prompt: 'It was not the database query but the unoptimized network serialization ____ caused the severe latency spike.',
      options: [
        { id: 'A', text: 'which' },
        { id: 'B', text: 'that' },
        { id: 'C', text: 'what' },
        { id: 'D', text: 'where' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'that',
      accepted_alternatives: ['that'],
      hint: 'Mẫu câu chẻ nhấn mạnh: "It was/is [thành phần nhấn mạnh] that + S/V".',
      explanation_rule: 'Cấu trúc câu chẻ chuẩn: "It is/was + X + that + Y". "that" liên kết mệnh đề nhấn mạnh nguyên nhân thực sự.'
    }
  },
  {
    id: 'gram-b2-participle-1',
    section: 'grammar',
    skill_id: 'participle_clauses',
    skill_name: 'Participle Clauses for Concise Writing',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-part-1',
      section: 'grammar',
      skill_id: 'participle_clauses',
      skill_name: 'Participle Clauses for Concise Writing',
      question_type: 'fill_in_blank',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Rút gọn mệnh đề cùng chủ ngữ bằng phân từ hoàn thành (Having + V3) giúp câu văn gãy gọn và chuyên nghiệp hơn.',
      prompt: 'Complete the sentence using the past participle form of "complete":\n"Having ________________ (complete) the automated regression run, the QA lead approved the hotfix release."',
      expected_answer_text: 'completed',
      accepted_alternatives: ['completed'],
      hint: 'Dùng dạng V3/ed sau "Having" để chỉ hành động đã làm xong trước đó.',
      explanation_rule: 'Dạng phân từ hoàn thành: "Having + V3/ed" diễn tả hành động kiểm thử đã kết thúc trước khi lead phê duyệt bản vá.'
    }
  },
  {
    id: 'gram-b2-modal-past-1',
    section: 'grammar',
    skill_id: 'past_modals',
    skill_name: 'Past Modals of Deduction',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-modal-past-1',
      section: 'grammar',
      skill_id: 'past_modals',
      skill_name: 'Past Modals of Deduction',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Dùng "must have + V3" khi gần như chắc chắn một việc đã xảy ra trong quá khứ dựa trên bằng chứng rõ ràng.',
      prompt: 'The server memory usage dropped to normal levels at exactly 03:00 AM; the automated garbage collection script ____ kicked in as scheduled.',
      options: [
        { id: 'A', text: 'must have' },
        { id: 'B', text: 'should have' },
        { id: 'C', text: 'might be' },
        { id: 'D', text: 'would' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'must have',
      accepted_alternatives: ['must have'],
      hint: 'Dựa trên bằng chứng bộ nhớ giảm về mức bình thường, ta suy luận chắc chắn điều đó đã diễn ra.',
      explanation_rule: '"must have + V3" thể hiện suy đoán chắc chắn về một sự kiện trong quá khứ dựa trên bằng chứng thực tế.'
    }
  },

  // --- ADDITIONAL VOCABULARY ITEMS ---
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
        pronunciation_tip: 'Trọng âm rơi vào âm thứ hai: dis-CREP-an-cy. Âm đuôi /si/ nhẹ nhàng.',
        meaning: 'sự sai lệch hoặc không khớp nhau giữa hai con số, báo cáo hoặc dữ liệu lẽ ra phải giống nhau',
        collocation_pattern: 'resolve / identify / reconcile + discrepancy',
        example_general: 'There was a noticeable discrepancy between the two survey reports.',
        example_workplace: 'The finance auditor flagged a five percent discrepancy between database invoices and Stripe records.',
        similar_word_comparison: {
          word: 'difference',
          difference: '"difference" là sự khác nhau nói chung; "discrepancy" chỉ sự chênh lệch bất thường cần phải điều tra làm rõ.'
        }
      },
      prompt: 'Which word best describes an unexpected mismatch between recorded inventory and physical stock?\n"The data migration failed because we discovered a significant ____ between source and destination schema rows."',
      options: [
        { id: 'A', text: 'discrepancy' },
        { id: 'B', text: 'accordance' },
        { id: 'C', text: 'cohesion' },
        { id: 'D', text: 'compliment' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'discrepancy',
      accepted_alternatives: ['discrepancy'],
      hint: 'Bắt đầu bằng chữ "d". Mang nghĩa sự sai lệch, không nhất quán giữa 2 nguồn dữ liệu.',
      explanation_rule: '"discrepancy between X and Y" là thuật ngữ chuẩn để chỉ sự sai lệch dữ liệu không mong muốn.'
    }
  },
  {
    id: 'vocab-b2-bottleneck',
    section: 'vocabulary',
    skill_id: 'collocation_bottleneck',
    skill_name: 'Collocations with Bottleneck',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-bottleneck',
      section: 'vocabulary',
      skill_id: 'collocation_bottleneck',
      skill_name: 'Collocations with Bottleneck',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'bottleneck',
        part_of_speech: 'noun',
        ipa: '/ˈbɑː.t̬əl.nek/',
        pronunciation_tip: 'Trọng âm rơi vào âm đầu: BOT-tle-neck. Âm /t̬/ lướt nhẹ.',
        meaning: 'điểm nghẽn, khâu thắt cổ chai làm chậm lại toàn bộ tiến độ hoặc lưu lượng của hệ thống',
        collocation_pattern: 'identify / eliminate / encounter + a bottleneck',
        example_general: 'Heavy road construction created a massive traffic bottleneck at the city entrance.',
        example_workplace: 'Database disk I/O turned out to be the primary performance bottleneck under peak traffic.',
        similar_word_comparison: {
          word: 'obstacle',
          difference: '"obstacle" là chướng ngại vật cản đường; "bottleneck" là đoạn hẹp làm thắt nghẽn dòng chảy của một quy trình rộng lớn.'
        }
      },
      prompt: 'Which noun refers to a specific constraint that restricts the capacity or speed of an entire pipeline?\n"After profiling the application, our engineers identified the database disk write speed as the major ____."',
      options: [
        { id: 'A', text: 'bottleneck' },
        { id: 'B', text: 'facilitator' },
        { id: 'C', text: 'catalyst' },
        { id: 'D', text: 'accelerator' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'bottleneck',
      accepted_alternatives: ['bottleneck'],
      hint: 'Khái niệm "điểm nghẽn cổ chai" cản trở hiệu năng hệ thống.',
      explanation_rule: '"performance bottleneck" là cụm từ tiêu chuẩn mô tả điểm yếu làm chậm cả hệ thống.'
    }
  },
  {
    id: 'vocab-b2-feasibility',
    section: 'vocabulary',
    skill_id: 'collocation_feasibility',
    skill_name: 'Collocations with Feasibility',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-feasibility',
      section: 'vocabulary',
      skill_id: 'collocation_feasibility',
      skill_name: 'Collocations with Feasibility',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'feasibility',
        part_of_speech: 'noun',
        ipa: '/ˌfiː.zəˈbɪl.ə.t̬i/',
        pronunciation_tip: 'Trọng âm rơi vào âm thứ ba: fee-zuh-BIL-i-ty. Âm đầu /fiː/ kéo dài.',
        meaning: 'tính khả thi, mức độ thực tế và có thể làm được của một dự án hoặc giải pháp',
        collocation_pattern: 'assess / conduct a feasibility study / technical feasibility',
        example_general: 'We need to evaluate the practical feasibility of relocating to a larger office.',
        example_workplace: 'Before committing to the blockchain migration, the architect conducted a technical feasibility assessment.',
        similar_word_comparison: {
          word: 'possibility',
          difference: '"possibility" là khả năng có thể xảy ra ngẫu nhiên; "feasibility" là tính khả thi có thể triển khai thực tế bằng nguồn lực hiện có.'
        }
      },
      prompt: 'Choose the noun that means the practical viability or doable nature of a technical proposal:\n"Our team conducted a spike sprint to assess the technical ____ of migrating to a serverless architecture."',
      options: [
        { id: 'A', text: 'feasibility' },
        { id: 'B', text: 'futility' },
        { id: 'C', text: 'arbitrariness' },
        { id: 'D', text: 'hesitation' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'feasibility',
      accepted_alternatives: ['feasibility'],
      hint: 'Bắt đầu bằng chữ "f". Từ mang nghĩa tính khả thi thực tế.',
      explanation_rule: '"technical feasibility" là thuật ngữ kỹ thuật phổ biến để đánh giá một giải pháp có khả thi thực hiện hay không.'
    }
  },
  {
    id: 'vocab-b2-tangible',
    section: 'vocabulary',
    skill_id: 'collocation_tangible',
    skill_name: 'Collocations with Tangible',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-tangible',
      section: 'vocabulary',
      skill_id: 'collocation_tangible',
      skill_name: 'Collocations with Tangible',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'tangible',
        part_of_speech: 'adjective',
        ipa: '/ˈtæn.dʒə.bəl/',
        pronunciation_tip: 'Trọng âm rơi vào âm đầu: TAN-ji-ble. Chú ý âm /dʒ/ ở giữa.',
        meaning: 'rõ ràng, có thể đo đếm hoặc nhìn thấy kết quả thực tế, không mơ hồ',
        collocation_pattern: 'tangible benefits / results / progress / evidence',
        example_general: 'Their efforts yielded tangible improvements in student reading scores.',
        example_workplace: 'Adopting the new linter produced tangible reductions in pull request discussion cycles.',
        similar_word_comparison: {
          word: 'clear',
          difference: '"clear" là rõ ràng dễ thấy; "tangible" đặc biệt chỉ kết quả có thể cân đo đong đếm và chứng minh bằng dữ liệu thực tế.'
        }
      },
      prompt: 'Which adjective best completes the sentence to describe measurable, concrete progress?\n"Our automated testing initiative has already produced ____ improvements in overall build stability."',
      options: [
        { id: 'A', text: 'tangible' },
        { id: 'B', text: 'hypothetical' },
        { id: 'C', text: 'negligible' },
        { id: 'D', text: 'abstract' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'tangible',
      accepted_alternatives: ['tangible'],
      hint: 'Từ mang nghĩa kết quả rõ rệt, có thể đo đạc cụ thể được.',
      explanation_rule: '"tangible improvements" là collocation chuyên môn để chỉ những cải thiện có thể chứng minh bằng dữ liệu đo đạc thực tế.'
    }
  },

  // --- ADDITIONAL READING ITEMS ---
  {
    id: 'read-b2-feature-flags-1',
    section: 'reading',
    skill_id: 'reading_continuous_delivery',
    skill_name: 'Feature Flags & Decoupled Deployments',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-flags-1',
      section: 'reading',
      skill_id: 'reading_continuous_delivery',
      skill_name: 'Feature Flags & Decoupled Deployments',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'Decoupling Code Deployment from Feature Releases',
        word_count: 130,
        topic: 'Continuous Delivery Strategy',
        text: 'Traditional software teams often treat code deployment and feature release as identical milestones. When a project is finished, the code is deployed directly to production and immediately exposed to every user simultaneously. In contrast, modern engineering organizations decouple deployment from release by leveraging feature toggles. Code is merged and deployed to production continuously in dormant, disabled states. Product teams can then dynamically activate features for specific cohorts, conduct percentage-based canary rollouts, or observe telemetry under real production traffic. Crucially, if unexpected latency or uncaught exceptions emerge, engineers can disable the toggle within seconds without initiating a high-risk emergency rollback. This operational autonomy transforms release cycles from nerve-wracking midnight events into routine daytime workflows.'
      },
      prompt: 'What is the primary operational advantage of feature flags described in the passage?',
      options: [
        { id: 'A', text: 'They eliminate the need to write automated unit tests before production deployment' },
        { id: 'B', text: 'They allow teams to instantly disable malfunctioning features without rolling back code' },
        { id: 'C', text: 'They prevent multiple engineers from working on the same repository concurrently' },
        { id: 'D', text: 'They force all feature releases to occur during scheduled weekend maintenance windows' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'They allow teams to instantly disable malfunctioning features without rolling back code',
      accepted_alternatives: ['B'],
      hint: 'Đọc kỹ câu: "if unexpected latency or uncaught exceptions emerge, engineers can disable the toggle within seconds without initiating a high-risk emergency rollback."',
      explanation_rule: 'Đoạn văn nhấn mạnh khả năng tắt tính năng ngay lập tức thông qua toggle khi gặp sự cố mà không cần quy trình rollback khẩn cấp nguy hiểm.'
    }
  },
  {
    id: 'read-b2-on-call-culture-1',
    section: 'reading',
    skill_id: 'reading_incident_retrospectives',
    skill_name: 'Blameless Post-Mortems & On-Call Health',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-oncall-1',
      section: 'reading',
      skill_id: 'reading_incident_retrospectives',
      skill_name: 'Blameless Post-Mortems & On-Call Health',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'The Philosophy of Blameless Post-Mortems',
        word_count: 125,
        topic: 'Site Reliability Engineering',
        text: 'When production outages occur, organizational instinct often leans toward locating an individual to hold accountable. However, resilient engineering cultures operate on the premise that human error is inevitable; catastrophic failure indicates systemic weakness in safeguards rather than individual negligence. In a blameless post-mortem, teams examine the sequence of events without attributing fault. Instead of asking "Who pushed the faulty migration?", investigators examine: "Why did our staging environment fail to replicate production state?", "Why did the deployment pipeline permit unverified configuration values?", and "How can our telemetry alert responders faster?" When engineers trust that honesty will not invite punishment, they candidly disclose subtle anomalies, allowing the organization to build systemic resilience that permanently prevents recurrence.'
      },
      prompt: 'Why do resilient organizations conduct post-mortems without assigning personal blame?',
      options: [
        { id: 'A', text: 'Because engineers who make mistakes are immediately reassigned to non-critical projects' },
        { id: 'B', text: 'Because focusing on systemic safeguards encourages transparent disclosure and prevents future incidents' },
        { id: 'C', text: 'Because outages are usually caused by external cloud vendors rather than internal code' },
        { id: 'D', text: 'Because blameless post-mortems reduce the overall time spent monitoring telemetry dashboards' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'Because focusing on systemic safeguards encourages transparent disclosure and prevents future incidents',
      accepted_alternatives: ['B'],
      hint: 'Nhìn vào câu cuối: "When engineers trust that honesty will not invite punishment, they candidly disclose subtle anomalies, allowing the organization to build systemic resilience..."',
      explanation_rule: 'Trọng tâm của văn hoá blameless là tập trung cải thiện hệ thống phòng vệ và khuyến khích chia sẻ trung thực để ngăn ngừa lỗi tái diễn.'
    }
  },

  // --- ADDITIONAL WRITING ITEMS ---
  {
    id: 'write-b2-incident-postmortem-1',
    section: 'writing',
    skill_id: 'workplace_incident_update',
    skill_name: 'Asynchronous Incident Announcement',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-inc-1',
      section: 'writing',
      skill_id: 'workplace_incident_update',
      skill_name: 'Asynchronous Incident Announcement',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Khi thông báo sự cố trong kênh chung của công ty (#outages / Slack), thông điệp cần nêu rõ: 1) dịch vụ bị ảnh hưởng, 2) phạm vi tác động đến người dùng, và 3) hành động nhóm đang tiến hành.',
      prompt: 'Write 2 to 3 professional sentences notifying cross-functional stakeholders that the search API is experiencing high latency, confirming that core data is safe, and stating when the next update will be provided.',
      hint: 'Có thể mở đầu bằng: "We are currently observing elevated latency on...", khẳng định: "Please note that database integrity remains unaffected", và kết thúc: "Our next status update will follow at..."',
      explanation_rule: 'Thông báo sự cố cần trung thực, điềm tĩnh, nêu rõ phạm vi và cam kết thời điểm cập nhật kế tiếp.'
    }
  },
  {
    id: 'write-b2-proposal-note-1',
    section: 'writing',
    skill_id: 'workplace_proposal_note',
    skill_name: 'Constructive Architecture Proposal',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-prop-1',
      section: 'writing',
      skill_id: 'workplace_proposal_note',
      skill_name: 'Constructive Architecture Proposal',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Khi đề xuất giải pháp kỹ thuật mới cho đồng nghiệp hoặc tech lead, hãy nêu ngắn gọn: 1) vấn đề hiện tại, 2) đề xuất thay đổi, và 3) lợi ích cụ thể mang lại.',
      prompt: 'Write 2 to 3 sentences proposing to replace manual regression testing with automated Playwright end-to-end tests to save developer time before sprint releases.',
      hint: 'Sử dụng các cụm từ chuyên nghiệp: "I propose we adopt...", "This would streamline our QA cycle...", "Consequently, we can reduce release bottlenecks."',
      explanation_rule: 'Đề xuất kỹ thuật cần mạch lạc, nêu rõ lý do và lợi ích định lượng thay vì chỉ đưa ra ý kiến cá nhân.'
    }
  },

  // --- ADDITIONAL EXTENSIVE VOCABULARY ITEMS ---
  {
    id: 'vocab-b2-bottleneck',
    section: 'vocabulary',
    skill_id: 'collocation_bottleneck',
    skill_name: 'Collocations with Bottleneck',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-bottleneck',
      section: 'vocabulary',
      skill_id: 'collocation_bottleneck',
      skill_name: 'Collocations with Bottleneck',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'bottleneck',
        part_of_speech: 'noun',
        ipa: '/ˈbɒtlnek/',
        pronunciation_tip: 'Trọng âm rơi vào âm tiết đầu tiên: BOT-tle-neck.',
        meaning: 'điểm nghẽn, khâu làm tắc nghẽn hoặc cản trở toàn bộ quy trình',
        collocation_pattern: 'identify / eliminate / create a bottleneck in the pipeline',
        example_general: 'Road construction during rush hour caused a major bottleneck on the highway.',
        example_workplace: 'The manual security review has become the primary bottleneck in our CI/CD deployment pipeline.',
        similar_word_comparison: {
          word: 'obstacle',
          difference: '"bottleneck" là sự chậm trễ phát sinh do giới hạn công suất ở một khâu; trong khi "obstacle" là chướng ngại vật cản trở hoàn toàn.'
        }
      },
      prompt: 'Choose the most natural collocation to complete the sentence:\n"Our performance profiling session helped the DevOps team identify and eliminate the network I/O ____ that was delaying payment confirmations."',
      options: [
        { id: 'A', text: 'bottleneck' },
        { id: 'B', text: 'stopwatch' },
        { id: 'C', text: 'junction' },
        { id: 'D', text: 'shortcut' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'bottleneck',
      accepted_alternatives: ['bottleneck'],
      hint: 'Từ nào chỉ điểm nghẽn hiệu năng gây chậm trễ quy trình xử lý?',
      explanation_rule: 'Trong kỹ thuật và quản lý quy trình, "eliminate the bottleneck" là thuật ngữ tiêu chuẩn để chỉ việc gỡ bỏ điểm nghẽn hiệu năng.'
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
        ipa: '/ˈliːvərɪdʒ/',
        pronunciation_tip: 'Âm đầu tiên là /ˈliːv/ hoặc /ˈlev/. Trọng âm rơi vào âm tiết thứ nhất: LEV-er-age.',
        meaning: 'tận dụng tối đa một lợi thế, nguồn lực hoặc công nghệ sẵn có để đạt kết quả vượt trội',
        collocation_pattern: 'leverage + expertise / technology / data / existing infrastructure',
        example_general: 'She was able to leverage her background in graphic design to create appealing presentations.',
        example_workplace: 'By leveraging edge caching, the team reduced average API latency by over forty percent.',
        similar_word_comparison: {
          word: 'utilize',
          difference: '"utilize" chỉ đơn thuần là dùng/sử dụng một vật cho một mục đích; còn "leverage" hàm ý tận dụng một đòn bẩy để tạo ra tác động lớn hơn nhiều so với tài nguyên bỏ ra.'
        }
      },
      prompt: 'Complete the sentence with the appropriate professional term:\n"To shorten time-to-market, our architects decided to ____ open-source libraries rather than reinventing authentication mechanisms from scratch."',
      options: [
        { id: 'A', text: 'leverage' },
        { id: 'B', text: 'tolerate' },
        { id: 'C', text: 'surrender' },
        { id: 'D', text: 'withstand' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'leverage',
      accepted_alternatives: ['leverage'],
      hint: 'Từ mang nghĩa tận dụng triệt để tài nguyên có sẵn như một đòn bẩy.',
      explanation_rule: '"leverage" là từ vựng rất phổ biến trong công nghệ và kinh doanh, mang nghĩa tận dụng đòn bẩy tài nguyên có sẵn để tối đa hóa hiệu quả.'
    }
  },
  {
    id: 'vocab-b2-resilient',
    section: 'vocabulary',
    skill_id: 'collocation_resilient',
    skill_name: 'Collocations with Resilient',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-resilient',
      section: 'vocabulary',
      skill_id: 'collocation_resilient',
      skill_name: 'Collocations with Resilient',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'resilient',
        part_of_speech: 'adjective',
        ipa: '/rɪˈzɪliənt/',
        pronunciation_tip: 'Trọng âm rơi vào âm tiết thứ hai: re-ZIL-i-ent. Âm "s" đọc là /z/.',
        meaning: 'kiên cường, có khả năng phục hồi nhanh chóng sau sự cố hoặc áp lực',
        collocation_pattern: 'resilient architecture / resilient infrastructure / highly resilient system',
        example_general: 'Children are often remarkably resilient when adapting to new surroundings.',
        example_workplace: 'Designing resilient distributed services requires planning for network partition failures.',
        similar_word_comparison: {
          word: 'robust',
          difference: '"robust" nhấn mạnh vào độ vững chắc, chịu lực không dễ hỏng; còn "resilient" nhấn mạnh vào khả năng đàn hồi và tự phục hồi nhanh sau khi gặp chấn động/sự cố.'
        }
      },
      prompt: 'Select the best adjective:\n"Even during peak Black Friday traffic spikes, the payment gateway remained remarkably ____ thanks to auto-scaling container clusters."',
      options: [
        { id: 'A', text: 'resilient' },
        { id: 'B', text: 'fragile' },
        { id: 'C', text: 'hesitant' },
        { id: 'D', text: 'provisional' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'resilient',
      accepted_alternatives: ['resilient'],
      hint: 'Hệ thống chịu tải tốt và phục hồi linh hoạt trước áp lực traffic cao được gọi là gì?',
      explanation_rule: '"resilient" miêu tả hệ thống vững vàng, linh hoạt và phục hồi tốt trước áp lực hoặc lỗi phát sinh.'
    }
  },
  {
    id: 'vocab-b2-redundant',
    section: 'vocabulary',
    skill_id: 'collocation_redundant',
    skill_name: 'Precision with Redundant',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-redundant',
      section: 'vocabulary',
      skill_id: 'collocation_redundant',
      skill_name: 'Precision with Redundant',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'redundant',
        part_of_speech: 'adjective',
        ipa: '/rɪˈdʌndənt/',
        pronunciation_tip: 'Trọng âm rơi vào âm tiết thứ hai: re-DUN-dant.',
        meaning: '1) dư thừa, không cần thiết (trong văn phong); 2) dự phòng song song để chống hỏng hóc (trong kỹ thuật hệ thống)',
        collocation_pattern: 'redundant power supplies / redundant data pipelines / render something redundant',
        example_general: 'The editor removed several redundant paragraphs that merely repeated earlier points.',
        example_workplace: 'Our cloud architecture uses redundant power backups and multi-region storage.',
        similar_word_comparison: {
          word: 'superfluous',
          difference: '"superfluous" mang nghĩa tiêu cực là thừa thãi, không nên có; trong khi "redundant" trong kỹ thuật mạng/hệ thống lại là tính năng an toàn dự phòng rất cần thiết.'
        }
      },
      prompt: 'Select the word that fits this infrastructure sentence:\n"To prevent single points of failure, the data center maintains ____ power generators and duplicate fiber optic connections."',
      options: [
        { id: 'A', text: 'redundant' },
        { id: 'B', text: 'scarce' },
        { id: 'C', text: 'superficial' },
        { id: 'D', text: 'sluggish' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'redundant',
      accepted_alternatives: ['redundant'],
      hint: 'Trong thiết kế hạ tầng, thiết bị dự phòng song song được gọi là gì?',
      explanation_rule: '"redundant" trong kỹ thuật viễn thông và máy chủ có nghĩa là dự phòng để tránh điểm lỗi đơn lẻ (single point of failure).'
    }
  },
  {
    id: 'vocab-b2-seamless',
    section: 'vocabulary',
    skill_id: 'collocation_seamless',
    skill_name: 'Collocations with Seamless',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-seamless',
      section: 'vocabulary',
      skill_id: 'collocation_seamless',
      skill_name: 'Collocations with Seamless',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'seamless',
        part_of_speech: 'adjective',
        ipa: '/ˈsiːmləs/',
        pronunciation_tip: 'SEAM-less. Âm dài /iː/, đuôi /ləs/.',
        meaning: 'liền mạch, trơn tru, không có sự gián đoạn hay vết nứt có thể nhận thấy',
        collocation_pattern: 'seamless transition / seamless integration / seamless user experience',
        example_general: 'The transition from the old schedule to the new one was completely seamless.',
        example_workplace: 'Single Sign-On provides a seamless onboarding experience across all internal enterprise applications.',
        similar_word_comparison: {
          word: 'smooth',
          difference: '"smooth" là từ thông dụng chỉ bề mặt hoặc tiến trình êm ả; "seamless" nhấn mạnh vào việc kết nối giữa hai hay nhiều hệ thống khác nhau mà người dùng không hề cảm thấy khoảng cách gián đoạn.'
        }
      },
      prompt: 'Fill in the blank with the most fitting adjective:\n"The migration from our on-premise servers to the cloud was completely ____, causing zero disruption to end users during trading hours."',
      options: [
        { id: 'A', text: 'seamless' },
        { id: 'B', text: 'abrupt' },
        { id: 'C', text: 'clunky' },
        { id: 'D', text: 'erratic' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'seamless',
      accepted_alternatives: ['seamless'],
      hint: 'Từ nào miêu tả sự chuyển đổi trơn tru, không gây gián đoạn cho người dùng?',
      explanation_rule: '"seamless transition / seamless migration" là cụm từ chuẩn mực chỉ quá trình nâng cấp hệ thống liền mạch, không làm ngắt quãng trải nghiệm người dùng.'
    }
  },
  {
    id: 'vocab-b2-deprecate',
    section: 'vocabulary',
    skill_id: 'collocation_deprecate',
    skill_name: 'Precision with Deprecate',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-vocab-deprecate',
      section: 'vocabulary',
      skill_id: 'collocation_deprecate',
      skill_name: 'Precision with Deprecate',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      vocab_card: {
        word: 'deprecate',
        part_of_speech: 'verb',
        ipa: '/ˈdeprəkeɪt/',
        pronunciation_tip: 'DEP-re-cate. Trọng âm rơi vào âm tiết đầu tiên.',
        meaning: 'đánh dấu một tính năng hoặc API là lỗi thời/không khuyến khích dùng nữa trước khi chính thức loại bỏ',
        collocation_pattern: 'deprecate an endpoint / deprecated feature / schedule for deprecation',
        example_general: 'He tended to deprecate his own accomplishments, attributing his success strictly to luck.',
        example_workplace: 'The engineering team published a migration guide three months before deprecating the legacy v1 REST API.',
        similar_word_comparison: {
          word: 'obsolete',
          difference: '"obsolete" là tính từ chỉ cái đã lỗi thời hẳn; còn "deprecate" là động từ hành động của nhà phát triển nhằm thông báo tính năng đang trong lộ trình ngừng hỗ trợ.'
        }
      },
      prompt: 'Choose the appropriate technical term:\n"Before deleting the legacy authentication endpoint entirely, we must ____ it and log warning headers for developers still calling it."',
      options: [
        { id: 'A', text: 'deprecate' },
        { id: 'B', text: 'accelerate' },
        { id: 'C', text: 'authenticate' },
        { id: 'D', text: 'replicate' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'deprecate',
      accepted_alternatives: ['deprecate'],
      hint: 'Thuật ngữ phần mềm để chỉ hành động đánh dấu một API là sắp ngừng hỗ trợ.',
      explanation_rule: '"deprecate" là hành động thông báo tính năng phần mềm sẽ không còn được hỗ trợ trong phiên bản tương lai.'
    }
  },

  // --- ADDITIONAL EXTENSIVE READING PASSAGES ---
  {
    id: 'read-b2-incident-postmortem',
    section: 'reading',
    skill_id: 'reading_incident_analysis',
    skill_name: 'Incident Analysis & Cause Identification',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-incident-1',
      section: 'reading',
      skill_id: 'reading_incident_analysis',
      skill_name: 'Incident Analysis & Cause Identification',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'Anatomy of an Outage: Root Cause Transparency',
        word_count: 135,
        topic: 'Engineering Reliability & Blameless Culture',
        text: 'At 14:15 UTC yesterday, our primary billing service experienced a 35-minute partial outage affecting international transactions. The root cause was traced back to a configuration typo in an environment variable deployed during routine maintenance. Because the validation script only verified database connection strings rather than token expiration formats, the invalid parameter went unnoticed until background billing workers began throwing unhandled exceptions. Rather than assigning blame to the junior engineer who pushed the commit, our team adheres strictly to a blameless post-mortem philosophy. When catastrophic failures occur, progressive organizations recognize that human error is merely a symptom of inadequate tooling and deficient safety barriers. Moving forward, the infrastructure squad will implement automated staging dry-runs and semantic config validation to ensure such regressions are caught before reaching production.'
      },
      prompt: 'According to the passage, why did the organization adopt a blameless post-mortem culture?',
      options: [
        { id: 'A', text: 'Because junior engineers should never be allowed to push code to production' },
        { id: 'B', text: 'Because human mistakes point to systemic weaknesses in automated safety barriers' },
        { id: 'C', text: 'Because international transactions are inherently prone to unhandled network exceptions' },
        { id: 'D', text: 'Because configuration typos can be safely ignored during routine maintenance' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'Because human mistakes point to systemic weaknesses in automated safety barriers',
      accepted_alternatives: ['B'],
      hint: 'Đọc kỹ câu: "progressive organizations recognize that human error is merely a symptom of inadequate tooling and deficient safety barriers".',
      explanation_rule: 'Đoạn văn nêu rõ lỗi con người là triệu chứng của việc thiếu công cụ và rào chắn an toàn hệ thống (deficient safety barriers), do đó cần sửa quy trình hơn là quy trách nhiệm cá nhân.'
    }
  },
  {
    id: 'read-b2-remote-async',
    section: 'reading',
    skill_id: 'reading_remote_culture',
    skill_name: 'Evaluating Asynchronous Communication Nuance',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-remote-1',
      section: 'reading',
      skill_id: 'reading_remote_culture',
      skill_name: 'Evaluating Asynchronous Communication Nuance',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'The Asynchronous Advantage in Distributed Engineering',
        word_count: 140,
        topic: 'Modern Remote Work Practices',
        text: 'Synchronous meetings were once considered the gold standard of corporate collaboration. However, for globally distributed software teams spanning multiple time zones, back-to-back video calls frequently fragment deep work hours and drain cognitive energy. Effective distributed companies have shifted their default workflow toward asynchronous written documentation. Instead of calling an impromptu brainstorm, engineers author succinct Request for Comments (RFC) proposals outlining technical tradeoffs, API schemas, and architectural consequences. Teammates then contribute feedback on their own schedules over a 48-hour window. This deliberate delay not only accommodates non-overlapping working hours, but also yields significantly higher quality critique. When collaborators are afforded time to test hypotheses and verify facts before responding, discussions become grounded in empirical evidence rather than whoever speaks the loudest in the meeting room.'
      },
      prompt: 'What primary benefit of asynchronous RFC proposals does the author highlight?',
      options: [
        { id: 'A', text: 'They eliminate the need for written API schemas and architectural documents' },
        { id: 'B', text: 'They allow collaborators sufficient time to reflect and provide fact-grounded critiques' },
        { id: 'C', text: 'They ensure that decisions are finalized within a couple of minutes' },
        { id: 'D', text: 'They require all engineers to work simultaneously within the same time zone' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'They allow collaborators sufficient time to reflect and provide fact-grounded critiques',
      accepted_alternatives: ['B'],
      hint: 'Xem xét câu kết luận: "When collaborators are afforded time to test hypotheses and verify facts before responding, discussions become grounded in empirical evidence..."',
      explanation_rule: 'Tác giả nhấn mạnh việc giao tiếp không đồng bộ cho phép người tham gia có đủ thời gian suy ngẫm, kiểm chứng giả thuyết trước khi đưa ra phản hồi có căn cứ.'
    }
  },
  {
    id: 'read-b2-observability',
    section: 'reading',
    skill_id: 'reading_observability_concepts',
    skill_name: 'Interpreting Technical System Concepts',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-read-obs-1',
      section: 'reading',
      skill_id: 'reading_observability_concepts',
      skill_name: 'Interpreting Technical System Concepts',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'Beyond Basic Monitoring: The Rise of Observability',
        word_count: 132,
        topic: 'Cloud Infrastructure & Telemetry',
        text: 'Traditional system monitoring answers a simple binary question: is the service currently working or broken? Operators typically configure fixed thresholds—such as CPU utilization exceeding 80% or memory usage crossing 90%—to trigger automated pager alerts. In complex microservices architectures, however, catastrophic degradations often manifest without breaching any individual threshold. A cascading distributed deadlock or partial database thread starvation can slow requests to a crawl while server metrics appear deceptively healthy. Observability addresses this limitation by synthesizing three distinct telemetry pillars: metrics, structured logs, and distributed traces. By following a single user request as it traverses dozens of decoupled services, site reliability engineers can deduce internal system states purely from external outputs. Observability is not merely alerting on known failure modes; it is understanding unfamiliar emergent behaviors.'
      },
      prompt: 'Why are traditional threshold alerts often insufficient in complex microservice architectures?',
      options: [
        { id: 'A', text: 'Because servers never consume more than 80% CPU during real-world traffic' },
        { id: 'B', text: 'Because severe degradations can happen across distributed services without triggering fixed thresholds' },
        { id: 'C', text: 'Because structured logs take up too much disk space in cloud clusters' },
        { id: 'D', text: 'Because microservices do not require site reliability engineers' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'Because severe degradations can happen across distributed services without triggering fixed thresholds',
      accepted_alternatives: ['B'],
      hint: 'Đoạn văn nêu: "In complex microservices architectures, however, catastrophic degradations often manifest without breaching any individual threshold."',
      explanation_rule: 'Đoạn văn giải thích rõ rằng trong các hệ thống microservices phức tạp, sự cố nghiêm trọng có thể xảy ra do tắc nghẽn phân tán mà không làm vượt qua các ngưỡng cảnh báo tài nguyên cố định.'
    }
  },

  // --- ADDITIONAL WRITING PROMPTS ---
  {
    id: 'write-b2-incident-postmortem-summary',
    section: 'writing',
    skill_id: 'workplace_incident_summary',
    skill_name: 'Executive Incident Summary',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-inc-summary-1',
      section: 'writing',
      skill_id: 'workplace_incident_summary',
      skill_name: 'Executive Incident Summary',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Trong báo cáo gửi ban lãnh đạo sau sự cố, tóm tắt sự cố cần ngắn gọn 2-3 câu: Nêu thời gian và dịch vụ bị ảnh hưởng, nguyên nhân cốt lõi và biện pháp khắc phục đã triển khai.',
      prompt: 'Write 2 to 3 sentences summarizing a 20-minute database outage for executive stakeholders. Mention that the issue was identified, the service was restored via replica failover, and a fix was deployed to prevent recurrence.',
      hint: 'Gợi ý: "Earlier today, our primary database encountered a 20-minute outage affecting user logins. The on-call team successfully restored service by initiating replica failover, and preventative measures have already been deployed."',
      explanation_rule: 'Tập trung vào thì quá khứ cho diễn biến sự cố (encountered, initiated) và Present Perfect cho kết quả hiện tại (have deployed).'
    }
  },
  {
    id: 'write-b2-peer-kudos-note',
    section: 'writing',
    skill_id: 'workplace_peer_feedback',
    skill_name: 'Constructive Peer Recognition',
    difficulty: 'B2',
    context_topic: 'workplace_tech',
    question: {
      id: 'q-write-kudos-1',
      section: 'writing',
      skill_id: 'workplace_peer_feedback',
      skill_name: 'Constructive Peer Recognition',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      concept_intro: 'Khen ngợi và ghi nhận đóng góp của đồng nghiệp trong kênh chung (Slack #shoutouts hoặc performance review) giúp gắn kết đội ngũ. Nêu cụ thể hành động và tác động tích cực mà họ tạo ra.',
      prompt: 'Write 2 to 3 sentences thanking a colleague for quickly troubleshooting an unexpected deployment bug right before the sprint deadline.',
      hint: 'Gợi ý: "Huge shoutout to Alex for jumping in to troubleshoot our deployment bug right before the deadline. His quick action helped us deliver the release on schedule with zero customer disruption."',
      explanation_rule: 'Sử dụng ngôn ngữ tích cực, tôn vinh kỹ năng giải quyết vấn đề và nhấn mạnh giá trị mang lại cho toàn đội.'
    }
  }
];

