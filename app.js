/* Остров: кликабельный прототип. Все данные примерные; прогресс хранится только в этом браузере. */
(function () {
  'use strict';

  /* ---------- Примерные данные ---------- */
  const USER = 'Адиль';

  const SPHERES = {
    health: { name: 'Здоровье', place: 'Лес', icon: '<path d="M12 21v-5"/><path d="M6 16h12L12 4z"/>' },
    mind:   { name: 'Разум', place: 'Башня', icon: '<path d="M8 21V9l4-5 4 5v12z"/><path d="M8 13h8"/>' },
    work:   { name: 'Дело', place: 'Мастерская', icon: '<path d="M4 20l8.5-8.5"/><path d="M12 9l3-3 4 4-3 3z"/>' },
    money:  { name: 'Деньги', place: 'Кристаллы', icon: '<path d="M12 3l6 7-6 11-6-11z"/><path d="M6 10h12"/>' },
    people: { name: 'Близкие', place: 'Дом у костра', icon: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>' },
    spirit: { name: 'Дух', place: 'Озеро', icon: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>' },
  };
  const SPHERE_KEYS = Object.keys(SPHERES);
  const SPHERE_NEED = 400;
  const SPHERE_START = {
    health: { lvl: 9, xp: 256, vitality: 0.9, idle: 0 },
    mind:   { lvl: 11, xp: 120, vitality: 0.95, idle: 0 },
    work:   { lvl: 13, xp: 288, vitality: 0.86, idle: 0 },
    money:  { lvl: 5, xp: 180, vitality: 0.7, idle: 2 },
    people: { lvl: 8, xp: 80, vitality: 0.34, idle: 9 },
    spirit: { lvl: 6, xp: 220, vitality: 0.58, idle: 3 },
  };

  const SIZE_XP = { S: 10, M: 25, L: 60 };
  const PHASES = {
    morning: { label: 'Утро', range: '5–12', clock: '08:10', greet: 'Доброе утро' },
    day:     { label: 'День', range: '12–18', clock: '14:30', greet: 'Добрый день' },
    evening: { label: 'Вечер', range: '18–23', clock: '20:40', greet: 'Добрый вечер' },
    night:   { label: 'Ночь', range: '23–5', clock: '23:50', greet: 'Доброй ночи' },
  };
  const BLOCKS = ['morning', 'day', 'evening'];

  const SEASON = { num: 'V', name: 'Осень 2026', start: new Date(2026, 9, 5), end: new Date(2026, 11, 27) };
  const BOSS = { title: '10 км без остановки', target: 10, best: 6.2, bestDate: '24 октября', trainings: 9, plan: 24, finale: '27 декабря', reward: 'Новые кроссовки', judge: 'Ерлан' };

  const DAY_BASE = [
    { id: 'run', block: 'morning', title: 'Пробежка 5 км', sphere: 'health', size: 'M', mins: 35, energy: 'high', quest: 'boss', trigger: 'Когда проснусь → кроссовки уже у двери' },
    { id: 'read', block: 'morning', title: '10 страниц книги', sphere: 'mind', size: 'S', mins: 15, energy: 'low', trigger: 'После утреннего кофе' },
    { id: 'quiet', block: 'morning', title: '5 минут тишины', sphere: 'spirit', size: 'S', mins: 5, energy: 'low', trigger: 'Перед тем как открыть телефон' },
    { id: 'proto', block: 'day', title: '2 часа над прототипом', sphere: 'work', size: 'L', mins: 120, energy: 'high', quest: 'q3', trigger: 'После обеда → ноутбук, телефон в другой комнате' },
    { id: 'money', block: 'day', title: 'Записать расходы', sphere: 'money', size: 'S', mins: 3, energy: 'low', trigger: 'Когда приходит чек → сразу в учёт' },
    { id: 'mom', block: 'day', title: 'Позвонить маме', sphere: 'people', size: 'M', mins: 15, energy: 'mid', trigger: 'По дороге домой' },
    { id: 'eng', block: 'evening', title: '20 минут английского', sphere: 'mind', size: 'M', mins: 20, energy: 'mid', quest: 'q1', trigger: 'Если в 21:00 беру телефон → сначала Anki и серия' },
    { id: 'reflect', block: 'evening', title: 'Вопрос дня', sphere: 'spirit', size: 'S', mins: 1, energy: 'low', kind: 'reflect', trigger: 'Перед сном, одна минута' },
    { id: 'sleep', block: 'evening', title: 'Отбой до 23:30', sphere: 'health', size: 'S', mins: 0, energy: 'low', trigger: 'В 23:00 → телефон на зарядку в коридоре' },
  ];
  const REVIEW_ITEM = { id: 'review', block: 'evening', title: 'Итоги недели', sphere: 'spirit', size: 'M', mins: 10, energy: 'mid', kind: 'reflect', trigger: 'Воскресенье вечером, 10 минут' };

  const ENERGY = {
    low:  { label: 'Мало', bars: 1, rank: 0, need: 'хватит и малых сил', long: 'малых силах' },
    mid:  { label: 'Норм', bars: 2, rank: 1, need: 'нужны средние силы', long: 'средних силах' },
    high: { label: 'Много', bars: 3, rank: 2, need: 'нужно много сил', long: 'больших силах' },
  };
  const TIMES = [[5, '5 мин'], [15, '15 мин'], [30, '30 мин'], [60, '1 ч'], [120, '2 ч+']];
  function sizeForMins(m) { return m <= 10 ? 'S' : m <= 30 ? 'M' : 'L'; }

  const INBOX_SEED = [
    'Купить подарок Аружан на день рождения',
    'Записаться к стоматологу',
    'Ответить Ерлану про поход в субботу',
    'Идея для Острова: питомец, который живёт на острове',
  ];
  const LATER_SEED = [
    'Полумарафон в Алматы',
    'Поход к Чарынскому каньону',
    'Выучить турецкий до A2',
    'Свой подкаст о продуктах',
    'Курс по SwiftUI',
  ];

  const WEEK_BASE = [
    { id: 'run', title: 'Бег', sphere: 'health', done: 2, target: 3 },
    { id: 'eng', title: 'Английский', sphere: 'mind', done: 4, target: 5 },
    { id: 'read', title: 'Чтение', sphere: 'mind', done: 5, target: 7 },
    { id: 'quiet', title: 'Тишина', sphere: 'spirit', done: 2, target: 4 },
    { id: 'mom', title: 'Звонок родителям', sphere: 'people', done: 0, target: 2 },
  ];
  const WEEK_PATTERN = [1, 1, 0, 1, 1, 1, 1];

  const QUESTS = [
    {
      id: 'q1', title: 'Английский: от B1 к B2', sphere: 'mind',
      woop: {
        wish: 'Смотреть сериалы без субтитров',
        outcome: 'Понимаю на слух 80% серии',
        obstacle: 'Вечером устаю и залипаю в телефон',
        plan: 'Если в 21:00 беру телефон → сначала 20 минут Anki и серия на английском',
      },
      steps: [
        { t: '30 уроков грамматики B2', f: 1 },
        { t: '500 новых слов в Anki', f: 0.42, label: '210 из 500' },
        { t: '10 серий без русских субтитров', f: 0.3, label: '3 из 10' },
        { t: '4 встречи разговорного клуба', f: 0.25, label: '1 из 4' },
      ],
    },
    {
      id: 'q2', title: 'Подушка: 3 месяца расходов', sphere: 'money',
      woop: {
        wish: 'Спокойствие, если что-то случится с работой',
        outcome: 'На отдельном счёте лежат 3 месяца расходов',
        obstacle: 'Импульсные покупки в конце месяца',
        plan: 'Если хочу купить что-то дороже 20 000 ₸ → жду 72 часа',
      },
      steps: [
        { t: 'Посчитать расходы за месяц', f: 1 },
        { t: 'Автоперевод 15% в день зарплаты', f: 1 },
        { t: 'Отложен 1 месяц расходов', f: 1 },
        { t: 'Отложено 2 месяца расходов', f: 0.4, label: '40%' },
        { t: 'Отложено 3 месяца расходов', f: 0 },
      ],
    },
    {
      id: 'q3', title: 'Собрать прототип «Острова»', sphere: 'work',
      woop: {
        wish: 'Свой продукт, которым пользуюсь сам',
        outcome: 'Прототип, который можно показать 10 друзьям',
        obstacle: 'Хочу сделать всё сразу и тону в масштабе',
        plan: 'Если тянет добавить фичу → записываю в «Потом» и возвращаюсь к MVP',
      },
      steps: [
        { t: 'Описать идею', f: 1 },
        { t: 'Разобрать конкурентов', f: 1 },
        { t: 'Выбрать механики по исследованиям', f: 1 },
        { t: 'Собрать кликабельный прототип', f: 0 },
        { t: 'Показать 10 друзьям', f: 0 },
        { t: 'Прожить с ним один сезон', f: 0 },
      ],
    },
  ];

  const SKILLS = {
    health: [
      { name: 'Бег', rank: 'C', now: '5 км без остановки', next: '10 км быстрее 60 минут' },
      { name: 'Сон', rank: 'B', now: '7+ часов 5 ночей из 7', next: 'ложусь до 23:30 весь месяц' },
      { name: 'Силовые', rank: 'D', now: '2 тренировки в неделю', next: '3 тренировки в неделю месяц подряд' },
    ],
    mind: [
      { name: 'Английский', rank: 'C', now: 'B1: сериал с английскими субтитрами', next: 'B2: смотрю без субтитров и понимаю 80%' },
      { name: 'Чтение', rank: 'B', now: '2 книги в месяц', next: '30 книг за год' },
    ],
    work: [
      { name: 'Программирование', rank: 'B', now: 'делаю продукт от идеи до релиза сам', next: 'веду команду из трёх человек' },
      { name: 'Выступления', rank: 'D', now: 'рассказал о проекте друзьям', next: 'доклад на митапе' },
    ],
    money: [
      { name: 'Учёт расходов', rank: 'C', now: 'веду учёт 3 месяца подряд', next: 'бюджет на месяц вперёд полгода подряд' },
      { name: 'Подушка', rank: 'D', now: 'отложен 1 месяц расходов', next: 'отложено 3 месяца расходов' },
    ],
    people: [
      { name: 'Семья', rank: 'C', now: 'звоню родителям раз в неделю', next: '2 звонка в неделю и ужин раз в месяц' },
      { name: 'Друзья', rank: 'D', now: 'встреча раз в месяц', next: 'встреча раз в две недели' },
    ],
    spirit: [
      { name: 'Тишина', rank: 'D', now: '5 минут тишины 2 дня из 7', next: '4 дня из 7 два месяца подряд' },
      { name: 'Дневник', rank: 'C', now: 'вопрос дня 5 вечеров из 7', next: 'письмо себе каждый месяц' },
    ],
  };
  const RANKS = ['D', 'C', 'B', 'A', 'S'];

  const SEASON_LOG = [
    { date: '24 окт', text: 'Длинная пробежка 6,2 км без остановки. Новый рекорд, босс потерял 0,4 км HP.', sphere: 'health', size: 'L' },
    { date: '22 окт', text: 'Разобрал конкурентов и выбрал механики для «Острова» по исследованиям.', sphere: 'work', size: 'L' },
    { date: '21 окт', text: 'Пропуск. Ничего не сгорело: в четверг продолжил с того же места.', quiet: true },
    { date: '18 окт', text: 'Итоги недели: английский 5 из 5, бег 3 из 3.', sphere: 'spirit', size: 'M' },
    { date: '11 окт', text: 'Первый разговорный клуб на английском. Страшно, но понял почти всё.', sphere: 'mind', size: 'M' },
    { date: '5 окт', text: 'Начало сезона V. Квесты: английский, подушка, прототип. Босс: 10 км без остановки.', quiet: true },
  ];
  const PAST_SEASONS = [
    { title: 'Сезон IV · Лето 2026', badge: '«Ранняя птица»', lines: ['Первые 5 км без остановки', 'Отложен первый месяц расходов', '71 активный день из 84'] },
    { title: 'Сезон III · Весна 2026', badge: '«Возвращение»', lines: ['Перерыв три недели в марте и возвращение', 'Начал английский с уровня B1'] },
    { title: 'Сезон II · Зима 2025–26', badge: '«Ритм»', lines: ['Прочитал 6 книг', 'Сон до 23:30 пять ночей из семи'] },
    { title: 'Сезон I · Осень 2025', badge: '«Первый шаг»', lines: ['25 октября: первый день на Острове', 'Первая пробежка: 2 км и три остановки'] },
  ];
  const ARTIFACTS = [
    { title: 'Первые 5 км', meta: 'июль 2026', sphere: 'health' },
    { title: 'Возвращение', meta: 'после трёх недель перерыва, март 2026', sphere: 'spirit' },
    { title: 'Месяц подушки', meta: 'сентябрь 2026', sphere: 'money' },
    { title: '100 вечеров английского', meta: 'октябрь 2026', sphere: 'mind' },
  ];
  const QUESTIONS = ['Что сегодня получилось лучше, чем вчера?', 'За что ты благодарен сегодня?', 'Что одно сделаешь завтра первым?'];
  const REVIEW_QUESTION = 'Что на этой неделе сработало, а что стоит поменять?';

  const NOTES = {
    today: {
      title: 'Сегодня', horizon: ['Сейчас', 'День', 'Неделя'],
      lead: 'Экран отвечает на вопрос «что делать прямо сейчас». Ниже план дня и неделя.',
      points: [
        ['Одно действие сейчас', 'Карточка выбирает дело по времени суток. Скажи, сколько есть сил и минут, и она подберёт то, что в них влезет.'],
        ['Входящие и «Потом»', 'Мысль записывается за секунду, а разбирается позже: сделать сразу, если это 2 минуты, в план, в «Потом» или удалить. Записанный план снимает навязчивые мысли (Masicampo & Baumeister, 2011).'],
        ['План «если — то»', 'У каждой привычки есть триггер. Такие планы заметно повышают выполнение (Gollwitzer & Sheeran, 2006).'],
        ['Опыт без торга', 'Размер дела задаёт время: до 10 минут S, до 30 M, дольше L. Уровень нельзя накрутить, поэтому он что-то значит.'],
        ['Гибкая неделя', 'Цели вида «3 из 7». Пропущенный день ничего не обнуляет (Lally и др., 2010).'],
      ],
    },
    season: {
      title: 'Сезон', horizon: ['Неделя', 'Сезон'],
      lead: '12 недель игры и неделя межсезонья. Четыре сезона складываются в год.',
      points: [
        ['Новый старт каждые 3 месяца', 'Временные отметки подталкивают браться за цели (Dai, Milkman, Riis, 2014). Сезон даёт такую отметку четыре раза в год.'],
        ['Босс сезона', 'Одна большая цель с проверкой из жизни. Каждая тренировка приближает финальную битву.'],
        ['Препятствие в каждом квесте', 'При создании квеста Остров спрашивает, что помешает, и просит план на этот случай (WOOP, Oettingen).'],
        ['Пати', '2–5 близких людей. Награды подтверждает друг, поэтому их нельзя забрать самому.'],
        ['«Потом» питает сезоны', 'Идеи без срока ждут в «Потом». В межсезонье из них выбираются квесты на следующий сезон.'],
      ],
    },
    island: {
      title: 'Остров', horizon: ['Жизнь'],
      lead: 'Остров растёт годами. Каждое место на нём соответствует сфере жизни.',
      points: [
        ['Сферы не умирают', 'Без внимания место зарастает и теряет цвет. Одно действие возвращает его. Наказаний нет.'],
        ['Ранги с проверкой из жизни', 'Навыки растут от D до S, и у каждого ранга есть понятный критерий: «10 км быстрее 60 минут».'],
        ['Дерево в центре', 'Растёт вместе с уровнем. Через десять лет оно станет огромным.'],
      ],
    },
    chronicle: {
      title: 'Летопись', horizon: ['Сезон', 'Жизнь'],
      lead: 'Летопись делает Остров ценнее с каждым годом. Её жалко бросать.',
      points: [
        ['Счётчик не обнуляется', '«Дней в этом году» вместо «дней подряд». Пропуск никогда не отнимает сделанное.'],
        ['Возвращения считаются достижением', 'Вернуться после перерыва трудно. Остров это отмечает и даёт +50 XP.'],
        ['Год назад', 'Видно, каким ты был в этот день год назад и насколько вырос.'],
      ],
    },
  };
  const HORIZONS = ['Сейчас', 'День', 'Неделя', 'Сезон', 'Жизнь'];

  /* ---------- Даты ---------- */
  const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const WD_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const NOW0 = new Date();
  const TODAY = new Date(NOW0.getFullYear(), NOW0.getMonth(), NOW0.getDate());
  const TODAY_KEY = TODAY.getFullYear() + '-' + (TODAY.getMonth() + 1) + '-' + TODAY.getDate();
  const IS_SUNDAY = TODAY.getDay() === 0;
  const ANNIVERSARY = TODAY.getMonth() === 9 && TODAY.getDate() === 25;
  const DAY_FIXED = (function () {
    const list = DAY_BASE.slice();
    if (IS_SUNDAY) list.splice(list.findIndex(function (i) { return i.id === 'reflect'; }), 0, REVIEW_ITEM);
    return list;
  })();

  function seasonWeek() {
    const w = Math.floor((TODAY - SEASON.start) / (7 * 864e5)) + 1;
    return Math.min(12, Math.max(1, w));
  }
  function daysLeft() { return Math.max(0, Math.round((SEASON.end - TODAY) / 864e5)); }

  /* ---------- Состояние ---------- */
  const KEY = 'ostrov-prototype-v1';
  function fresh() {
    return {
      v: 1, day: TODAY_KEY, xp: 1340, lvl: 12, xpToday: 0,
      spheres: JSON.parse(JSON.stringify(SPHERE_START)),
      done: {}, steps: {}, notes: {}, log: [],
      best: BOSS.best, trainings: BOSS.trainings,
      phase: 'auto', comebacks: 3, cheered: false, letter: '',
      inbox: INBOX_SEED.map(function (t, i) { return { id: 'in' + i, text: t }; }),
      later: LATER_SEED.map(function (t, i) { return { id: 'lt' + i, text: t }; }),
      custom: [], fit: { energy: null, time: null }, inboxZero: false,
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 1) {
          if (s.day !== TODAY_KEY) {
            // несделанные дела из входящих переезжают на новый день
            s.custom = (s.custom || []).filter(function (c) { return !(s.done || {})[c.id]; });
            s.day = TODAY_KEY; s.done = {}; s.log = []; s.xpToday = 0; s.notes = {}; s.cheered = false;
            s.fit = { energy: null, time: null }; s.inboxZero = false;
          }
          return Object.assign(fresh(), s);
        }
      }
    } catch (e) { /* хранилище недоступно: работаем без него */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* не критично */ }
  }
  let S = load();
  let tab = 'today';
  let focusFirst = null;
  let fitOpen = null;
  let ibTab = 'inbox';
  const skipped = new Set();
  function day() { return DAY_FIXED.concat(S.custom); }

  /* ---------- Хелперы ---------- */
  const $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
  function dec(n) { return n.toLocaleString('ru-RU', { maximumFractionDigits: 1 }); }
  function ic(paths, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }
  const I = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    ifthen: '<path d="M4 7h10a4 4 0 0 1 0 8H8"/><path d="M11 12l-3 3 3 3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    tree: '<path d="M12 21v-6"/><circle cx="12" cy="9" r="6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    tray: '<path d="M3 13l2.4-7.2A2.5 2.5 0 0 1 7.8 4h8.4a2.5 2.5 0 0 1 2.4 1.8L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
    ok: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
  };
  function battery(bars) {
    let p = '<rect x="2.5" y="7" width="16" height="10" rx="2.5"/><path d="M21.5 10.5v3"/>';
    for (let i = 0; i < bars; i++) p += '<path d="M' + (6.5 + i * 3.5) + ' 10v4"/>';
    return p;
  }
  function sphereColor(k) { return getComputedStyle(document.documentElement).getPropertyValue('--c-' + k).trim(); }
  function phase() {
    if (S.phase !== 'auto') return S.phase;
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'day';
    if (h >= 18 && h < 23) return 'evening';
    return 'night';
  }
  function clockText() {
    if (S.phase !== 'auto') return PHASES[S.phase].clock;
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function hourNow() { return S.phase === 'auto' ? new Date().getHours() : parseInt(PHASES[S.phase].clock, 10); }
  function needFor(lvl) { return 800 + 100 * lvl; }
  function yearDays() { return 213 + (S.xpToday > 0 ? 1 : 0); }
  function stateOf(v) {
    if (v >= 0.85) return { key: 'bloom', label: 'Цветёт' };
    if (v >= 0.65) return { key: 'grow', label: 'Растёт' };
    if (v >= 0.5) return { key: 'ok', label: 'Ухожено' };
    return { key: 'wild', label: 'Зарастает' };
  }
  function questPct(q) {
    const sum = q.steps.reduce(function (a, s, i) { return a + (stepDone(q, i) ? 1 : s.f); }, 0);
    return Math.round(sum / q.steps.length * 100);
  }
  function stepDone(q, i) {
    const k = q.id + ':' + i;
    if (k in S.steps) return S.steps[k];
    return q.steps[i].f === 1;
  }
  function weekDone(g) { return g.done + (S.done[g.id] ? 1 : 0); }
  function timeNow() { return clockText(); }

  /* ---------- Механика ---------- */
  function gain(xp, sphere) {
    const firstToday = S.xpToday === 0;
    S.xp += xp;
    S.xpToday += xp;
    let leveled = false;
    while (S.xp >= needFor(S.lvl)) { S.xp -= needFor(S.lvl); S.lvl++; leveled = true; }
    let revived = false;
    if (sphere) {
      const sp = S.spheres[sphere];
      const before = stateOf(sp.vitality).key;
      sp.xp += xp;
      while (sp.xp >= SPHERE_NEED) { sp.xp -= SPHERE_NEED; sp.lvl++; }
      sp.vitality = Math.min(1, sp.vitality + 0.24);
      sp.idle = 0;
      revived = before === 'wild' && stateOf(sp.vitality).key !== 'wild';
      if (window.Island) Island.setVitality(sphere, sp.vitality);
    }
    if (window.Island) Island.setLevel(S.lvl);
    return { leveled: leveled, firstToday: firstToday, revived: revived };
  }
  function ungain(xp, sphere) {
    S.xp -= xp;
    S.xpToday = Math.max(0, S.xpToday - xp);
    while (S.xp < 0 && S.lvl > 1) { S.lvl--; S.xp += needFor(S.lvl); }
    if (sphere) S.spheres[sphere].xp = Math.max(0, S.spheres[sphere].xp - xp);
    if (window.Island) Island.setLevel(S.lvl);
  }
  function celebrate(anchor, xp, sphere, r) {
    if (anchor) xpFloat(anchor, '+' + xp);
    if (sphere && window.Island) Island.burst(sphere, sphereColor(sphere));
    if (r.leveled) toast('Новый уровень: ' + S.lvl + '. Дерево в центре острова подросло', 'level');
    else if (r.revived) toast('«' + SPHERES[sphere].place + '» снова в цвету');
    else if (r.firstToday) toast('День засчитан: ' + yearDays() + '-й в этом году');
  }

  function toggleItem(id, anchor) {
    const it = day().find(function (i) { return i.id === id; });
    if (!it) return;
    const xp = SIZE_XP[it.size];
    if (S.done[id]) {
      delete S.done[id];
      ungain(xp, it.sphere);
      if (it.id === 'run') S.trainings--;
      S.log = S.log.filter(function (e) { return e.id !== id; });
      save();
      render(true);
      return;
    }
    S.done[id] = Date.now();
    if (it.id === 'run') S.trainings++;
    if (focusFirst === id) focusFirst = null;
    const r = gain(xp, it.sphere);
    S.log.unshift({ id: id, t: timeNow(), text: it.title, sphere: it.sphere, size: it.size });
    save();
    const row = anchor && anchor.closest('.item');
    if (row) row.classList.add('done', 'just-done');
    celebrate(anchor, xp, it.sphere, r);
    setTimeout(function () { render(true); }, row ? 420 : 0);
  }

  function fitActive() { return !!(S.fit.energy || S.fit.time); }
  function fits(it) {
    if (S.fit.energy && ENERGY[it.energy].rank > ENERGY[S.fit.energy].rank) return false;
    if (S.fit.time && it.mins > S.fit.time) return false;
    return true;
  }
  // чем выше, тем лучше дело подходит под «сейчас»
  function fitScore(it, p) {
    const bi = BLOCKS.indexOf(p), ib = BLOCKS.indexOf(it.block);
    let s = ib === bi ? 3 : ib < bi ? 2 : 1;
    if (S.fit.energy && it.energy === S.fit.energy) s += 2;
    if (S.fit.time && it.mins) s += Math.min(1, it.mins / S.fit.time) * 1.5;
    if (it.quest) s += 1;
    if (stateOf(S.spheres[it.sphere].vitality).key === 'wild') s += 1;
    if (it.id === 'sleep') s -= 3;
    return s;
  }
  function nowPlan() {
    const p = phase();
    const pending = day().filter(function (i) { return !S.done[i.id] && !skipped.has(i.id); });
    if (focusFirst) {
      const f = pending.find(function (i) { return i.id === focusFirst; });
      if (f) return { item: f, label: 'Начни с малого' };
    }
    if (fitActive()) {
      const cands = pending.filter(fits);
      if (cands.length) {
        cands.sort(function (a, b) { return fitScore(b, p) - fitScore(a, p); });
        return { item: cands[0], label: 'Подобрано', fitted: true };
      }
      if (pending.length) return { nofit: true };
    }
    if (p === 'night') {
      const r = pending.find(function (i) { return i.kind === 'reflect'; });
      if (r) return { item: r, label: 'Перед сном' };
      return { rest: true };
    }
    const bi = BLOCKS.indexOf(p);
    let it = pending.find(function (i) { return i.block === p; });
    if (it) return { item: it, label: 'Сейчас' };
    it = pending.find(function (i) { return BLOCKS.indexOf(i.block) > bi; });
    if (it) return { item: it, label: 'Следом · ' + PHASES[it.block].label.toLowerCase() };
    it = pending.find(function (i) { return BLOCKS.indexOf(i.block) < bi; });
    if (it) return { item: it, label: 'Ещё успеешь' };
    if (day().every(function (i) { return S.done[i.id]; })) return { allDone: true };
    return { skippedAll: true };
  }

  /* ---------- Экран «Сегодня» ---------- */
  function hero(p) {
    const need = needFor(S.lvl);
    const C = 2 * Math.PI * 23;
    const off = C * (1 - S.xp / need);
    return '<section class="hero sky phase-' + p + '">' +
      '<div class="island-host" data-view="today">' + fallbackIsland() + '</div>' +
      '<div class="hero-top">' +
        '<div><p class="hero-date">' + cap(WD[TODAY.getDay()]) + ', ' + TODAY.getDate() + ' ' + MON[TODAY.getMonth()] + '</p>' +
        '<h1 class="hero-greet">' + PHASES[p].greet + ', ' + USER + '</h1>' +
        '<p class="hero-meta"><span>' + PHASES[p].label + ' · ' + clockText() + '</span><span>Сезон ' + SEASON.num + ', неделя ' + seasonWeek() + ' из 12</span>' +
        '<button class="sky-chip only-mobile" type="button" data-action="demo">Демо</button></p></div>' +
        '<button class="lvl" type="button" data-tab-go="island" aria-label="Уровень ' + S.lvl + ', открыть остров">' +
          '<svg viewBox="0 0 52 52" aria-hidden="true"><circle class="track" cx="26" cy="26" r="23" fill="none" stroke-width="3"/>' +
          '<circle class="fill" cx="26" cy="26" r="23" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
          '<b>' + S.lvl + '</b><small>уровень</small></button>' +
      '</div>' +
    '</section>';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fallbackIsland() {
    return '<svg class="island-fallback" viewBox="0 0 200 130" aria-hidden="true">' +
      '<path d="M28 62 L172 62 L146 82 L124 104 L100 120 L78 102 L56 82 Z" fill="#6E6170"/>' +
      '<path d="M24 60 Q100 50 176 60 L172 66 Q100 58 28 66 Z" fill="#79B45F"/>' +
      '<path d="M100 60 V42" stroke="#6E4B31" stroke-width="5"/><circle cx="100" cy="34" r="13" fill="#5FAE58"/></svg>';
  }

  function questLine(it) {
    if (!it.quest) return '';
    if (it.quest === 'boss') {
      return '<button class="quest-line" type="button" data-tab-go="season" style="--c: var(--c-health)">' +
        '<span>Шаг к боссу сезона</span><b>' + BOSS.title + '</b><span class="ql-meta">тренировка ' + (S.trainings + 1) + ' из ' + BOSS.plan + '</span></button>';
    }
    const q = QUESTS.find(function (x) { return x.id === it.quest; });
    const pct = questPct(q);
    return '<button class="quest-line" type="button" data-quest="' + q.id + '" style="--c: var(--c-' + q.sphere + ')">' +
      '<span>Квест сезона</span><b>' + q.title + '</b><span class="ql-meta">' + pct + '%</span>' +
      '<span class="bar"><i style="width:' + pct + '%"></i></span></button>';
  }

  /* Подбор: две «таблетки» в шапке карточки, по нажатию раскрывается ряд вариантов. */
  function fitPicker() {
    const f = S.fit;
    function pill(key, icon, label, on) {
      return '<button class="fit-pill' + (on ? ' on' : '') + '" type="button" data-fit-open="' + key + '" aria-expanded="' + (fitOpen === key) + '">' +
        ic(icon, '') + '<span>' + label + '</span></button>';
    }
    const pills = '<div class="fit-pills">' +
      pill('energy', battery(f.energy ? ENERGY[f.energy].bars : 2), f.energy ? ENERGY[f.energy].label : 'Силы', !!f.energy) +
      pill('time', I.clock, f.time ? TIMES.find(function (t) { return t[0] === f.time; })[1] : 'Время', !!f.time) +
    '</div>';
    let row = '';
    if (fitOpen === 'energy') {
      row = '<div class="fit-row" role="group" aria-label="Сколько сейчас сил">' +
        [['', 'Любые'], ['low', 'Мало'], ['mid', 'Норм'], ['high', 'Много']].map(function (o) {
          return '<button type="button" data-fit-energy="' + o[0] + '" aria-pressed="' + ((f.energy || '') === o[0]) + '">' + o[1] + '</button>';
        }).join('') + '</div>';
    } else if (fitOpen === 'time') {
      row = '<div class="fit-row" role="group" aria-label="Сколько есть времени">' +
        [['', 'Любое']].concat(TIMES).map(function (o) {
          return '<button type="button" data-fit-time="' + o[0] + '" aria-pressed="' + (String(f.time || '') === String(o[0])) + '">' + o[1] + '</button>';
        }).join('') + '</div>';
    }
    return { pills: pills, row: row };
  }
  function nowHead(label, fp) {
    return '<div class="now-top"><p class="now-label">' + label + '</p>' + fp.pills + '</div>' + fp.row;
  }
  function whyLine(it) {
    const parts = [];
    if (S.fit.time) parts.push(it.mins ? 'займёт ' + it.mins + ' мин, а есть ' + TIMES.find(function (t) { return t[0] === S.fit.time; })[1] : 'без таймера');
    if (S.fit.energy) parts.push(ENERGY[it.energy].need);
    return '<p class="why">' + ic(I.ok, '') + '<span>Подходит: ' + parts.join(' · ') + '</span></p>';
  }

  function nowCard() {
    const plan = nowPlan();
    const fp = fitPicker();
    const pulse = '<span class="pulse"></span>';
    if (plan.nofit) {
      const n = S.inbox.length;
      const what = [S.fit.time ? TIMES.find(function (t) { return t[0] === S.fit.time; })[1] : '', S.fit.energy ? 'при ' + ENERGY[S.fit.energy].long : ''].filter(Boolean).join(' ');
      return '<section class="now" style="--c: var(--ink-3)">' + nowHead(pulse + 'Подбор', fp) +
        '<h2>Под это в плане ничего нет</h2>' +
        '<p class="now-text">На ' + what + ' дел из плана не находится. ' + (n ? 'Зато это хорошее время разобрать входящие: пара минут.' : 'Можно просто отдохнуть.') + '</p>' +
        '<div class="now-actions single">' +
          (n ? '<button class="btn primary" type="button" data-action="inbox">Разобрать входящие · ' + n + '</button>' : '') +
          '<button class="btn ghost" type="button" data-action="fit-reset">Сбросить подбор</button>' +
        '</div></section>';
    }
    if (plan.rest) {
      const first = day().find(function (i) { return i.block === 'morning' && !S.done[i.id]; }) || day()[0];
      const when = hourNow() < 5 ? 'Утром' : 'Завтра';
      return '<section class="now" style="--c: var(--c-spirit)">' + nowHead(ic(I.moon, '') + 'Время отдыха', fp) +
        '<h2>Лучшее дело сейчас: лечь спать</h2>' +
        '<p class="now-text">Сон тоже прокачка. Он восстанавливает силы для завтрашних дел. Если силы ещё есть, выбери время выше, и я подберу дело.</p>' +
        '<div class="next-line">' + ic(I.sparkle, '') + '<span>' + when + ' первым делом: <b>' + first.title + '</b></span></div>' +
      '</section>';
    }
    if (plan.allDone) {
      return '<section class="now" style="--c: var(--xp)">' +
        '<div class="now-top"><p class="now-label">' + pulse + 'День закрыт</p><span class="now-time">+' + S.xpToday + ' XP</span></div>' +
        '<h2>Все дела на сегодня сделаны</h2>' +
        '<p class="now-text">Остров светится. Загляни в летопись: там уже записан этот день.</p>' +
        '<div class="now-actions single"><button class="btn primary" type="button" data-tab-go="chronicle">Открыть летопись</button></div>' +
      '</section>';
    }
    if (plan.skippedAll) {
      return '<section class="now">' + nowHead(pulse + 'Пауза', fp) +
        '<h2>Остальное подождёт</h2>' +
        '<p class="now-text">Ты отложил оставшиеся дела. Это нормально: отдых тоже часть плана.</p>' +
        '<div class="now-actions single"><button class="btn ghost" type="button" data-action="unskip">Вернуть отложенные</button></div>' +
      '</section>';
    }
    const it = plan.item;
    let primary;
    if (it.kind === 'reflect') primary = '<button class="btn primary" type="button" data-reflect="' + it.id + '">Ответить · ' + it.mins + ' мин</button>';
    else if (it.mins > 0) primary = '<button class="btn primary" type="button" data-start="' + it.id + '">Начать · ' + it.mins + ' мин</button>';
    else primary = '<button class="btn primary" type="button" data-check="' + it.id + '">Готово</button>';
    const sp = S.spheres[it.sphere];
    const wild = stateOf(sp.vitality).key === 'wild';
    return '<section class="now" style="--c: var(--c-' + it.sphere + ')">' + nowHead(pulse + plan.label, fp) +
      '<h2>' + esc(it.title) + '</h2>' +
      (plan.fitted ? whyLine(it) : '') +
      '<p class="trigger">' + ic(I.ifthen, '') + '<span><b>Если — то:</b> ' + esc(it.trigger) + '</span></p>' +
      questLine(it) +
      '<div class="chips"><span class="chip"><i class="dot"></i>' + SPHERES[it.sphere].name + '</span>' +
        '<span class="chip xp">' + it.size + ' · +' + SIZE_XP[it.size] + ' XP</span>' +
        '<span class="chip">' + PHASES[it.block].label + '</span>' +
        (wild ? '<span class="chip warn">«' + SPHERES[it.sphere].place + '» зарастает · ' + sp.idle + ' дн.</span>' : '') +
      '</div>' +
      '<div class="now-actions">' + primary +
        (it.mins > 0 || it.kind === 'reflect' ? '<button class="btn ghost" type="button" data-check="' + it.id + '">Готово</button>' : '') +
        '<button class="btn text" type="button" data-skip="' + it.id + '">Позже</button>' +
      '</div>' +
    '</section>';
  }

  function inboxRow() {
    const n = S.inbox.length;
    return '<section class="section ib-section"><button class="inbox-row' + (n ? ' has' : '') + '" type="button" data-action="inbox">' +
      '<span class="glyph">' + ic(I.tray, '') + '</span>' +
      '<span class="ib-text"><b>' + (n ? 'Входящие · ' + n : 'Входящие пусты') + '</b>' +
        '<span>' + (n ? 'Разбери: сделать, в план, на потом или удалить' : 'Голова свободна. Новые мысли записывай через «+»') + '</span></span>' +
      '<span class="ib-count">Потом · ' + S.later.length + '</span>' + ic(I.chev, 'chev') +
    '</button></section>';
  }

  function itemRow(it, nowId) {
    const done = !!S.done[it.id];
    const sp = S.spheres[it.sphere];
    const wild = !done && stateOf(sp.vitality).key === 'wild';
    const sub = wild ? '<p class="item-sub note">«' + SPHERES[it.sphere].place + '» зарастает: ' + sp.idle + ' дней без внимания</p>'
                     : '<p class="item-sub">' + esc(it.trigger) + '</p>';
    return '<li class="item' + (done ? ' done' : '') + (it.id === nowId ? ' is-now' : '') + '" style="--c: var(--c-' + it.sphere + ')">' +
      '<button class="check" type="button" data-check="' + it.id + '" aria-pressed="' + done + '" aria-label="' + (done ? 'Снять отметку: ' : 'Отметить: ') + esc(it.title) + '">' +
        '<span class="ring">' + ic(I.check, '') + '</span></button>' +
      '<div><p class="item-title">' + esc(it.title) + '</p>' + sub + '</div>' +
      '<div class="item-side"><span class="size">' + it.size + ' +' + SIZE_XP[it.size] + '</span></div>' +
    '</li>';
  }

  function viewToday() {
    const p = phase();
    const plan = nowPlan();
    const nowId = plan.item ? plan.item.id : null;
    const doneCount = day().filter(function (i) { return S.done[i.id]; }).length;
    const pct = Math.round(doneCount / day().length * 100);
    const blocks = BLOCKS.map(function (b) {
      const items = day().filter(function (i) { return i.block === b; });
      return '<div class="block' + (b === p ? ' is-current' : '') + '">' +
        '<div class="block-head"><span>' + PHASES[b].label + '</span><small>' + PHASES[b].range + '</small></div>' +
        '<ul style="list-style:none;margin:0;padding:0">' + items.map(function (i) { return itemRow(i, nowId); }).join('') + '</ul></div>';
    }).join('');

    const wdIdx = (TODAY.getDay() + 6) % 7;
    const days = WD_SHORT.map(function (d, j) {
      let cls = 'wd';
      if (j < wdIdx && WEEK_PATTERN[j]) cls += ' on';
      if (j === wdIdx) { cls += ' today'; if (S.xpToday > 0) cls += ' on'; }
      if (j > wdIdx) cls += ' future';
      return '<div class="' + cls + '"><span>' + d + '</span><i></i></div>';
    }).join('');
    const goals = WEEK_BASE.map(function (g) {
      const d = Math.min(g.target, weekDone(g));
      let pips = '';
      for (let i = 0; i < g.target; i++) pips += '<i class="pip' + (i < d ? ' on' : '') + '"></i>';
      return '<div class="goal' + (d >= g.target ? ' met' : '') + '" style="--c: var(--c-' + g.sphere + ')">' +
        '<span class="goal-name"><i class="dot"></i>' + g.title + '</span><span class="pips" aria-hidden="true">' + pips + '</span>' +
        '<span class="goal-count">' + d + ' из ' + g.target + '</span></div>';
    }).join('');

    return hero(p) + nowCard() + installCard() + inboxRow() +
      '<section class="section">' +
        '<div class="section-head"><h3>План дня</h3><span class="aside">' + doneCount + ' из ' + day().length + ' · +' + S.xpToday + ' XP</span></div>' +
        '<div class="day-progress"><span class="bar"><i style="width:' + pct + '%"></i></span></div>' +
        blocks +
      '</section>' +
      '<section class="section">' +
        '<div class="section-head"><h3>Неделя</h3><span class="aside">неделя ' + seasonWeek() + ' из 12</span></div>' +
        '<div class="weekdays">' + days + '</div>' +
        '<div class="goals">' + goals + '</div>' +
        '<p class="hint">Цели недели гибкие: важна сумма за неделю, а не серия подряд. Пропуск в среду ничего не сжёг.</p>' +
      '</section>';
  }

  /* ---------- Экран «Сезон» ---------- */
  function viewSeason() {
    const wk = seasonWeek();
    let weeks = '';
    for (let i = 1; i <= 13; i++) weeks += '<i class="wk' + (i === 13 ? ' off' : i < wk ? ' past' : i === wk ? ' cur' : '') + '"></i>';
    const remaining = Math.max(0, BOSS.target - S.best);
    const hpPct = remaining / BOSS.target * 100;
    const quests = QUESTS.map(function (q) {
      const pct = questPct(q);
      const nextIdx = q.steps.findIndex(function (s, i) { return !stepDone(q, i); });
      const next = nextIdx >= 0 ? q.steps[nextIdx].t : 'Все шаги пройдены';
      return '<button class="quest" type="button" data-quest="' + q.id + '" style="--c: var(--c-' + q.sphere + ')">' +
        '<div class="quest-top"><span class="glyph">' + ic(SPHERES[q.sphere].icon, '') + '</span>' +
          '<div><h4>' + q.title + '</h4><p>' + SPHERES[q.sphere].name + '</p></div><span class="quest-pct">' + pct + '%</span></div>' +
        '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
        '<p class="quest-next"><span>Дальше:</span><b>' + next + '</b></p>' +
      '</button>';
    }).join('');
    const doneCount = day().filter(function (i) { return S.done[i.id]; }).length;

    return '<header class="page-head">' +
        '<p class="eyebrow">Сезон ' + SEASON.num + ' · ' + SEASON.name + '</p>' +
        '<h1>Неделя ' + wk + ' из 12</h1>' +
        '<p class="sub">5 октября — 27 декабря · осталось ' + daysLeft() + ' дн.</p>' +
        '<div class="weeks" aria-hidden="true">' + weeks + '</div>' +
        '<div class="weeks-legend"><span>Старт</span><span>Финальная битва</span><span>Межсезонье</span></div>' +
      '</header>' +
      '<section class="boss">' +
        '<svg class="boss-ridge" viewBox="0 0 300 120" aria-hidden="true"><polygon points="0,120 40,70 70,90 120,30 160,75 190,55 230,95 260,60 300,85 300,120" fill="#fff"/></svg>' +
        '<p class="eyebrow">Босс сезона · ' + SPHERES.health.name + '</p>' +
        '<h2>' + BOSS.title + '</h2>' +
        '<div class="hp-row"><div class="hp-label"><span>HP босса</span><span><b>' + dec(remaining) + ' км</b> из ' + BOSS.target + '</span></div>' +
          '<div class="hp"><i style="width:' + hpPct + '%"></i></div></div>' +
        '<div class="boss-stats">' +
          '<div><b>' + dec(S.best) + ' км</b><span>лучший забег</span></div>' +
          '<div><b>' + S.trainings + ' / ' + BOSS.plan + '</b><span>тренировок</span></div>' +
          '<div><b>' + BOSS.finale.split(' ')[0] + ' дек</b><span>финальная битва</span></div>' +
        '</div>' +
        '<p class="boss-foot">Каждый забег длиннее рекорда снимает HP. Награда: <b>' + BOSS.reward.toLowerCase() + '</b>, подтвердит ' + BOSS.judge + '.</p>' +
      '</section>' +
      '<section class="section">' +
        '<div class="section-head"><h3>Квесты сезона</h3><span class="aside">3 главных</span></div>' + quests +
      '</section>' +
      '<section class="section">' +
        '<div class="section-head"><h3>Пати «Ранний подъём»</h3><span class="aside">3 человека</span></div>' +
        '<div class="party">' +
          '<div class="member"><span class="ava">Е</span><div><p>Ерлан</p><span>Закрыл пробежку</span></div><span class="ok">4 из 6</span></div>' +
          '<div class="member"><span class="ava">А</span><div><p>Аружан</p><span>Английский готов</span></div><span class="ok">3 из 5</span></div>' +
          '<div class="member"><span class="ava">' + USER.charAt(0) + '</span><div><p>Ты</p><span>' + (doneCount ? 'В деле' : 'Ещё не начал') + '</span></div><span class="ok">' + doneCount + ' из ' + day().length + '</span></div>' +
          '<div class="reward"><b>Награда ждёт подтверждения</b><span>«' + BOSS.reward + '» за победу над боссом. Подтверждает ' + BOSS.judge + ', сам забрать нельзя.</span></div>' +
          '<button class="btn ghost small" type="button" data-action="cheer"' + (S.cheered ? ' disabled' : '') + '>' + (S.cheered ? 'Поддержка отправлена' : 'Поддержать пати') + '</button>' +
        '</div>' +
      '</section>' +
      '<section class="section">' +
        '<div class="offseason"><h4>Межсезонье · 28 декабря — 3 января</h4>' +
        '<p>Неделя без новых целей: итоги сезона, отдых и план на сезон VI. Квесты нового сезона выбираются из списка «Потом».</p>' +
        '<button class="btn ghost small" type="button" data-action="later">Открыть «Потом» · ' + S.later.length + '</button></div>' +
      '</section>';
  }

  /* ---------- Экран «Остров» ---------- */
  function viewIsland() {
    const p = phase();
    const need = needFor(S.lvl);
    const cards = SPHERE_KEYS.map(function (k) {
      const sp = S.spheres[k];
      const st = stateOf(sp.vitality);
      return '<button class="sphere-card" type="button" data-sphere="' + k + '" style="--c: var(--c-' + k + ')">' +
        '<div class="row"><span class="glyph">' + ic(SPHERES[k].icon, '') + '</span><span class="lv">ур. ' + sp.lvl + '</span></div>' +
        '<div><h4>' + SPHERES[k].name + '</h4><p>' + SPHERES[k].place + '</p></div>' +
        '<span class="state ' + st.key + '">' + st.label + (st.key === 'wild' ? ' · ' + sp.idle + ' дн.' : '') + '</span>' +
        '<span class="bar"><i style="width:' + Math.round(sp.xp / SPHERE_NEED * 100) + '%"></i></span>' +
      '</button>';
    }).join('');
    return '<section class="world sky phase-' + p + '">' +
        '<div class="island-host" data-view="world">' + fallbackIsland() + '</div>' +
        '<div class="isl-labels"></div>' +
        '<div class="world-head"><p class="eyebrow">Твой остров</p><h1>Уровень ' + S.lvl + '</h1>' +
          '<div class="lvl-bar"><i style="width:' + Math.round(S.xp / need * 100) + '%"></i></div>' +
          '<p>' + fmt(S.xp) + ' / ' + fmt(need) + ' XP до уровня ' + (S.lvl + 1) + '</p></div>' +
        '<p class="world-hint">Покрути остров. Нажми на место, чтобы открыть сферу.</p>' +
      '</section>' +
      '<section class="section">' +
        '<div class="section-head"><h3>Сферы жизни</h3><span class="aside">не умирают, а зарастают</span></div>' +
        '<div class="sphere-grid">' + cards + '</div>' +
      '</section>' +
      '<section class="section">' +
        '<div class="tree-note"><span class="glyph" style="--c: var(--c-health)">' + ic(I.tree, '') + '</span>' +
        '<p><b>Дерево в центре растёт с твоим уровнем.</b> Плоды на нём — артефакты из летописи. Через десять лет оно станет огромным.</p></div>' +
      '</section>';
  }

  /* ---------- Экран «Летопись» ---------- */
  function entryRow(e, isToday) {
    const sizeChip = e.size ? '<span class="size">+' + SIZE_XP[e.size] + '</span>' : '<span></span>';
    return '<div class="entry' + (e.quiet ? ' quiet' : '') + '"><time>' + (isToday ? e.t : e.date) + '</time><p>' + esc(e.text) + '</p>' + sizeChip + '</div>';
  }
  function medal(locked) {
    return '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M20 3l14 8v18l-14 8-14-8V11z" fill="currentColor" fill-opacity=".14"/>' +
      (locked ? '<rect x="14" y="19" width="12" height="9" rx="2"/><path d="M16.5 19v-3a3.5 3.5 0 0 1 7 0v3"/>' : '<path d="M20 12l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>') +
      '</svg>';
  }
  function viewChronicle() {
    const today = S.log.length
      ? S.log.map(function (e) { return entryRow(e, true); }).join('')
      : '<div class="entry quiet"><time>сегодня</time><p>Пока пусто. Отметь первое дело, и день появится здесь.</p><span></span></div>';
    const seasonEntries = SEASON_LOG.map(function (e) { return entryRow(e, false); }).join('');
    const past = PAST_SEASONS.map(function (s) {
      return '<div class="tl-season"><span class="tl-mark"></span><div class="tl-body">' +
        '<div class="tl-title"><h4>' + s.title + '</h4><span class="badge">' + s.badge + '</span></div>' +
        '<div class="tl-highlights">' + s.lines.map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div></div></div>';
    }).join('');
    const arts = ARTIFACTS.map(function (a) {
      return '<div class="artifact" style="--c: var(--c-' + a.sphere + ')">' + medal(false) + '<h4>' + a.title + '</h4><p>' + a.meta + '</p></div>';
    }).join('') +
      (ANNIVERSARY ? '<div class="artifact fresh" style="--c: var(--xp)">' + medal(false) + '<h4>Год на Острове</h4><p>получен сегодня</p></div>' : '') +
      '<div class="artifact locked">' + medal(true) + '<h4>10 км</h4><p>откроется после финальной битвы</p></div>';
    const memTitle = ANNIVERSARY ? 'Ровно год назад ты пришёл на Остров' : 'Твой первый день на Острове';

    return '<header class="page-head"><p class="eyebrow">Летопись</p><h1>' + (ANNIVERSARY ? 'Год на Острове' : 'Твоя история') + '</h1></header>' +
      '<div class="counters">' +
        '<div class="counter"><b>' + yearDays() + '</b><span>дней на Острове в ' + TODAY.getFullYear() + '</span></div>' +
        '<div class="counter"><b>4</b><span>сезона пройдено</span></div>' +
        '<div class="counter"><b>' + S.comebacks + '</b><span>возвращения после перерыва</span></div>' +
      '</div>' +
      '<article class="memory sky phase-evening">' +
        '<p class="eyebrow">25 октября 2025</p><h3>' + memTitle + '</h3>' +
        '<p>Первая пробежка: 2 км, три остановки. Сейчас твой рекорд ' + dec(S.best) + ' км без остановки.</p>' +
        '<div class="then-now"><div><b>2 км</b><span>тогда, с остановками</span></div><div><b>' + dec(S.best) + ' км</b><span>сейчас, без остановки</span></div></div>' +
      '</article>' +
      '<section class="section">' +
        '<div class="section-head"><h3>Хроника</h3><span class="aside">новое сверху</span></div>' +
        '<div class="timeline">' +
          '<div class="tl-season current"><span class="tl-mark"></span><div class="tl-body">' +
            '<div class="tl-title"><h4>Сезон ' + SEASON.num + ' · ' + SEASON.name + '</h4><span class="badge">идёт</span></div>' +
            '<div class="tl-entries">' + today + seasonEntries + '</div></div></div>' +
          past +
        '</div>' +
      '</section>' +
      '<section class="section">' +
        '<div class="section-head"><h3>Артефакты</h3><span class="aside">висят плодами на дереве</span></div>' +
        '<div class="artifacts">' + arts + '</div>' +
      '</section>' +
      '<section class="section">' +
        '<div class="letter"><h4>Письмо себе через год</h4>' +
        (S.letter
          ? '<p>Письмо запечатано. Остров откроет его 25 октября ' + (TODAY.getFullYear() + 1) + '.</p>'
          : '<p>Напиши, каким хочешь быть через год. Остров откроет письмо в этот день в ' + (TODAY.getFullYear() + 1) + ' году.</p><button class="btn ghost small" type="button" data-action="letter">Написать письмо</button>') +
        '</div>' +
      '</section>';
  }

  /* ---------- Листы ---------- */
  let closeTimer = null, sheetCleanup = null;
  function openSheet(html, onOpen, onClose) {
    const layer = $('#sheetLayer');
    clearTimeout(closeTimer);
    if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
    layer.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><span class="grabber" aria-hidden="true"></span>' +
      '<button class="sheet-x" type="button" data-action="close" aria-label="Закрыть">' + ic(I.x, '') + '</button>' + html + '</div>';
    layer.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { layer.classList.add('open'); }); });
    sheetCleanup = onClose || null;
    if (onOpen) onOpen(layer.querySelector('.sheet'));
  }
  function closeSheet() {
    const layer = $('#sheetLayer');
    if (layer.hidden) return;
    if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
    layer.classList.remove('open');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () { layer.hidden = true; layer.innerHTML = ''; }, 260);
  }

  function openFocus(id) {
    const it = day().find(function (i) { return i.id === id; });
    if (!it) return;
    const total = it.mins * 60;
    let left = total, paused = false, timer = null;
    const C = 2 * Math.PI * 96;
    openSheet(
      '<p class="eyebrow">Поток · ' + SPHERES[it.sphere].name + '</p>' +
      '<h2>' + it.title + '</h2>' +
      '<div class="focus-ring" style="--c: var(--c-' + it.sphere + ')"><svg viewBox="0 0 220 220" aria-hidden="true">' +
        '<circle class="track" cx="110" cy="110" r="96" fill="none" stroke-width="10"/>' +
        '<circle class="fill" cx="110" cy="110" r="96" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="0"/></svg>' +
        '<div class="time"><b id="focusTime">' + mmss(left) + '</b><span>осталось</span></div></div>' +
      '<p class="lead">Телефон в беззвучный режим. Всё остальное подождёт ' + it.mins + ' мин.</p>' +
      '<div class="sheet-actions two"><button class="btn ghost" type="button" id="focusPause">Пауза</button>' +
      '<button class="btn primary" type="button" id="focusDone">Готово · +' + SIZE_XP[it.size] + ' XP</button></div>',
      function (sheet) {
        const timeEl = $('#focusTime', sheet), ring = $('.fill', sheet);
        timer = setInterval(function () {
          if (paused || left <= 0) return;
          left--;
          timeEl.textContent = mmss(left);
          ring.style.strokeDashoffset = (C * (1 - left / total)).toFixed(1);
        }, 1000);
        $('#focusPause', sheet).addEventListener('click', function (e) {
          paused = !paused;
          e.currentTarget.textContent = paused ? 'Продолжить' : 'Пауза';
        });
        $('#focusDone', sheet).addEventListener('click', function (e) {
          const btn = e.currentTarget;
          closeSheet();
          toggleItem(id, null);
          xpFloatAt(btn, '+' + SIZE_XP[it.size]);
        });
      },
      function () { clearInterval(timer); }
    );
  }
  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  function openReflect(id) {
    const it = day().find(function (i) { return i.id === id; });
    const q = it.id === 'review' ? REVIEW_QUESTION : QUESTIONS[TODAY.getDate() % QUESTIONS.length];
    openSheet(
      '<p class="eyebrow">' + it.title + '</p><h2>' + q + '</h2>' +
      '<div class="field"><label for="reflectText">Пара предложений, только для тебя</label>' +
      '<textarea id="reflectText" placeholder="Например: впервые пробежал без остановки до моста"></textarea></div>' +
      (it.id === 'review'
        ? '<div class="review-links"><p><b>Часть обзора недели:</b> разбери входящие до нуля и загляни в «Потом». Может, что-то из этого пора начать.</p>' +
          '<div class="row"><button class="btn ghost small" type="button" data-action="inbox">Входящие · ' + S.inbox.length + '</button>' +
          '<button class="btn ghost small" type="button" data-action="later">Потом · ' + S.later.length + '</button></div></div>'
        : '') +
      '<div class="sheet-actions"><button class="btn primary" type="button" id="reflectSave" disabled>Записать в летопись · +' + SIZE_XP[it.size] + ' XP</button></div>',
      function (sheet) {
        const ta = $('#reflectText', sheet), btn = $('#reflectSave', sheet);
        ta.addEventListener('input', function () { btn.disabled = ta.value.trim().length < 2; });
        btn.addEventListener('click', function () {
          const text = ta.value.trim();
          closeSheet();
          if (!S.done[id]) {
            S.done[id] = Date.now();
            const r = gain(SIZE_XP[it.size], it.sphere);
            S.log.unshift({ id: id, t: timeNow(), text: q + ' ' + text, sphere: it.sphere, size: it.size });
            save();
            celebrate(null, SIZE_XP[it.size], it.sphere, r);
            render(true);
          }
        });
        setTimeout(function () { ta.focus(); }, 350);
      }
    );
  }

  function openLetter() {
    openSheet(
      '<p class="eyebrow">Письмо себе</p><h2>Каким ты хочешь быть через год?</h2>' +
      '<div class="field"><label for="letterText">Остров откроет письмо 25 октября ' + (TODAY.getFullYear() + 1) + '</label>' +
      '<textarea id="letterText" placeholder="Привет из ' + TODAY.getFullYear() + '. Сейчас я…"></textarea></div>' +
      '<div class="sheet-actions"><button class="btn primary" type="button" id="letterSave" disabled>Запечатать письмо</button></div>',
      function (sheet) {
        const ta = $('#letterText', sheet), btn = $('#letterSave', sheet);
        ta.addEventListener('input', function () { btn.disabled = ta.value.trim().length < 2; });
        btn.addEventListener('click', function () {
          S.letter = ta.value.trim();
          save();
          closeSheet();
          toast('Письмо запечатано до следующего года');
          render(true);
        });
      }
    );
  }

  function openQuest(id) {
    const q = QUESTS.find(function (x) { return x.id === id; });
    if (!q) return;
    const pct = questPct(q);
    const steps = q.steps.map(function (s, i) {
      const done = stepDone(q, i);
      return '<div class="step' + (done ? ' done' : '') + '" style="--c: var(--c-' + q.sphere + ')">' +
        '<button class="check" type="button" data-step="' + q.id + ':' + i + '" aria-pressed="' + done + '" aria-label="' + s.t + '"><span class="ring">' + ic(I.check, '') + '</span></button>' +
        '<p>' + s.t + '</p><span>' + (done ? 'готово' : s.label || '') + '</span></div>';
    }).join('');
    openSheet(
      '<div class="sheet-head" style="--c: var(--c-' + q.sphere + ')"><span class="glyph">' + ic(SPHERES[q.sphere].icon, '') + '</span>' +
        '<div><p class="eyebrow">Квест сезона · ' + SPHERES[q.sphere].name + '</p><h2>' + q.title + '</h2></div></div>' +
      '<div style="display:grid;gap:8px;--c: var(--c-' + q.sphere + ')"><div class="section-head" style="padding:0"><span class="aside" style="text-align:left">Прогресс</span><span class="aside"><b>' + pct + '%</b></span></div>' +
        '<span class="bar"><i style="width:' + pct + '%"></i></span></div>' +
      '<div class="woop" style="--c: var(--c-' + q.sphere + ')">' +
        '<div><span>Желание</span><p>' + q.woop.wish + '</p></div>' +
        '<div><span>Результат</span><p>' + q.woop.outcome + '</p></div>' +
        '<div class="wide"><span>Что помешает</span><p>' + q.woop.obstacle + '</p></div>' +
        '<div class="wide"><span>План «если — то»</span><p>' + q.woop.plan + '</p></div>' +
      '</div>' +
      '<div class="section-head" style="padding:0"><h3>Шаги</h3><span class="aside">отмечай по мере движения</span></div>' +
      '<div class="steps">' + steps + '</div>'
    );
  }

  function toggleStep(key, anchor) {
    const parts = key.split(':');
    const q = QUESTS.find(function (x) { return x.id === parts[0]; });
    const i = +parts[1];
    const was = stepDone(q, i);
    S.steps[key] = !was;
    if (!was) {
      const r = gain(SIZE_XP.M, q.sphere);
      celebrate(anchor, SIZE_XP.M, q.sphere, r);
      S.log.unshift({ id: key, t: timeNow(), text: 'Шаг квеста: ' + q.steps[i].t, sphere: q.sphere, size: 'M' });
    } else {
      ungain(SIZE_XP.M, q.sphere);
      S.log = S.log.filter(function (e) { return e.id !== key; });
    }
    save();
    setTimeout(function () { openQuest(q.id); render(true); }, 250);
  }

  function openSphere(k) {
    const sp = S.spheres[k];
    const st = stateOf(sp.vitality);
    const msg = {
      bloom: 'Цветёт. Ты регулярно уделяешь этому внимание.',
      grow: 'Растёт. Всё идёт своим ходом.',
      ok: 'Ухожено. Немного внимания на этой неделе, и зацветёт.',
      wild: 'Зарастает: ' + sp.idle + ' дней без внимания. Ничего не потеряно, одно действие вернёт цвет.',
    }[st.key];
    const action = day().find(function (i) { return i.sphere === k && !S.done[i.id]; });
    const skills = SKILLS[k].map(function (s) {
      const ri = RANKS.indexOf(s.rank);
      return '<div class="skill" style="--c: var(--c-' + k + ')"><span class="rank">' + s.rank + '</span><div>' +
        '<h4>' + s.name + '</h4><p>Сейчас: ' + s.now + '</p><p>Ранг ' + RANKS[Math.min(4, ri + 1)] + ': <b>' + s.next + '</b></p>' +
        '<div class="ranks-scale" aria-hidden="true">' + RANKS.map(function (r, j) { return '<i class="' + (j <= ri ? 'on' : '') + '">' + r + '</i>'; }).join('') + '</div>' +
      '</div></div>';
    }).join('');
    openSheet(
      '<div class="sheet-head" style="--c: var(--c-' + k + ')"><span class="glyph">' + ic(SPHERES[k].icon, '') + '</span>' +
        '<div><p class="eyebrow">' + SPHERES[k].place + '</p><h2>' + SPHERES[k].name + '</h2></div></div>' +
      '<div class="sphere-state" style="--c: var(--c-' + k + ')"><span class="state ' + st.key + '">' + st.label + '</span><p>' + msg + '</p>' +
        '<div class="row"><span>Уровень ' + sp.lvl + '</span><span>' + sp.xp + ' / ' + SPHERE_NEED + ' XP</span></div>' +
        '<span class="bar"><i style="width:' + Math.round(sp.xp / SPHERE_NEED * 100) + '%"></i></span></div>' +
      '<div class="section-head" style="padding:0"><h3>Навыки и ранги</h3><span class="aside">D → S</span></div>' +
      '<div class="skills">' + skills + '</div>' +
      (action ? '<div class="sheet-actions"><button class="btn primary" type="button" data-focus-item="' + action.id + '">Сделать сейчас: ' + action.title.toLowerCase() + '</button></div>' : '')
    );
  }

  /* ---------- Быстрая запись ---------- */
  const RULES = [
    { re: /(пробеж|бегал|бег |км)/i, sphere: 'health', skill: 'Бег' },
    { re: /(зал|трениров|отжим|присед|штанг)/i, sphere: 'health', skill: 'Силовые' },
    { re: /(выспал|спал|сон|лёг|лег спать)/i, sphere: 'health', skill: 'Сон' },
    { re: /(англ|anki|english|сериал|серию)/i, sphere: 'mind', skill: 'Английский' },
    { re: /(прочит|читал|страниц|книг)/i, sphere: 'mind', skill: 'Чтение' },
    { re: /(прототип|код|программ|react|деплой|верст)/i, sphere: 'work', skill: 'Программирование' },
    { re: /(выступ|доклад|презентац)/i, sphere: 'work', skill: 'Выступления' },
    { re: /(отлож|накоп|подушк|₸|тенге)/i, sphere: 'money', skill: 'Подушка' },
    { re: /(расход|потратил|бюджет|чек)/i, sphere: 'money', skill: 'Учёт расходов' },
    { re: /(мам|пап|родител|семь|сестр|брат|бабуш|дедуш)/i, sphere: 'people', skill: 'Семья' },
    { re: /(друз|друг|встрет|встреч)/i, sphere: 'people', skill: 'Друзья' },
    { re: /(тишин|медитац|прогулк)/i, sphere: 'spirit', skill: 'Тишина' },
    { re: /(дневник|благодар)/i, sphere: 'spirit', skill: 'Дневник' },
    { re: /(стоматолог|врач|клиник|анализ)/i, sphere: 'health', skill: 'Здоровье' },
    { re: /(подар|день рожд|ответить|позвонить)/i, sphere: 'people', skill: 'Близкие' },
    { re: /(поход|каньон|природ)/i, sphere: 'spirit', skill: 'Тишина' },
    { re: /(идея|курс|остров)/i, sphere: 'work', skill: 'Программирование' },
  ];
  function guessSphere(text) {
    const r = RULES.find(function (x) { return x.re.test(text + ' '); });
    return r ? r.sphere : null;
  }
  function sizeOf(text) {
    let m = text.match(/(\d+[.,]?\d*)\s*(час|ч\.?(\s|$))/i);
    if (m) return parseFloat(m[1].replace(',', '.')) >= 2 ? 'L' : 'M';
    m = text.match(/(\d+)\s*мин/i);
    if (m) return +m[1] <= 10 ? 'S' : 'M';
    m = text.match(/(\d+[.,]?\d*)\s*км/i);
    if (m) { const km = parseFloat(m[1].replace(',', '.')); return km >= 10 ? 'L' : km >= 4 ? 'M' : 'S'; }
    m = text.match(/(\d+)\s*страниц/i);
    if (m) return +m[1] >= 30 ? 'M' : 'S';
    return 'M';
  }
  function parse(text) {
    return text.split(/,|;|\n|\sи\s|\.\s/i).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 2; }).map(function (frag) {
      const rule = RULES.find(function (r) { return r.re.test(frag + ' '); });
      const km = frag.match(/(\d+[.,]?\d*)\s*км/i);
      return { text: frag, rule: rule || null, size: sizeOf(frag), km: km && rule && rule.skill === 'Бег' ? parseFloat(km[1].replace(',', '.')) : null };
    });
  }
  function capModes(mode) {
    return '<div class="seg full cap-modes" role="group" aria-label="Что записать">' +
      '<button type="button" data-cap-mode="inbox" aria-pressed="' + (mode === 'inbox') + '">Мысль или задача</button>' +
      '<button type="button" data-cap-mode="done" aria-pressed="' + (mode === 'done') + '">Уже сделал</button></div>';
  }
  function openCapture(mode) {
    if (mode !== 'done') return openCaptureInbox();
    const sugg = ['пробежал 7 км', 'позвонил маме', '2 часа над прототипом', 'отложил 20 000 ₸', 'прочитал 30 страниц'];
    openSheet(
      capModes('done') +
      '<h2>Что сделал?</h2>' +
      '<p class="lead">Пиши как другу. Остров сам разнесёт записанное по сферам и навыкам.</p>' +
      '<div class="field"><label for="captureText">Твоими словами</label>' +
      '<textarea id="captureText" placeholder="Например: пробежал 5 км и прочитал 30 страниц"></textarea></div>' +
      '<div class="suggest">' + sugg.map(function (s) { return '<button class="chip" type="button" data-sugg="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="parsed" id="parsed" aria-live="polite"></div>' +
      '<div class="sheet-actions"><button class="btn primary" type="button" id="captureSave" disabled>Записать в летопись</button></div>',
      function (sheet) {
        const ta = $('#captureText', sheet), out = $('#parsed', sheet), btn = $('#captureSave', sheet);
        let items = [];
        function update() {
          items = parse(ta.value);
          const known = items.filter(function (i) { return i.rule; });
          btn.disabled = known.length === 0;
          const total = known.reduce(function (a, i) { return a + SIZE_XP[i.size]; }, 0);
          btn.textContent = known.length ? 'Записать в летопись · +' + total + ' XP' : 'Записать в летопись';
          out.innerHTML = items.map(function (i) {
            if (!i.rule) return '<div class="parsed-row unknown"><span class="glyph" style="--c: var(--ink-3)">' + ic('<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16v.5"/>', '') + '</span><div><p>' + esc(i.text) + '</p><span>Не понял, к какой сфере это отнести</span></div><span></span></div>';
            const k = i.rule.sphere;
            const record = i.km && i.km > S.best ? ' · рекорд, босс теряет HP' : '';
            return '<div class="parsed-row" style="--c: var(--c-' + k + ')"><span class="glyph">' + ic(SPHERES[k].icon, '') + '</span>' +
              '<div><p>' + esc(i.text) + '</p><span>' + SPHERES[k].name + ' · ' + i.rule.skill + record + '</span></div>' +
              '<span class="size">' + i.size + ' +' + SIZE_XP[i.size] + '</span></div>';
          }).join('');
        }
        ta.addEventListener('input', update);
        sheet.addEventListener('click', function (e) {
          const s = e.target.closest('[data-sugg]');
          if (!s) return;
          ta.value = ta.value.trim() ? ta.value.trim() + ', ' + s.dataset.sugg : s.dataset.sugg;
          update();
        });
        btn.addEventListener('click', function () {
          const known = items.filter(function (i) { return i.rule; });
          let lastR = null, total = 0, bossHit = null;
          known.forEach(function (i) {
            const xp = SIZE_XP[i.size];
            total += xp;
            lastR = gain(xp, i.rule.sphere);
            S.log.unshift({ id: 'cap' + Date.now() + Math.random(), t: timeNow(), text: cap(i.text), sphere: i.rule.sphere, size: i.size });
            if (window.Island) Island.burst(i.rule.sphere, sphereColor(i.rule.sphere));
            if (i.km && i.km > S.best) { bossHit = i.km - S.best; S.best = i.km; }
          });
          save();
          closeSheet();
          if (bossHit) toast('Новый рекорд: ' + dec(S.best) + ' км. Босс теряет ' + dec(bossHit) + ' км HP');
          else if (lastR && lastR.leveled) toast('Новый уровень: ' + S.lvl, 'level');
          else toast('Записано: ' + known.length + ' · +' + total + ' XP');
          render(true);
        });
        setTimeout(function () { ta.focus(); }, 350);
      }
    );
  }

  /* ---------- Входящие и «Потом» ---------- */
  function openCaptureInbox() {
    openSheet(
      capModes('inbox') +
      '<h2>Что в голове?</h2>' +
      '<p class="lead">Запиши и отпусти. Разберёшь потом, когда будет минута.</p>' +
      '<div class="field"><label for="inboxText">Каждая строка станет отдельным пунктом</label>' +
      '<textarea id="inboxText" placeholder="Например: записаться к стоматологу"></textarea></div>' +
      '<div class="sheet-actions"><button class="btn primary" type="button" id="inboxSave" disabled>Во входящие</button></div>',
      function (sheet) {
        const ta = $('#inboxText', sheet), btn = $('#inboxSave', sheet);
        function lines() { return ta.value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 1; }); }
        ta.addEventListener('input', function () {
          const n = lines().length;
          btn.disabled = n === 0;
          btn.textContent = n > 1 ? 'Во входящие · ' + n : 'Во входящие';
        });
        btn.addEventListener('click', function () {
          const list = lines();
          list.reverse().forEach(function (t, i) { S.inbox.unshift({ id: 'in' + Date.now() + i, text: t }); });
          save();
          closeSheet();
          toast('Во входящих: ' + S.inbox.length + '. Разберёшь, когда будет минута');
          render(true);
        });
        setTimeout(function () { ta.focus(); }, 350);
      }
    );
  }

  function openInbox(which) {
    if (which) ibTab = which;
    const isInbox = ibTab === 'inbox';
    const list = isInbox ? S.inbox : S.later;
    const items = list.length
      ? list.map(function (it) { return isInbox ? inboxItem(it) : laterItem(it); }).join('')
      : '<p class="ib-empty">' + (isInbox ? 'Пусто. Голова свободна.' : 'Пока пусто. Сюда попадают идеи и желания без срока.') + '</p>';
    openSheet(
      '<h2>' + (isInbox ? 'Входящие' : 'Потом') + '</h2>' +
      '<div class="seg full" role="group" aria-label="Списки">' +
        '<button type="button" data-ib-tab="inbox" aria-pressed="' + isInbox + '">Входящие · ' + S.inbox.length + '</button>' +
        '<button type="button" data-ib-tab="later" aria-pressed="' + !isInbox + '">Потом · ' + S.later.length + '</button></div>' +
      '<p class="lead">' + (isInbox
        ? 'Для каждого пункта реши одно: сделать сразу, если это две минуты, поставить в план, отложить на потом или удалить.'
        : 'Идеи и желания без срока. Пересматривай их в итогах недели, а в межсезонье выбирай отсюда квесты.') + '</p>' +
      '<form class="add-row" id="ibAdd"><label class="sr" for="ibAddText">Новый пункт</label>' +
        '<input id="ibAddText" type="text" autocomplete="off" placeholder="' + (isInbox ? 'Записать мысль…' : 'Идея на потом…') + '">' +
        '<button class="btn primary small" type="submit">Добавить</button></form>' +
      '<div class="ib-list">' + items + '</div>',
      function (sheet) {
        $('#ibAdd', sheet).addEventListener('submit', function (e) {
          e.preventDefault();
          const input = $('#ibAddText', sheet);
          const v = input.value.trim();
          if (!v) return;
          list.unshift({ id: (isInbox ? 'in' : 'lt') + Date.now(), text: v });
          save();
          openInbox();
          render(true);
          setTimeout(function () { const f = $('#ibAddText'); if (f) f.focus(); }, 30);
        });
      }
    );
  }
  function inboxItem(it) {
    return '<div class="ib-item"><p>' + esc(it.text) + '</p><div class="ib-actions">' +
      '<button class="btn ghost small" type="button" data-ib-do="' + it.id + '">' + ic(I.bolt, '') + 'За 2 мин</button>' +
      '<button class="btn ghost small" type="button" data-ib-plan="' + it.id + '">В план</button>' +
      '<button class="btn ghost small" type="button" data-ib-later="' + it.id + '">Потом</button>' +
      '<button class="btn text small icon" type="button" data-ib-del="' + it.id + '" aria-label="Удалить: ' + esc(it.text) + '">' + ic(I.trash, '') + '</button>' +
    '</div></div>';
  }
  function laterItem(it) {
    return '<div class="ib-item"><p>' + esc(it.text) + '</p><div class="ib-actions">' +
      '<button class="btn ghost small" type="button" data-lt-plan="' + it.id + '">В план</button>' +
      '<button class="btn ghost small" type="button" data-lt-inbox="' + it.id + '">Во входящие</button>' +
      '<button class="btn text small icon" type="button" data-lt-del="' + it.id + '" aria-label="Удалить: ' + esc(it.text) + '">' + ic(I.trash, '') + '</button>' +
    '</div></div>';
  }
  function take(list, id) {
    const i = list.findIndex(function (x) { return x.id === id; });
    return i >= 0 ? list.splice(i, 1)[0] : null;
  }
  function inboxEmptied() {
    if (S.inbox.length || S.inboxZero) return false;
    S.inboxZero = true;
    gain(SIZE_XP.S, null);
    return true;
  }
  function ibAction(kind, id) {
    let msg = '';
    if (kind === 'do') {
      const it = take(S.inbox, id);
      if (!it) return;
      const sphere = guessSphere(it.text);
      const r = gain(SIZE_XP.S, sphere);
      S.log.unshift({ id: 'ib' + Date.now(), t: timeNow(), text: 'Сделано сразу: ' + it.text, sphere: sphere, size: 'S' });
      if (sphere && window.Island) Island.burst(sphere, sphereColor(sphere));
      msg = r.leveled ? 'Новый уровень: ' + S.lvl : 'Правило двух минут: сделано · +10 XP';
    } else if (kind === 'later') {
      const it = take(S.inbox, id);
      if (!it) return;
      S.later.unshift(it);
      msg = 'Отложено в «Потом»';
    } else if (kind === 'del') {
      take(S.inbox, id);
      msg = 'Удалено из входящих';
    } else if (kind === 'lt-inbox') {
      const it = take(S.later, id);
      if (!it) return;
      S.inbox.unshift(it);
      msg = 'Вернулось во входящие';
    } else if (kind === 'lt-del') {
      take(S.later, id);
      msg = 'Удалено из «Потом»';
    }
    if (inboxEmptied()) msg = 'Входящие пусты. Голова свободна · +10 XP';
    save();
    toast(msg);
    openInbox();
    render(true);
  }

  function openClarify(id, from) {
    const src = (from === 'later' ? S.later : S.inbox).find(function (x) { return x.id === id; });
    if (!src) return;
    const st = {
      sphere: guessSphere(src.text),
      mins: 15,
      energy: 'mid',
      block: BLOCKS.indexOf(phase()) >= 0 ? phase() : 'morning',
    };
    function seg(key, opts) {
      return '<div class="seg wrap" role="group" data-cl-group="' + key + '">' + opts.map(function (o) {
        return '<button type="button" data-cl-k="' + key + '" data-cl-v="' + o[0] + '" aria-pressed="' + (String(st[key]) === String(o[0])) + '"' + (o[2] ? ' style="--c: var(--c-' + o[0] + ')"' : '') + '>' +
          (o[2] ? '<i class="dot"></i>' : '') + o[1] + '</button>';
      }).join('') + '</div>';
    }
    openSheet(
      '<button class="back" type="button" data-ib-back="' + (from === 'later' ? 'later' : 'inbox') + '">' + ic(I.back, '') + 'Назад</button>' +
      '<p class="eyebrow">Разбор · ' + (from === 'later' ? 'из «Потом»' : 'из входящих') + '</p>' +
      '<h2>' + esc(src.text) + '</h2>' +
      '<div class="field"><label for="clTitle">Первое конкретное действие</label>' +
        '<input id="clTitle" type="text" autocomplete="off" value="' + esc(src.text) + '">' +
        '<p class="hint">Не «стоматолог», а «позвонить в клинику и записаться на вторник».</p></div>' +
      '<div class="field"><label>Сфера</label>' + seg('sphere', SPHERE_KEYS.map(function (k) { return [k, SPHERES[k].name, true]; })) + '</div>' +
      '<div class="field"><label>Сколько займёт</label>' + seg('mins', TIMES) + '<p class="hint" id="clSize"></p></div>' +
      '<div class="field"><label>Сколько нужно сил</label>' + seg('energy', [['low', 'Мало'], ['mid', 'Норм'], ['high', 'Много']]) + '</div>' +
      '<div class="field"><label>Когда</label>' + seg('block', BLOCKS.map(function (b) { return [b, PHASES[b].label]; })) + '</div>' +
      '<div class="sheet-actions"><button class="btn primary" type="button" id="clSave">Поставить в план</button></div>',
      function (sheet) {
        const save_ = $('#clSave', sheet), sizeEl = $('#clSize', sheet), title = $('#clTitle', sheet);
        function sync() {
          sheet.querySelectorAll('[data-cl-k]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(String(st[b.dataset.clK]) === b.dataset.clV));
          });
          const size = sizeForMins(st.mins);
          sizeEl.textContent = 'Размер ' + size + ' · +' + SIZE_XP[size] + ' XP. Его задаёт время, а не выбор.';
          save_.disabled = !st.sphere || title.value.trim().length < 2;
          save_.textContent = st.sphere ? 'Поставить в план · ' + PHASES[st.block].label.toLowerCase() : 'Выбери сферу';
        }
        sheet.addEventListener('click', function (e) {
          const b = e.target.closest('[data-cl-k]');
          if (!b) return;
          const k = b.dataset.clK;
          st[k] = k === 'mins' ? +b.dataset.clV : b.dataset.clV;
          sync();
        });
        title.addEventListener('input', sync);
        save_.addEventListener('click', function () {
          take(from === 'later' ? S.later : S.inbox, id);
          const size = sizeForMins(st.mins);
          S.custom.push({
            id: 'c' + Date.now(), block: st.block, title: title.value.trim(), sphere: st.sphere, size: size,
            mins: st.mins, energy: st.energy, trigger: from === 'later' ? 'Достано из «Потом»' : 'Разобрано из входящих', custom: true,
          });
          const emptied = inboxEmptied();
          save();
          toast(emptied ? 'Входящие пусты. Голова свободна · +10 XP' : 'В плане: ' + PHASES[st.block].label.toLowerCase());
          openInbox(from === 'later' ? 'later' : 'inbox');
          render(true);
        });
        sync();
      }
    );
  }

  /* ---------- Возвращение после перерыва ---------- */
  function showComeback() {
    closeSheet();
    ['people', 'spirit', 'health', 'money'].forEach(function (k, i) {
      const sp = S.spheres[k];
      sp.vitality = [0.22, 0.3, 0.42, 0.48][i];
      sp.idle = 12;
      if (window.Island) Island.setVitality(k, sp.vitality);
    });
    save();
    const ov = $('#overlayLayer');
    ov.innerHTML = '<div class="comeback sky phase-' + phase() + '">' +
      '<div class="island-host" data-view="overlay">' + fallbackIsland() + '</div>' +
      '<div class="cb-body"><p class="eyebrow">С возвращением, ' + USER + '</p>' +
        '<h2>Тебя не было 12 дней. Так бывает</h2>' +
        '<p>Ничего не сгорело: в этом году у тебя уже 213 дней на Острове. Пара мест немного заросла, одно маленькое действие вернёт им цвет.</p>' +
        '<span class="chip xp cb-reward">+50 XP за возвращение</span>' +
        '<button class="btn primary" type="button" data-action="comeback-start">Начать с 5 минут тишины</button>' +
        '<button class="btn text" type="button" data-action="comeback-close">Сначала осмотреться</button>' +
      '</div></div>';
    ov.hidden = false;
    mountIsland();
    syncThemeColor();
  }
  function closeComeback(start) {
    const ov = $('#overlayLayer');
    ov.hidden = true;
    ov.innerHTML = '';
    S.comebacks++;
    const r = gain(50, null);
    S.log.unshift({ id: 'comeback' + Date.now(), t: timeNow(), text: 'Возвращение после 12 дней перерыва', size: null });
    save();
    skipped.clear();
    if (start) focusFirst = 'quiet';
    tab = 'today';
    render(false);
    toast(r.leveled ? 'Новый уровень: ' + S.lvl : '+50 XP за возвращение', r.leveled ? 'level' : '');
  }

  /* ---------- Панели: заметки и демо ---------- */
  function renderNotes() {
    const n = NOTES[tab];
    $('#notes').innerHTML =
      '<div class="brand"><div class="brand-row"><span class="brand-mark">' +
        '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 15h22l-5 5-6 8-6-8z" fill="#7A6B78"/><path d="M4 14.5Q16 12 28 14.5L27 16Q16 14 5 16z" fill="#79B45F"/><path d="M16 14V9" stroke="#6E4B31" stroke-width="2"/><circle cx="16" cy="7.5" r="4" fill="#5FAE58"/></svg>' +
      '</span><h1>Остров</h1></div>' +
      '<p>Жизнь как долгая игра. Прототип для проверки механик.</p></div>' +
      '<div class="horizons" aria-label="Горизонт этого экрана">' + HORIZONS.map(function (h, i) {
        return (i ? '<span class="hz-arrow" aria-hidden="true">→</span>' : '') + '<span class="hz' + (n.horizon.indexOf(h) >= 0 ? ' on' : '') + '">' + h + '</span>';
      }).join('') + '</div>' +
      '<div class="note-block"><h2>' + n.title + '</h2><p>' + n.lead + '</p>' +
      '<ul class="note-points">' + n.points.map(function (p) { return '<li><b>' + p[0] + '</b><span>' + p[1] + '</span></li>'; }).join('') + '</ul></div>';
  }
  function demoHtml() {
    const opts = [['auto', 'Авто'], ['morning', 'Утро'], ['day', 'День'], ['evening', 'Вечер'], ['night', 'Ночь']];
    return '<h2>Демо</h2>' +
      '<div class="demo-group"><p>Время суток</p><div class="seg">' + opts.map(function (o) {
        return '<button type="button" data-phase="' + o[0] + '" aria-pressed="' + (S.phase === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="demo-group"><p>Сценарии</p><div class="demo-actions">' +
        '<button class="btn ghost" type="button" data-action="comeback">Возвращение после перерыва</button>' +
        '<button class="btn ghost" type="button" data-action="reset">Сбросить прогресс</button>' +
      '</div></div>' +
      '<p class="demo-tip">Нажми «Силы» и «Время» в карточке «Сейчас»: она подберёт дело под них. Разбери входящие ниже. Отметь «Позвонить маме», чтобы ожил дом у костра.</p>';
  }
  function renderDemo() { $('#demo').innerHTML = demoHtml() + installDemoGroup(); }

  /* ---------- Установка на телефон (PWA) ---------- */
  let installPrompt = null;
  const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function isPhoneLayout() { return window.matchMedia('(max-width: 760px), (max-height: 560px) and (orientation: landscape)').matches; }
  function installMode() {
    if (isStandalone()) return 'installed';
    if (installPrompt) return 'prompt';
    if (IS_IOS) return 'ios';
    return 'none';
  }
  function installDismissed() { try { return localStorage.getItem('ostrov-install-dismissed') === '1'; } catch (e) { return false; } }
  function installCard() {
    const mode = installMode();
    if (!isPhoneLayout() || installDismissed() || (mode !== 'prompt' && mode !== 'ios')) return '';
    return '<section class="section ib-section"><div class="install-card">' +
      '<img src="icons/icon-192.png" alt="">' +
      '<div><b>Поставь «Остров» на экран «Домой»</b><span>Открывается как приложение и работает без интернета.</span></div>' +
      '<button class="btn primary small" type="button" data-action="install">' + (mode === 'ios' ? 'Как установить' : 'Установить') + '</button>' +
      '<button class="install-x" type="button" data-action="install-dismiss" aria-label="Скрыть подсказку">' + ic(I.x, '') + '</button>' +
    '</div></section>';
  }
  function installDemoGroup() {
    const mode = installMode();
    const body = mode === 'installed' ? '<p class="demo-tip">Приложение установлено и работает без интернета.</p>'
      : mode === 'prompt' ? '<div class="demo-actions"><button class="btn ghost" type="button" data-action="install">Установить приложение</button></div>'
      : mode === 'ios' ? '<div class="demo-actions"><button class="btn ghost" type="button" data-action="install">Как установить на iPhone</button></div>'
      : '<p class="demo-tip">Открой ссылку на телефоне в Chrome или Safari и добавь на экран «Домой».</p>';
    return '<div class="demo-group"><p>На телефон</p>' + body + '</div>';
  }
  function install() {
    if (installPrompt) {
      const p = installPrompt;
      installPrompt = null;
      p.prompt();
      p.userChoice.then(function () { render(true); });
      return;
    }
    const share = '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/>';
    openSheet(
      '<h2>Установка на iPhone</h2>' +
      '<p class="lead">Три шага в Safari. После этого «Остров» откроется с экрана «Домой» как обычное приложение и будет работать без интернета.</p>' +
      '<ol class="ios-steps">' +
        '<li><span>Нажми ' + ic(share, '') + ' «Поделиться» в панели Safari</span></li>' +
        '<li><span>Прокрути список и выбери «На экран „Домой“»</span></li>' +
        '<li><span>Нажми «Добавить» в правом верхнем углу</span></li>' +
      '</ol>'
    );
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installPrompt = e;
    render(true);
  });
  window.addEventListener('appinstalled', function () {
    installPrompt = null;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    toast('«Остров» установлен на телефон');
    render(true);
  });

  // Цвет строки состояния на Android совпадает с верхом экрана: небо или фон
  const SKY_TOP = { morning: '#8FB9E2', day: '#5AA6E6', evening: '#2C3774', night: '#060A1D' };
  function syncThemeColor() {
    const sky = tab === 'today' || tab === 'island' || !$('#overlayLayer').hidden;
    const color = sky ? SKY_TOP[phase()] : getComputedStyle($('#app')).backgroundColor;
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', color); });
  }

  /* ---------- Рендер ---------- */
  function mountIsland() {
    if (!window.Island || !Island.isReady()) return;
    const ov = $('#overlayLayer');
    let host = !ov.hidden && ov.querySelector('.island-host');
    if (!host) host = $('#screen .island-host');
    if (!host) return;
    Island.setPhase(phase());
    Island.mount(host, host.dataset.view, host.parentNode.querySelector('.isl-labels'));
  }
  const VIEWS = { today: viewToday, season: viewSeason, island: viewIsland, chronicle: viewChronicle };
  function render(keepScroll) {
    const scr = $('#screen');
    const top = scr.scrollTop;
    scr.innerHTML = VIEWS[tab]();
    scr.scrollTop = keepScroll ? top : 0;
    document.querySelectorAll('.tab').forEach(function (b) {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    mountIsland();
    renderNotes();
    renderDemo();
    syncThemeColor();
  }
  function setTab(t) {
    if (!VIEWS[t]) return;
    closeSheet();
    tab = t;
    render(false);
  }

  /* ---------- Обратная связь ---------- */
  let toastTimer = null;
  function toast(msg, kind) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 2800);
  }
  function xpFloat(anchor, text) { xpFloatAt(anchor, text); }
  function xpFloatAt(anchor, text) {
    if (!anchor) return;
    const app = $('#app');
    const a = app.getBoundingClientRect(), r = anchor.getBoundingClientRect();
    if (!r.width) return;
    const el = document.createElement('span');
    el.className = 'xp-float';
    el.textContent = text;
    el.style.left = (r.left - a.left + r.width / 2) + 'px';
    el.style.top = (r.top - a.top - 4) + 'px';
    app.appendChild(el);
    setTimeout(function () { el.remove(); }, 1100);
  }

  /* ---------- События ---------- */
  document.addEventListener('click', function (e) {
    const t = e.target;
    const layer = $('#sheetLayer');
    if (t === layer) { closeSheet(); return; }
    const el = t.closest('button');
    if (!el) return;
    const d = el.dataset;
    if (d.tab) return setTab(d.tab);
    if (d.tabGo) return setTab(d.tabGo);
    if (d.check) return toggleItem(d.check, el);
    if (d.start) return openFocus(d.start);
    if (d.reflect) return openReflect(d.reflect);
    if (d.skip) { skipped.add(d.skip); return render(true); }
    if (d.quest) return openQuest(d.quest);
    if (d.step) return toggleStep(d.step, el);
    if (d.sphere) return openSphere(d.sphere);
    if (d.focusItem) { focusFirst = d.focusItem; skipped.delete(d.focusItem); return setTab('today'); }
    if (d.fitOpen) { fitOpen = fitOpen === d.fitOpen ? null : d.fitOpen; return render(true); }
    if ('fitEnergy' in d || 'fitTime' in d) {
      if ('fitEnergy' in d) S.fit.energy = d.fitEnergy || null;
      else S.fit.time = d.fitTime ? +d.fitTime : null;
      fitOpen = null;
      focusFirst = null;
      save();
      return render(true);
    }
    if (d.capMode) return openCapture(d.capMode);
    if (d.ibTab) return openInbox(d.ibTab);
    if (d.ibBack) return openInbox(d.ibBack);
    if (d.ibDo) return ibAction('do', d.ibDo);
    if (d.ibLater) return ibAction('later', d.ibLater);
    if (d.ibDel) return ibAction('del', d.ibDel);
    if (d.ibPlan) return openClarify(d.ibPlan, 'inbox');
    if (d.ltPlan) return openClarify(d.ltPlan, 'later');
    if (d.ltInbox) return ibAction('lt-inbox', d.ltInbox);
    if (d.ltDel) return ibAction('lt-del', d.ltDel);
    if (d.phase) {
      S.phase = d.phase;
      save();
      if (window.Island) Island.setPhase(phase());
      closeSheet();
      const ov = $('#overlayLayer').querySelector('.comeback');
      if (ov) ov.className = 'comeback sky phase-' + phase();
      return render(true);
    }
    switch (d.action) {
      case 'close': return closeSheet();
      case 'capture': return openCapture('inbox');
      case 'inbox': return openInbox('inbox');
      case 'later': return openInbox('later');
      case 'install': return install();
      case 'install-dismiss':
        try { localStorage.setItem('ostrov-install-dismissed', '1'); } catch (err) { /* не критично */ }
        return render(true);
      case 'fit-reset':
        S.fit = { energy: null, time: null }; fitOpen = null; save();
        return render(true);
      case 'demo': return openSheet('<div class="demo-sheet">' + demoHtml() + '</div>');
      case 'comeback': return showComeback();
      case 'comeback-start': return closeComeback(true);
      case 'comeback-close': return closeComeback(false);
      case 'unskip': skipped.clear(); return render(true);
      case 'letter': return openLetter();
      case 'cheer':
        S.cheered = true; save();
        toast('Ерлан и Аружан получили твою поддержку');
        return render(true);
      case 'reset':
        S = fresh(); save();
        skipped.clear(); focusFirst = null; fitOpen = null;
        closeSheet();
        $('#overlayLayer').hidden = true;
        if (window.Island) {
          SPHERE_KEYS.forEach(function (k) { Island.setVitality(k, S.spheres[k].vitality); });
          Island.setLevel(S.lvl);
          Island.setPhase(phase());
        }
        toast('Прогресс сброшен к примеру');
        return render(false);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
  });

  /* ---------- Запуск ---------- */
  function bootIsland() {
    if (!window.THREE || !window.Island || Island.isReady()) return;
    Island.setLabels(SPHERE_KEYS.reduce(function (m, k) { m[k] = SPHERES[k].place; return m; }, {}));
    Island.init({
      onTap: function (sphere, view) {
        if (view === 'world' && sphere) openSphere(sphere);
        else if (view === 'today') setTab('island');
      },
    });
    if (!Island.isReady()) return;
    Island.setPhase(phase(), true);
    SPHERE_KEYS.forEach(function (k) { Island.setVitality(k, S.spheres[k].vitality, true); });
    Island.setLevel(S.lvl);
    mountIsland();
  }
  window.addEventListener('three-ready', bootIsland);

  render(false);
  bootIsland();
  if (isStandalone() && navigator.storage && navigator.storage.persist) navigator.storage.persist();

  // Ярлыки с иконки приложения: ?action=capture или ?action=inbox
  (function () {
    const action = new URLSearchParams(location.search).get('action');
    if (action === 'capture') openCapture('inbox');
    else if (action === 'inbox') openInbox('inbox');
    if (action && history.replaceState) history.replaceState(null, '', location.pathname);
  })();

  // в режиме «Авто» время суток обновляется само
  function tick() {
    if (S.phase !== 'auto' || !$('#sheetLayer').hidden) return;
    if (window.Island) Island.setPhase(phase());
    if (tab === 'today') render(true);
    else syncThemeColor();
  }
  setInterval(tick, 60000);
  // Установленное приложение может висеть в памяти несколько дней: после пробуждения
  // на новом дне перезагружаемся, на том же дне обновляем время суток.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (new Date().toDateString() !== NOW0.toDateString()) location.reload();
    else tick();
  });
})();
