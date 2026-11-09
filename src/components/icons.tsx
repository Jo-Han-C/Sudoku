import type { SVGAttributes } from 'preact';

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.8,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': true,
} as const;

type P = SVGAttributes<SVGSVGElement>;

export const BackIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

export const PauseIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M10 8.5v7M14 8.5v7" />
  </svg>
);

export const PlayIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const UndoIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5v5h5" />
    <path d="M4.6 10A8 8 0 1 1 6 16.5" />
  </svg>
);

export const EraseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8.5 19.5h11" />
    <path d="M3.9 14.6l9.2-9.2a2 2 0 0 1 2.8 0l3.7 3.7a2 2 0 0 1 0 2.8l-7.6 7.6H8.5l-4.6-4.6a.2.2 0 0 1 0-.3z" />
    <path d="M9.5 9l6.5 6.5" />
  </svg>
);

export const PencilIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20l1-4.5L16.2 4.3a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19 4 20z" />
    <path d="M14.5 6l3.5 3.5" />
  </svg>
);
