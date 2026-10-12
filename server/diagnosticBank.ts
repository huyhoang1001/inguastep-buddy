import { Question, SectionType, EnglishLevel } from '../src/types/learning.js';

export interface DiagnosticBankItem {
  id: string;
  category: SectionType;
  skillId: string;
  skillName: string;
  difficulty: EnglishLevel;
  topic: 'general' | 'workplace_tech';
  question: Question;
}

export const DIAGNOSTIC_BANK: DiagnosticBankItem[] = [
  // ==========================================
  // GRAMMAR: A2 / B1 / B2 / C1
  // ==========================================
  {
    id: 'diag-gram-a2-past-1',
    category: 'grammar',
    skillId: 'past_simple_regular_irregular',
    skillName: 'Past Simple Regular & Irregular',
    difficulty: 'A2',
    topic: 'general',
    question: {
      id: 'dg-a2-1',
      section: 'grammar',
      skill_id: 'past_simple_regular_irregular',
      skill_name: 'Past Simple Regular & Irregular',
      question_type: 'multiple_choice',
      difficulty: 'A2',
      context_topic: 'general',
      prompt: 'Yesterday, our team ____ the weekly progress report before leaving the office.',
      options: [
        { id: 'A', text: 'finished' },
        { id: 'B', text: 'finish' },
        { id: 'C', text: 'is finishing' },
        { id: 'D', text: 'have finished' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'finished',
      accepted_alternatives: ['finished'],
      hint: 'Chú ý từ chỉ thời gian "Yesterday" (hôm qua). Hành động đã hoàn tất trong quá khứ.',
      explanation_rule: 'Với mốc thời gian xác định trong quá khứ ("Yesterday"), ta sử dụng thì Past Simple (V-ed hoặc bất quy tắc).'
    }
  },
  {
    id: 'diag-gram-b1-pres-perf-1',
    category: 'grammar',
    skillId: 'present_perfect_vs_past_simple',
    skillName: 'Present Perfect vs. Past Simple',
    difficulty: 'B1',
    topic: 'workplace_tech',
    question: {
      id: 'dg-b1-1',
      section: 'grammar',
      skill_id: 'present_perfect_vs_past_simple',
      skill_name: 'Present Perfect vs. Past Simple',
      question_type: 'multiple_choice',
      difficulty: 'B1',
      context_topic: 'workplace_tech',
      prompt: 'Our company ____ three new software engineers since January.',
      options: [
        { id: 'A', text: 'hired' },
        { id: 'B', text: 'has hired' },
        { id: 'C', text: 'hires' },
        { id: 'D', text: 'was hiring' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'has hired',
      accepted_alternatives: ['has hired'],
      hint: 'Chú ý dấu hiệu "since + mốc thời gian" (kể từ tháng 1 đến nay).',
      explanation_rule: 'Cấu trúc "since + mốc thời gian" diễn tả hành động bắt đầu trong quá khứ và kéo dài đến hiện tại, dùng thì Present Perfect (has/have + V3).'
    }
  },
  {
    id: 'diag-gram-b1-conditionals-1',
    category: 'grammar',
    skillId: 'second_conditional',
    skillName: 'Second Conditional (Hypothetical Present)',
    difficulty: 'B1',
    topic: 'general',
    question: {
      id: 'dg-b1-cond',
      section: 'grammar',
      skill_id: 'second_conditional',
      skill_name: 'Second Conditional',
      question_type: 'multiple_choice',
      difficulty: 'B1',
      context_topic: 'general',
      prompt: 'If I ____ more free time on weekends, I would take an advanced English writing course.',
      options: [
        { id: 'A', text: 'have' },
        { id: 'B', text: 'had' },
        { id: 'C', text: 'will have' },
        { id: 'D', text: 'would have' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'had',
      accepted_alternatives: ['had'],
      hint: 'Vế kết quả là "would take" (giả định ở hiện tại). Vế If dùng thì gì?',
      explanation_rule: 'Câu điều kiện loại 2: If + S + Past Simple (had), S + would + V. Dùng để giả định một tình huống không có thật ở hiện tại.'
    }
  },
  {
    id: 'diag-gram-b2-past-perf-1',
    category: 'grammar',
    skillId: 'past_perfect_narrative',
    skillName: 'Past Perfect in Complex Narrative',
    difficulty: 'B2',
    topic: 'workplace_tech',
    question: {
      id: 'dg-b2-1',
      section: 'grammar',
      skill_id: 'past_perfect_narrative',
      skill_name: 'Past Perfect Narrative',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      prompt: 'By the time the product manager joined the meeting, the engineers ____ the database migration.',
      options: [
        { id: 'A', text: 'already completed' },
        { id: 'B', text: 'had already completed' },
        { id: 'C', text: 'have already completed' },
        { id: 'D', text: 'were already completing' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'had already completed',
      accepted_alternatives: ['had already completed', 'had completed'],
      hint: 'Hành động "hoàn thành việc chuyển đổi dữ liệu" xảy ra TRƯỚC thời điểm "product manager vào họp" trong quá khứ.',
      explanation_rule: 'Cấu trúc "By the time + Past Simple, Past Perfect (had + V3)". Diễn tả hành động hoàn tất trước một mốc quá khứ.'
    }
  },
  {
    id: 'diag-gram-b2-mixed-cond-1',
    category: 'grammar',
    skillId: 'mixed_conditionals',
    skillName: 'Third & Mixed Conditionals',
    difficulty: 'B2',
    topic: 'workplace_tech',
    question: {
      id: 'dg-b2-cond',
      section: 'grammar',
      skill_id: 'mixed_conditionals',
      skill_name: 'Third & Mixed Conditionals',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      prompt: 'If the QA lead had flagged the regression on Monday, our staging server ____ stable today.',
      options: [
        { id: 'A', text: 'would be' },
        { id: 'B', text: 'would have been' },
        { id: 'C', text: 'will be' },
        { id: 'D', text: 'had been' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'would be',
      accepted_alternatives: ['would be'],
      hint: 'Hãy nhìn từ "today" ở vế kết quả. Một sự việc trong quá khứ (on Monday) ảnh hưởng đến trạng thái hiện tại (today).',
      explanation_rule: 'Mixed Conditional (3-2): Giả định quá khứ (had flagged on Monday) đem lại kết quả ở hiện tại (would be stable today).'
    }
  },
  {
    id: 'diag-gram-b2-passive-tech',
    category: 'grammar',
    skillId: 'passive_voice_technical',
    skillName: 'Passive Voice in Technical Contexts',
    difficulty: 'B2',
    topic: 'workplace_tech',
    question: {
      id: 'dg-b2-pass',
      section: 'grammar',
      skill_id: 'passive_voice_technical',
      skill_name: 'Passive Voice in Technical Contexts',
      question_type: 'fill_in_blank',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      prompt: 'Complete the sentence with the correct passive form of "resolve":\nDuring yesterday\'s maintenance window, the network outage ________________ (resolve) by the DevOps team within 20 minutes.',
      expected_answer_text: 'was resolved',
      accepted_alternatives: ['was resolved', 'had been resolved'],
      hint: 'Chủ ngữ "the network outage" là số ít, và sự kiện "yesterday\'s maintenance window" xảy ra trong quá khứ.',
      explanation_rule: 'Dùng thì Past Simple thể bị động cho chủ ngữ số ít: "was + resolved".'
    }
  },
  {
    id: 'diag-gram-c1-inversion-1',
    category: 'grammar',
    skillId: 'inversion_negative_adverbials',
    skillName: 'Inversion with Negative Adverbials',
    difficulty: 'C1',
    topic: 'workplace_tech',
    question: {
      id: 'dg-c1-1',
      section: 'grammar',
      skill_id: 'inversion_negative_adverbials',
      skill_name: 'Inversion with Negative Adverbials',
      question_type: 'multiple_choice',
      difficulty: 'C1',
      context_topic: 'workplace_tech',
      prompt: 'Rarely ____ such a seamless cross-team integration without any deployment delays.',
      options: [
        { id: 'A', text: 'we have witnessed' },
        { id: 'B', text: 'have we witnessed' },
        { id: 'C', text: 'did we witnessed' },
        { id: 'D', text: 'we witnessed' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'have we witnessed',
      accepted_alternatives: ['have we witnessed'],
      hint: 'Khi trạng từ phủ định "Rarely" đứng đầu câu, cần đảo trợ động từ lên trước chủ ngữ.',
      explanation_rule: 'Cấu trúc đảo ngữ: Rarely + Auxiliary (have) + Subject (we) + Main Verb (witnessed).'
    }
  },

  // ==========================================
  // VOCABULARY: B1 / B2 / C1
  // ==========================================
  {
    id: 'diag-voc-b1-colloc-1',
    category: 'vocabulary',
    skillId: 'collocation_schedule',
    skillName: 'Workplace Collocations (B1)',
    difficulty: 'B1',
    topic: 'workplace_tech',
    question: {
      id: 'dg-voc-b1',
      section: 'vocabulary',
      skill_id: 'collocation_schedule',
      skill_name: 'Workplace Collocations',
      question_type: 'multiple_choice',
      difficulty: 'B1',
      context_topic: 'workplace_tech',
      prompt: 'Could you please ____ a 30-minute sync meeting with the product owner for tomorrow afternoon?',
      options: [
        { id: 'A', text: 'schedule' },
        { id: 'B', text: 'invent' },
        { id: 'C', text: 'manufacture' },
        { id: 'D', text: 'compose' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'schedule',
      accepted_alternatives: ['schedule'],
      hint: 'Từ nào mang nghĩa lên lịch/sắp xếp một cuộc họp?',
      explanation_rule: 'Collocation thông dụng trong công việc là "schedule a meeting" (lên lịch họp).'
    }
  },
  {
    id: 'diag-voc-b2-mitigate-1',
    category: 'vocabulary',
    skillId: 'collocation_mitigate',
    skillName: 'Precision Collocation (Mitigate)',
    difficulty: 'B2',
    topic: 'workplace_tech',
    question: {
      id: 'dg-voc-b2-mit',
      section: 'vocabulary',
      skill_id: 'collocation_mitigate',
      skill_name: 'Precision Collocation (Mitigate)',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      prompt: 'To ____ the financial risk of exchange rate fluctuations, the CFO recommended hedging options.',
      options: [
        { id: 'A', text: 'mitigate' },
        { id: 'B', text: 'abandon' },
        { id: 'C', text: 'decline' },
        { id: 'D', text: 'vanish' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'mitigate',
      accepted_alternatives: ['mitigate'],
      hint: 'Từ chuyên ngành mang nghĩa "giảm nhẹ mức độ rủi ro/thiệt hại"?',
      explanation_rule: '"mitigate the risk" là collocation chuẩn chỉ việc làm giảm nhẹ rủi ro.'
    }
  },
  {
    id: 'diag-voc-b2-tradeoff-1',
    category: 'vocabulary',
    skillId: 'tradeoff_and_leverage',
    skillName: 'Engineering Vocabulary (Trade-off & Leverage)',
    difficulty: 'B2',
    topic: 'workplace_tech',
    question: {
      id: 'dg-voc-b2-to',
      section: 'vocabulary',
      skill_id: 'tradeoff_and_leverage',
      skill_name: 'Engineering Vocabulary',
      question_type: 'multiple_choice',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      prompt: 'Every architectural decision involves a ____ between rapid feature delivery and long-term maintainability.',
      options: [
        { id: 'A', text: 'trade-off' },
        { id: 'B', text: 'collision' },
        { id: 'C', text: 'standstill' },
        { id: 'D', text: 'repetition' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'trade-off',
      accepted_alternatives: ['trade-off'],
      hint: 'Thuật ngữ chỉ sự đánh đổi hoặc cân nhắc giữa hai yếu tố mâu thuẫn.',
      explanation_rule: '"trade-off" là sự đánh đổi giữa hai tiêu chí (ví dụ: tốc độ release vs tính bền vững của mã nguồn).'
    }
  },
  {
    id: 'diag-voc-c1-viable-1',
    category: 'vocabulary',
    skillId: 'nuanced_adjectives_c1',
    skillName: 'Nuanced Professional Adjectives (C1)',
    difficulty: 'C1',
    topic: 'workplace_tech',
    question: {
      id: 'dg-voc-c1',
      section: 'vocabulary',
      skill_id: 'nuanced_adjectives_c1',
      skill_name: 'Nuanced Professional Adjectives',
      question_type: 'multiple_choice',
      difficulty: 'C1',
      context_topic: 'workplace_tech',
      prompt: 'Due to severe budget constraints, building a fully custom CRM is simply not economically ____ at this stage.',
      options: [
        { id: 'A', text: 'viable' },
        { id: 'B', text: 'tangible' },
        { id: 'C', text: 'subtle' },
        { id: 'D', text: 'arbitrary' }
      ],
      expected_answer_ids: ['A'],
      expected_answer_text: 'viable',
      accepted_alternatives: ['viable', 'feasible'],
      hint: 'Từ nào mang nghĩa "khả thi/có thể tồn tại và thành công về mặt kinh tế"?',
      explanation_rule: '"economically viable" là collocation cao cấp chỉ tính khả thi về mặt tài chính.'
    }
  },

  // ==========================================
  // READING COMPREHENSION: B1 / B2 / C1
  // ==========================================
  {
    id: 'diag-read-b1-remote-1',
    category: 'reading',
    skillId: 'reading_main_idea',
    skillName: 'Reading Comprehension (Main Idea & Detail)',
    difficulty: 'B1',
    topic: 'general',
    question: {
      id: 'dg-read-b1',
      section: 'reading',
      skill_id: 'reading_main_idea',
      skill_name: 'Reading Comprehension',
      question_type: 'reading_comprehension',
      difficulty: 'B1',
      context_topic: 'general',
      reading_passage: {
        title: 'Managing Screen Fatigue',
        word_count: 98,
        topic: 'Health & Remote Work',
        text: 'Working from home offers flexibility, but prolonged screen exposure frequently causes eye strain and cognitive fatigue. Health specialists recommend following the 20-20-20 guideline: every twenty minutes, look away from your monitor at an object twenty feet away for at least twenty seconds. Additionally, scheduling short physical breaks between tasks helps maintain concentration throughout the afternoon. Standing up, stretching, or drinking water resets your focus far more effectively than scrolling on your phone during break time.'
      },
      prompt: 'What is the primary advice given in the passage to combat cognitive fatigue?',
      options: [
        { id: 'A', text: 'Work continuously without pausing until all tasks are finished' },
        { id: 'B', text: 'Take structured physical breaks and periodic eye rests away from screens' },
        { id: 'C', text: 'Check mobile phone social media feeds during work pauses' },
        { id: 'D', text: 'Increase monitor brightness to improve visual clarity' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'Take structured physical breaks and periodic eye rests away from screens',
      accepted_alternatives: ['B'],
      hint: 'Nhìn vào quy tắc 20-20-20 và lời khuyên về "short physical breaks".',
      explanation_rule: 'Đoạn văn khuyên áp dụng quy tắc 20-20-20 và vận động nhẹ thay vì tiếp tục nhìn vào màn hình điện thoại.'
    }
  },
  {
    id: 'diag-read-b2-techdebt-1',
    category: 'reading',
    skillId: 'reading_inference_tech',
    skillName: 'Reading Inference & Author Intent (B2)',
    difficulty: 'B2',
    topic: 'workplace_tech',
    question: {
      id: 'dg-read-b2',
      section: 'reading',
      skill_id: 'reading_inference_tech',
      skill_name: 'Reading Inference & Author Intent',
      question_type: 'reading_comprehension',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      reading_passage: {
        title: 'The Discipline of Technical Refactoring',
        word_count: 132,
        topic: 'Engineering Management',
        text: 'When software startups transition into scaling companies, shortcuts taken during early product validation inevitably transform into systemic friction. Rushing features without modular architectural boundaries creates brittle codebases where a minor patch in payment logic can unexpectedly break user authentication. Experienced tech leads do not advocate for complete system halts or year-long rewrites. Instead, disciplined organizations institutionalize a continuous refactoring quota: allocating roughly fifteen to twenty percent of engineering capacity every sprint to resolve architectural debt, upgrade dependencies, and improve automated regression coverage. This sustainable balance preserves delivery velocity while maintaining platform resilience.'
      },
      prompt: 'What does the author suggest about addressing technical debt in a growing company?',
      options: [
        { id: 'A', text: 'Early-stage shortcuts should never be taken under any circumstances' },
        { id: 'B', text: 'Teams should allocate a regular, bounded portion of sprint time to continuous cleanup' },
        { id: 'C', text: 'Companies must freeze all new feature development until the system is rewritten' },
        { id: 'D', text: 'Automated regression testing is unnecessary once a product matures' }
      ],
      expected_answer_ids: ['B'],
      expected_answer_text: 'Teams should allocate a regular, bounded portion of sprint time to continuous cleanup',
      accepted_alternatives: ['B'],
      hint: 'Đọc câu: "allocating roughly fifteen to twenty percent of engineering capacity every sprint to resolve architectural debt..."',
      explanation_rule: 'Tác giả ủng hộ phương pháp tiếp cận bền vững: dành 15-20% công suất mỗi sprint để refactor liên tục.'
    }
  },

  // ==========================================
  // ORIGINAL WRITING TASKS: B1 / B2 / C1
  // ==========================================
  {
    id: 'diag-write-b1-workflow',
    category: 'writing',
    skillId: 'writing_routine_opinion',
    skillName: 'Describing Routine & Expressing Opinions (B1)',
    difficulty: 'B1',
    topic: 'general',
    question: {
      id: 'dg-write-b1',
      section: 'writing',
      skill_id: 'writing_routine_opinion',
      skill_name: 'Describing Routine & Opinions',
      question_type: 'free_writing',
      difficulty: 'B1',
      context_topic: 'general',
      prompt: 'Write 3 to 4 sentences in English describing your daily routine or favorite way to spend your weekend. Explain why this routine works well for you.',
      hint: 'Sử dụng thì Present Simple cho thói quen hàng ngày và từ nối như "Usually", "Because", "In addition".',
      explanation_rule: 'Đánh giá độ chính xác ngữ pháp thì hiện tại, vốn từ cơ bản và khả năng liên kết câu tự nhiên.'
    }
  },
  {
    id: 'diag-write-b2-workplace-update',
    category: 'writing',
    skillId: 'writing_workplace_communication',
    skillName: 'Professional Blocker & Status Update (B2)',
    difficulty: 'B2',
    topic: 'workplace_tech',
    question: {
      id: 'dg-write-b2',
      section: 'writing',
      skill_id: 'writing_workplace_communication',
      skill_name: 'Workplace Blocker Update',
      question_type: 'free_writing',
      difficulty: 'B2',
      context_topic: 'workplace_tech',
      prompt: 'Write 3 to 4 sentences in English updating your team or manager on a task taking longer than expected. State what happened, what action you are taking right now, and when you expect to deliver the result.',
      hint: 'Bạn có thể dùng mẫu câu: "I ran into an unexpected issue with...", "Currently, I am investigating...", "I expect to complete the fix by..."',
      explanation_rule: 'Đánh giá tính mạch lạc, thì động từ phù hợp (Past Simple cho sự cố, Present Continuous cho hành động hiện tại, Future cho thời hạn) và văn phong chuyên nghiệp.'
    }
  },
  {
    id: 'diag-write-c1-tradeoffs',
    category: 'writing',
    skillId: 'writing_proposal_tradeoffs',
    skillName: 'Nuanced Proposal & Synthesizing Trade-offs (C1)',
    difficulty: 'C1',
    topic: 'workplace_tech',
    question: {
      id: 'dg-write-c1',
      section: 'writing',
      skill_id: 'writing_proposal_tradeoffs',
      skill_name: 'Nuanced Proposal & Trade-offs',
      question_type: 'free_writing',
      difficulty: 'C1',
      context_topic: 'workplace_tech',
      prompt: 'Write 4 to 5 sentences proposing a process or technical improvement for your team. Acknowledge one potential trade-off or short-term friction, and argue why the long-term benefit outweighs it.',
      hint: 'Sử dụng các cấu trúc liên kết nhượng bộ và đối lập như: "While adopting X requires initial overhead...", "Nevertheless...", "In the long run..."',
      explanation_rule: 'Đánh giá cấu trúc câu phức, từ nối đối lập/nhượng bộ, từ vựng nâng cao và sự tự nhiên trong lập luận chuyên nghiệp.'
    }
  }
];
