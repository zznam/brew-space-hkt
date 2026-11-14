import { defineMessages } from '../../../i18n/i18n';

/** Screen chrome for "Ask the venue". Answers come from conciergeModel, which
 * has its own English and Vietnamese text. English must stay identical. */
export const conciergeMessages = defineMessages(
  {
    overline: 'CUSTOMER / VENUE CONCIERGE',
    loading: 'Loading the assistant…',
    heading: 'Ask the venue',
    intro: '{venue}. {note} You can write in English or Vietnamese.',
    suggested: 'Suggested questions',
    inputLabel: 'Ask the venue a question',
    placeholder: 'e.g. How many seats are free?',
    ask: 'Ask',
    conversation: 'Conversation',
    empty: 'No questions yet. Tap a suggestion or type your own.',
    you: 'You',
    assistant: 'Venue assistant',
    back: 'Back to explore',
  },
  {
    overline: 'KHÁCH / TRỢ LÝ QUÁN',
    loading: 'Đang tải trợ lý…',
    heading: 'Hỏi quán',
    intro: '{venue}. {note} Bạn có thể viết bằng tiếng Anh hoặc tiếng Việt.',
    suggested: 'Câu hỏi gợi ý',
    inputLabel: 'Hỏi quán một câu hỏi',
    placeholder: 'vd: Còn bao nhiêu chỗ trống?',
    ask: 'Hỏi',
    conversation: 'Cuộc trò chuyện',
    empty: 'Chưa có câu hỏi nào. Hãy chạm vào một gợi ý hoặc tự gõ câu hỏi.',
    you: 'Bạn',
    assistant: 'Trợ lý của quán',
    back: 'Quay lại khám phá',
  },
);
