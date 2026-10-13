/**
 * The machine and the paper.
 *
 * Same palette as the web app: a dark navy body with a lit readout and moulded
 * keys, and bright torn paper for anything the customer is asked to look at.
 * One appearance in every light — a counter is sometimes in sun and sometimes
 * under one bulb, and a dark chrome with a bright stub reads in both.
 */
export const C = {
  machine: '#0b1020',
  machineLift: '#121a30',
  raised: '#1a2440',
  raisedTop: '#253153',
  recessed: '#060a16',
  edge: '#2b3760',
  keyEdge: '#070b18',
  chrome: '#eef1f9',
  chromeSoft: '#97a3c0',
  chromeFaint: '#6c7795',

  paper: '#fcfaf4',
  paperRule: '#e2ddcd',
  paperShade: '#ece7d9',
  ink: '#141a2c',
  inkSoft: '#57607a',
  inkFaint: '#8a92a6',

  cyan: '#46c2ec',
  cyanDeep: '#0d6f94',
  magenta: '#ff5c9b',
  magentaInk: '#bb1555',
  brass: '#edb94f',
  brassLift: '#f7d382',
  brassEdge: '#9d7320',
  onBrass: '#1b1304',
  violet: '#6b37c9',
} as const;

/**
 * The machine speaks in a technical grotesque; the paper it issues is set in a
 * ledger serif. You can tell which you are looking at without reading a word.
 */
export const F = {
  machine: 'SpaceGrotesk_500Medium',
  machineBold: 'SpaceGrotesk_700Bold',
  paper: 'Fraunces_400Regular',
  paperBold: 'Fraunces_700Bold',
  mono: undefined as string | undefined, // platform default monospace
} as const;

export const RADIUS = { key: 12, panel: 16, chip: 12 } as const;
