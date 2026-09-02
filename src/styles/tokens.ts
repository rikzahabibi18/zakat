export const colors = {
  // Primary — hijau utama
  primary:       '#2D7A50',
  primaryDark:   '#1A4731',
  primaryLight:  '#F0F7F3',
  primaryBorder: '#C9E8D5',

  // Surface & background
  surface:    '#FFFFFF',
  surfaceAlt: '#FAFAF9',
  bg:         '#F8F4ED',

  // Border
  border:      '#EDE8E0',
  borderLight: '#F5F0E8',

  // Text
  text:            '#1C1917',
  textMuted:       '#57534E',
  textSubtle:      '#78716C',
  textDisabled:    '#A8A29E',
  textPlaceholder: '#C4BDB4',

  // Danger / error
  danger:       '#B91C1C',
  dangerBg:     '#FEF2F2',
  dangerBorder: '#FECACA',

  // Gold / amber — untuk fidyah, badge lembaga, dll
  gold:       '#92681A',
  goldBg:     '#FDF8EE',
  goldBorder: '#C9A84C',

  // Blue — untuk metode Transfer Bank
  blue:   '#1D4ED8',
  blueBg: '#EFF6FF',

  // Purple — untuk metode QRIS
  purple:   '#7C3AED',
  purpleBg: '#F5F3FF',
} as const

export const radius = {
  sm:   '8px',
  md:   '10px',
  lg:   '12px',
  xl:   '16px',
  xxl:  '20px',
  full: '99px',
} as const

export const font = {
  family: "'Plus Jakarta Sans', sans-serif",
  xs:   '11px',
  sm:   '12px',
  base: '13px',
  md:   '14px',
  lg:   '15px',
  xl:   '16px',
  h3:   '17px',
  h2:   '21px',
  h1:   '26px',
} as const

export const shadow = {
  card:     '0 1px 3px rgba(0,0,0,0.06)',
  dropdown: '0 8px 24px rgba(0,0,0,0.1)',
  modal:    '0 20px 60px rgba(0,0,0,0.15)',
  float:    '0 2px 8px rgba(0,0,0,0.08)',
} as const

export const gradient = {
  primary:  'linear-gradient(135deg, #2D7A50, #1A4731)',
  progress: 'linear-gradient(90deg, #2D7A50, #4CAF7D)',
} as const

export const spacing = {
  cardPadding:       '24px',
  cardPaddingMobile: '16px',
  sectionGap:        '20px',
  fieldGap:          '16px',
  inputPadding:      '11px 14px',
} as const