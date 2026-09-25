const CATS = {
  base: { label: 'Drink', color: '#8b5a2b' },
  milk: { label: 'Milk', color: '#c98a1b' },
  sugar: { label: 'Sugar', color: '#d6457f' },
  ice: { label: 'Ice', color: '#2e86de' },
  noodle: { label: 'Noodle', color: '#c99700' },
  style: { label: 'Dry/Soup', color: '#1f8a5b' },
  chili: { label: 'Chili', color: '#e04b3a' },
};

const GLOSS = {
  Kopi: {
    cat: 'base',
    short: 'Coffee',
    long: 'Local-style coffee. Said on its own, it comes with sweet condensed milk.',
  },
  Teh: {
    cat: 'base',
    short: 'Tea',
    long: 'Strong black tea, "pulled" for froth. Said on its own, it comes with sweet condensed milk.',
  },
  O: {
    cat: 'milk',
    short: 'No milk (still has sugar)',
    long: 'From Hokkien 烏 (oh), "black". Kopi O = black coffee with sugar.',
  },
  C: {
    cat: 'milk',
    short: 'Evaporated milk',
    long: 'Evaporated milk plus sugar, instead of condensed milk. Often traced to Hainanese "si" (fresh) or the Carnation milk brand.',
  },
  'Siew Dai': {
    cat: 'sugar',
    short: 'Less sugar',
    long: '少甜, "less sweet". Comes after the milk word.',
  },
  Kosong: {
    cat: 'sugar',
    short: 'No sugar',
    long: 'Malay for "empty" or "zero". Kopi O Kosong = black coffee, no sugar at all.',
  },
  'Ga Dai': {
    cat: 'sugar',
    short: 'Extra sugar',
    long: '加甜, "add sweet". For the sweet-tooth crowd.',
  },
  Peng: {
    cat: 'ice',
    short: 'Iced',
    long: 'From Hokkien 冰 (peng), "ice". Always goes last.',
    stray: '“Peng” means iced. That’s drink lingo, not for noodles lah!',
  },
  'Mee Pok': {
    cat: 'noodle',
    short: 'Flat yellow egg noodles',
    long: '面薄. Flat, springy egg noodles, a bit like linguine. The classic for dry fishball noodles.',
  },
  'Mee Kia': {
    cat: 'noodle',
    short: 'Thin yellow egg noodles',
    long: '面仔, "little noodles". Thin and curly.',
  },
  'Hor Fun': {
    cat: 'noodle',
    short: 'Flat white rice noodles',
    long: '河粉. Wide, silky rice noodles.',
  },
  'Bee Hoon': {
    cat: 'noodle',
    short: 'Thin rice vermicelli',
    long: '米粉. Very thin white rice noodles. Nice, but no customer here is asking for it.',
  },
  Dry: {
    cat: 'style',
    short: 'Tossed dry, soup on the side',
    long: 'Noodles tossed in sauce, with a small bowl of soup on the side. Hokkien: "ta".',
  },
  Soup: {
    cat: 'style',
    short: 'Served in soup',
    long: 'Noodles and toppings together in a bowl of broth. Hokkien: "tng".',
  },
  Chili: {
    cat: 'chili',
    short: 'With chili',
    long: 'Tossed with chili sauce (dry) or with chili on the side (soup). Shiok!',
  },
  'No Chili': {
    cat: 'chili',
    short: 'No chili',
    long: 'No spice at all. Hokkien speakers might say "bo hiam".',
  },
};

/* avatar presets */
const AV = {
  lim: {
    skin: '#e7b58c',
    hair: '#8f8f8f',
    style: 'bald',
    singlet: true,
    towel: true,
  },
  mei: {
    skin: '#f1c9a3',
    hair: '#2a211b',
    style: 'bun',
    shirt: '#f7c8d6',
    apron: '#1f8a5b',
    visor: '#e04b3a',
  },
};

