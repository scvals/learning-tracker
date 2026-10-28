// Оформления (скины) и светлая/тёмная тема.

export const SKINS = [
  { id: 'moss', name: 'Мох и хаки', tagline: 'Лесной мох, хаки и тёплый серый лён',
    swatches: ['#6f7f55', '#a89b6c', '#8a8577', '#f1ece0'] },
  { id: 'linen', name: 'Пряжа и лён', tagline: 'Кремовый лён, терракота, шалфей и горчица',
    swatches: ['#c06a4a', '#8ea383', '#d2a23f', '#f5eee2'] },
  { id: 'botanic', name: 'Ботанический альбом', tagline: 'Акварельные травы, пыльная роза и олива',
    swatches: ['#b9737a', '#7d8a55', '#9a86b5', '#fbf7ee'] },
  { id: 'nordic', name: 'Скандинавский свитер', tagline: 'Звёзды-снежинки, глубокий синий и брусника',
    swatches: ['#2f4a73', '#b3343f', '#8fa7c4', '#f7f4ee'] },
  { id: 'sashiko', name: 'Японская тетрадь', tagline: 'Стежки сасико, индиго, персик и рисовая бумага',
    swatches: ['#33456b', '#e3a487', '#8a9a86', '#f6f1e6'] },
];

// Цвет строки состояния браузера для каждого скина (фон шапки).
const THEME_COLORS = {
  moss: { light: '#efeadf', dark: '#1e211b' },
  linen: { light: '#f4ece0', dark: '#241a15' },
  botanic: { light: '#f8f3ea', dark: '#211d1d' },
  nordic: { light: '#f3f1ec', dark: '#151d2b' },
  sashiko: { light: '#f4efe4', dark: '#181c26' },
};

export function resolveMode(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(skin, mode) {
  const id = SKINS.some((s) => s.id === skin) ? skin : 'moss';
  const theme = resolveMode(mode);
  const root = document.documentElement;
  root.dataset.skin = id;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  meta.content = THEME_COLORS[id][theme];
  return { skin: id, theme };
}
