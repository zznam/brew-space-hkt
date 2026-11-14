import { defineMessages } from '../../../i18n/i18n';

/** Focus timer copy. English is what users and e2e tests see today. */
export const focusMessages = defineMessages(
  {
    title: 'Focus timer',
    intro:
      'A personal Pomodoro aid on this device. It uses your device clock and never affects your session time or bill. It resets if you leave this screen.',
    presetLabel: '{label} min',
    clockLabel: '{phase}, {clock} left',
    paused: ' (paused)',
    summary:
      '{phase}{paused} · Focus blocks done: {cycles} · {work} min focus, {rest} min break',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    phaseWork: 'Focus',
    phaseBreak: 'Break',
    phaseIdle: 'Ready',
    milkDairy: 'dairy milk',
    milkOat: 'oat milk',
    milkAlmond: 'almond milk',
    milkNone: 'no milk',
    breakBase: 'Stand up, stretch and rest your eyes for a few minutes.',
    breakDrink:
      '{base} Fancy a drink? Your saved preference is {milk}, {sweetness}% sweet. Add one from the menu if you like.',
    announceStarted: 'Focus time started: {minutes} minutes.',
    announceResumed: 'Timer resumed. {phase} phase.',
    announcePaused: 'Timer paused.',
    announceBreak:
      'Break time: {minutes} minutes. {cycles} focus block{plural} done.',
    announceReset: 'Timer reset.',
  },
  {
    title: 'Hẹn giờ tập trung',
    intro:
      'Công cụ Pomodoro cá nhân trên thiết bị này. Công cụ dùng đồng hồ của thiết bị và không ảnh hưởng đến thời gian phiên hay hóa đơn của bạn. Hẹn giờ sẽ đặt lại nếu bạn rời khỏi màn hình này.',
    presetLabel: '{label} phút',
    clockLabel: '{phase}, còn {clock}',
    paused: ' (tạm dừng)',
    summary:
      '{phase}{paused} · Số khối tập trung đã xong: {cycles} · {work} phút tập trung, {rest} phút nghỉ',
    start: 'Bắt đầu',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
    reset: 'Đặt lại',
    phaseWork: 'Tập trung',
    phaseBreak: 'Nghỉ',
    phaseIdle: 'Sẵn sàng',
    milkDairy: 'sữa tươi',
    milkOat: 'sữa yến mạch',
    milkAlmond: 'sữa hạnh nhân',
    milkNone: 'không sữa',
    breakBase: 'Hãy đứng dậy, vươn vai và cho mắt nghỉ ngơi vài phút.',
    breakDrink:
      '{base} Muốn uống gì không? Sở thích bạn đã lưu là {milk}, {sweetness}% ngọt. Bạn có thể thêm một ly từ thực đơn.',
    announceStarted: 'Bắt đầu thời gian tập trung: {minutes} phút.',
    announceResumed: 'Hẹn giờ đã tiếp tục. Giai đoạn {phase}.',
    announcePaused: 'Hẹn giờ đã tạm dừng.',
    announceBreak:
      'Đến giờ nghỉ: {minutes} phút. Đã xong {cycles} khối tập trung.',
    announceReset: 'Hẹn giờ đã đặt lại.',
  },
);