const LEVELS = [
  {
    id: 'drinks',
    kind: 'drink',
    stall: 'Heng Heng Kopi',
    stallZh: '興興咖啡',
    type: 'Drinks',
    npc: 'Uncle Lim',
    role: 'kopi master',
    honor: 'Uncle',
    title: 'Your first kopi order',
    npcAv: AV.lim,
    slots: ['base', 'milk', 'sugar', 'ice'],
    optional: ['milk', 'sugar', 'ice'],
    none: {
      milk: 'say nothing and you get condensed milk (the default)',
      sugar: 'say nothing and you get normal sugar',
      ice: 'say nothing and it comes hot',
    },
    chips: ['Kopi', 'Teh', 'O', 'C', 'Siew Dai', 'Kosong', 'Ga Dai', 'Peng'],
    intro: [
      'Eh, new face ah? Come, come. Uncle teach you order like a true-blue Singaporean.',
      'Got rhythm one: say the drink first, then milk, then sugar, then ice. Anything you don’t say, Uncle give you the default.',
    ],
    formula: [
      { cat: 'base', opts: ['Kopi', 'Teh'] },
      { cat: 'milk', opts: ['O', 'C'], blank: 'condensed milk' },
      { cat: 'sugar', opts: ['Siew Dai', 'Kosong'], blank: 'normal sugar' },
      { cat: 'ice', opts: ['Peng'], blank: 'hot' },
    ],
    orderNote: 'drink, then milk, then sugar, then ice',
    example: {
      tokens: ['Kopi', 'O', 'Siew Dai', 'Peng'],
      meaning: 'black coffee, less sugar, iced',
    },
    next: [
      'Next! What you want?',
      'Yes boss, order?',
      'Kopi or teh?',
      'Can, can. Tell Uncle.',
      'Say slowly, Uncle old already.',
      'Last one before the lunch crowd!',
    ],
    praise: [
      'Wah, like local already!',
      'Steady lah!',
      'Correct! Uncle pull kopi for you now.',
      'Power! You grew up here ah?',
    ],
    comfort: [
      'No problem, everybody also like that at first.',
      'Relax, try again. Uncle not in a rush.',
      'Almost there. Listen to what the customer wants.',
    ],
    prompts: [
      {
        c: {
          name: 'Mr Tan',
          tag: 'retired regular',
          av: {
            skin: '#eab893',
            hair: '#bdbdbd',
            style: 'bald',
            shirt: '#8fb3d9',
            glasses: true,
          },
        },
        q: 'Morning! Just the usual. Hot coffee, with the sweet condensed milk.',
        a: ['Kopi'],
      },
      {
        c: {
          name: 'Priya',
          tag: 'office worker',
          av: {
            skin: '#b9774f',
            hair: '#1b1512',
            style: 'long',
            shirt: '#7a4fd1',
          },
        },
        q: 'Hot tea with condensed milk, please. But not so sweet ah, I’m cutting down.',
        a: ['Teh', 'Siew Dai'],
      },
      {
        c: {
          name: 'Ah Boy',
          tag: 'NSF on book-out day',
          av: {
            skin: '#d9a57c',
            hair: '#1b1512',
            style: 'short',
            shirt: '#56733f',
          },
        },
        q: 'Wah, 34 degrees today. Black coffee, no milk but got sugar, and with ice!',
        a: ['Kopi', 'O', 'Peng'],
      },
      {
        c: {
          name: 'Mdm Wong',
          tag: 'health-conscious auntie',
          av: {
            skin: '#f0c7a0',
            hair: '#4a4a4a',
            style: 'short',
            shirt: '#e85d9c',
            glasses: true,
          },
        },
        q: 'Coffee with evaporated milk. Zero sugar, doctor’s orders.',
        a: ['Kopi', 'C', 'Kosong'],
      },
      {
        c: {
          name: 'Sarah',
          tag: 'exchange student',
          av: {
            skin: '#f6d5bf',
            hair: '#d9a441',
            style: 'ponytail',
            shirt: '#2e86de',
          },
        },
        q: 'Could I get iced tea with no milk and no sugar at all?',
        a: ['Teh', 'O', 'Kosong', 'Peng'],
      },
      {
        c: {
          name: 'Boss Chua',
          tag: 'lunch-hour rusher',
          av: {
            skin: '#e6b48d',
            hair: '#1b1512',
            style: 'short',
            shirt: '#ffffff',
            tie: '#e04b3a',
          },
        },
        q: 'Black coffee, no milk. Less sugar. Iced. Quick quick, meeting at two!',
        a: ['Kopi', 'O', 'Siew Dai', 'Peng'],
      },
    ],
  },
  {
    id: 'noodles',
    kind: 'noodle',
    stall: 'Mei Mei Fishball Noodle',
    stallZh: '美美魚丸麵',
    type: 'Fishball noodles',
    npc: 'Auntie Mei',
    role: 'fishball noodle hawker',
    honor: 'Auntie',
    title: 'Fishball noodles your way',
    npcAv: AV.mei,
    slots: ['noodle', 'style', 'chili'],
    optional: [],
    none: {},
    chips: [
      'Mee Pok',
      'Mee Kia',
      'Hor Fun',
      'Bee Hoon',
      'Dry',
      'Soup',
      'Chili',
      'No Chili',
      'Peng',
    ],
    intro: [
      'Come, Auntie teach you how to order fishball noodles!',
      'Tell Auntie three things, in order: which noodle, dry or soup, then chili or no chili. Dry one comes with soup on the side, don’t worry.',
    ],
    formula: [
      { cat: 'noodle', opts: ['Mee Pok', 'Mee Kia', 'Hor Fun'] },
      { cat: 'style', opts: ['Dry', 'Soup'] },
      { cat: 'chili', opts: ['Chili', 'No Chili'] },
    ],
    orderNote: 'noodle, then dry or soup, then chili',
    example: {
      tokens: ['Mee Pok', 'Dry', 'Chili'],
      meaning: 'flat egg noodles, tossed dry, with chili',
    },
    next: [
      'Next! Mee what?',
      'Dry or soup ah?',
      'Tell Auntie, tell Auntie.',
      'Chili want or not?',
      'Wah, long queue today.',
      'Last one, then Auntie rest!',
    ],
    praise: [
      'Shiok! Auntie give you extra fishball.',
      'Very good! Like my regulars.',
      'Correct! Coming, coming.',
      'Wah, you learn fast!',
    ],
    comfort: [
      'Never mind, try again. Auntie patient one.',
      'Close already! Listen carefully to the customer.',
      'Aiyo, small mistake only.',
    ],
    prompts: [
      {
        c: {
          name: 'Jun Wei',
          tag: 'poly student',
          av: {
            skin: '#f0c49c',
            hair: '#1b1512',
            style: 'fringe',
            shirt: '#f28c28',
          },
        },
        q: 'Flat yellow egg noodles, dry, with chili. Make it shiok!',
        a: ['Mee Pok', 'Dry', 'Chili'],
      },
      {
        c: {
          name: 'Mrs Lee',
          tag: 'ordering for her four-year-old',
          av: {
            skin: '#f3cfae',
            hair: '#5a3a22',
            style: 'long',
            shirt: '#1f8a5b',
          },
        },
        q: 'For my girl: the thin yellow egg noodles, in soup. No chili please, she’s only four.',
        a: ['Mee Kia', 'Soup', 'No Chili'],
      },
      {
        c: {
          name: 'Mr Kumar',
          tag: 'taxi uncle',
          av: {
            skin: '#8d5a3b',
            hair: '#1b1512',
            style: 'short',
            shirt: '#ffc93c',
            mustache: true,
          },
        },
        q: 'Flat white rice noodles in soup. Add chili, I like it spicy.',
        a: ['Hor Fun', 'Soup', 'Chili'],
      },
      {
        c: {
          name: 'Mei Ling',
          tag: 'nurse on a break',
          av: {
            skin: '#f4d0b0',
            hair: '#1b1512',
            style: 'ponytail',
            shirt: '#6ec6ca',
          },
        },
        q: 'Thin egg noodles, tossed dry. No chili, I cannot take spice.',
        a: ['Mee Kia', 'Dry', 'No Chili'],
      },
      {
        c: {
          name: 'Grandpa Ong',
          tag: 'morning exercise group',
          av: {
            skin: '#e6b58f',
            hair: '#e0e0e0',
            style: 'bald',
            shirt: '#c9b79c',
            glasses: true,
          },
        },
        q: 'The flat yellow egg noodles, in soup. Don’t want chili.',
        a: ['Mee Pok', 'Soup', 'No Chili'],
      },
      {
        c: {
          name: 'Chloe',
          tag: 'food blogger',
          av: {
            skin: '#f5d3b8',
            hair: '#2a211b',
            style: 'cap',
            cap: '#e85d9c',
            shirt: '#ffffff',
          },
        },
        q: 'Flat white rice noodles, but tossed dry, with chili. It photographs better!',
        a: ['Hor Fun', 'Dry', 'Chili'],
      },
    ],
  },
];

