export const colors = {
  background: "#F8F2E6",
  surface: "#FFFCF2",
  surfaceStrong: "#FFFFFF",
  text: "#071A2D",
  muted: "#596171",
  border: "#071A2D",
  hairline: "#DDD2BD",
  primary: "#0057FF",
  primaryPressed: "#0042C7",
  red: "#EF2B2D",
  redPressed: "#C91C25",
  yellow: "#FFD500",
  yellowPressed: "#E8BD00",
  green: "#0F8F4D",
  ink: "#071A2D",
  white: "#FFFFFF",
  cream: "#F8F2E6",
  blueSoft: "#DCE7FF",
  redSoft: "#FFE0DC",
  yellowSoft: "#FFF2A8",
  navyWash: "#E8ECF0",
  scrim: "rgba(7, 26, 45, 0.08)"
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const radii = {
  sm: 4,
  md: 8,
  pill: 999
} as const;

export const borders = {
  regular: 2,
  heavy: 3
} as const;

export const layout = {
  maxWidth: 720,
  compactWidth: 390,
  tabletWidth: 720
} as const;

export const motion = {
  fast: 160,
  medium: 360,
  slow: 900
} as const;