// Nasi lemak: short exchanges, with scoring once per customer.
Object.assign(CATS, {
  meal: { label: 'Meal', color: '#23856b' },
  chicken: { label: 'Chicken', color: '#b86924' },
  egg: { label: 'Extra egg', color: '#bc8a14' },
  sambal: { label: 'Sambal', color: '#d74d38' },
  dining: { label: 'Eat here / takeaway', color: '#367aac' },
  polite: { label: 'Conversation', color: '#9766ac' },
});
const MALAY_TERMS = [
  [
    'Kak',
    'polite',
    'Older sister; familiar address',
    'Short for kakak. A friendly form of address for this NPC, not a required part of an order.',
  ],
  [
    'Saya nak',
    'polite',
    'I would like',
    'A conversational way to begin a request.',
  ],
  [
    'Nasi lemak satu',
    'meal',
    'One nasi lemak',
    'Satu means one. Order one portion of this stall’s basic set.',
  ],
  [
    'Satu nasi lemak',
    'meal',
    'One nasi lemak',
    'An alternative way to order one portion.',
  ],
  [
    'Ayam goreng',
    'chicken',
    'Fried chicken',
    'Add fried chicken to the basic set.',
  ],
  [
    'Tambah telur satu',
    'egg',
    'Add one egg',
    'Tambah means add; telur means egg; satu means one. This is an extra egg.',
  ],
  [
    'Tak nak telur tambahan',
    'egg',
    'No extra egg',
    'Decline an additional egg. The basic set still includes its half boiled egg.',
  ],
  [
    'Sambal sikit',
    'sambal',
    'A little sambal',
    'A smaller amount of sambal, not a less spicy recipe.',
  ],
  [
    'Tak nak sambal',
    'sambal',
    'No sambal',
    'Tak nak means do not want. Leave sambal off this serving.',
  ],
  [
    'Sambal asing',
    'sambal',
    'Sambal separately',
    'Asing means separate. Serve the sambal in a separate little container.',
  ],
  [
    'Sambal biasa',
    'sambal',
    'Regular sambal portion',
    'Biasa means usual or normal.',
  ],
  [
    'Makan sini',
    'dining',
    'Eat here',
    'Conversational wording for eating here at the hawker centre.',
  ],
  [
    'Bungkus',
    'dining',
    'Takeaway',
    'Ask for the meal to be packed to take away.',
  ],
  [
    'Terima kasih',
    'polite',
    'Thank you',
    'Say this when your food is handed over. It does not affect your food-order score.',
  ],
];
MALAY_TERMS.forEach(
  ([t, cat, short, long]) => (GLOSS[t] = { cat, short, long }),
);
const NASI_BASE =
  'This stall’s basic set: coconut rice, half a boiled egg, cucumber, peanuts and ikan bilis (anchovies). Sambal is chosen separately. Other stalls may serve different sets.';
const nasiOrder = (chicken) => ({
  q: 'Nak makan apa? — What would you like?',
  a: ['Nasi lemak satu', ...(chicken ? ['Ayam goreng'] : [])],
  chips: [
    'Kak',
    'Saya nak',
    'Nasi lemak satu',
    'Satu nasi lemak',
    'Ayam goreng',
  ],
});
const nasiEgg = {
  q: 'Nak tambah telur? — Want to add an egg?',
  a: ['Tambah telur satu'],
  chips: ['Tambah telur satu', 'Tak nak telur tambahan'],
};
const nasiSambal = (term) => ({
  q: 'Sambal macam mana? — How would you like the sambal?',
  a: [term],
  chips: ['Sambal biasa', 'Sambal sikit', 'Tak nak sambal', 'Sambal asing'],
});
const nasiDining = (term) => ({
  q: 'Makan sini atau bungkus? — Eating here or takeaway?',
  a: [term],
  chips: ['Makan sini', 'Bungkus'],
});
const nasiScenarios = [
  [
    'A first visit',
    'One basic nasi lemak, regular sambal, no extra egg. Eat here.',
    false,
    false,
    'Sambal biasa',
    'Makan sini',
  ],
  [
    'Lunch break',
    'One nasi lemak with fried chicken, regular sambal, no extra egg. Eat here.',
    true,
    false,
    'Sambal biasa',
    'Makan sini',
  ],
  [
    'An extra egg',
    'One basic nasi lemak with one extra egg, regular sambal. Eat here.',
    false,
    true,
    'Sambal biasa',
    'Makan sini',
  ],
  [
    'Just a little',
    'One basic nasi lemak with a little sambal, no extra egg. Eat here.',
    false,
    false,
    'Sambal sikit',
    'Makan sini',
  ],
  [
    'Taking lunch home',
    'One basic nasi lemak, no sambal and no extra egg. Takeaway.',
    false,
    false,
    'Tak nak sambal',
    'Bungkus',
  ],
  [
    'The full order',
    'One nasi lemak with fried chicken and one extra egg. Pack the sambal separately. Takeaway.',
    true,
    true,
    'Sambal asing',
    'Bungkus',
  ],
];
LEVELS.push({
  id: 'nasi',
  kind: 'nasi',
  stall: 'Dapur Aisyah',
  stallZh: 'NASI LEMAK',
  type: 'Nasi lemak',
  npc: 'Kak Aisyah',
  role: 'nasi lemak hawker',
  honor: 'Kak',
  title: 'A nasi lemak conversation',
  npcAv: {
    skin: '#bd895f',
    hair: '#33261e',
    style: 'long',
    shirt: '#d9a53b',
    apron: '#23856b',
  },
  slots: ['meal', 'chicken', 'egg', 'sambal', 'dining'],
  optional: ['chicken', 'egg'],
  none: {},
  chips: MALAY_TERMS.map((x) => x[0]),
  intro: [
    'Welcome! We’ll build your meal one question at a time.',
    NASI_BASE,
    'You can call me Kak Aisyah. Kak means older sister and can be a friendly address; it is optional. Hover or hold a chip for help.',
  ],
  formula: [
    { cat: 'meal', opts: ['Nasi lemak satu'] },
    { cat: 'sambal', opts: ['Sambal sikit'] },
    { cat: 'dining', opts: ['Bungkus'] },
  ],
  example: {
    tokens: ['Nasi lemak satu', 'Sambal sikit', 'Bungkus'],
    meaning: 'one nasi lemak, a little sambal, to take away',
  },
  next: ['Welcome! What would you like?'],
  praise: ['Your meal is ready. Enjoy!'],
  comfort: ['No worries. Let’s try that part again.'],
  prompts: nasiScenarios.map(([name, q, chicken, egg, sambal, dining]) => ({
    c: {
      name,
      tag: 'nasi lemak customer',
      av: { skin: '#e8b994', style: 'short', shirt: '#69a8b2' },
    },
    q,
    stages: [
      nasiOrder(chicken),
      ...(egg ? [nasiEgg] : []),
      nasiSambal(sambal),
      nasiDining(dining),
    ],
    a: [
      'Nasi lemak satu',
      ...(chicken ? ['Ayam goreng'] : []),
      ...(egg ? ['Tambah telur satu'] : []),
      sambal,
      dining,
    ],
  })),
});

const HUB_TIPS = [
  'A tissue packet on a table means the seat is “choped” (reserved). Find another seat!',
  'Return your tray at the tray return point when you’re done. It’s the local way.',
  'Say the whole order in one breath, like “Kopi O Siew Dai Peng”. Hawkers love a confident order.',
  'Hawkers may call you “boss”, “leng lui” or “handsome”. Just smile and order.',
  'Unsure? Point and say the drink first. The uncle will ask the rest.',
];

export { CATS, GLOSS, LEVELS, NASI_BASE, HUB_TIPS };
