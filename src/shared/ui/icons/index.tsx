import type { SVGProps } from 'react';

/**
 * Іконки перенесені з мапи `I` прототипу.
 * Усі 16×16, малюються `currentColor` — колір задає батьківський клас.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  viewBox: '0 0 16 16',
  width: 16,
  height: 16,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const IconOk = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M5 8l2 2 4-4" />
  </svg>
);

export const IconOkFilled = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor">
    <circle cx="8" cy="8" r="7" />
    <path d="M5 8l2 2 4-4" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Півзаповнене коло — «є варіанти, треба обрати». */
export const IconVariant = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 1.5a6.5 6.5 0 0 1 0 13" fill="currentColor" stroke="none" />
  </svg>
);

export const IconBad = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
  </svg>
);

export const IconTriangle = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <path d="M8 1.5l6.5 6.5L8 14.5 1.5 8z" />
  </svg>
);

export const IconWait = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 4.5V8l2.5 1.5" />
  </svg>
);

export const IconReplied = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <path d="M2 3.5h12v8H6l-3 2.5v-2.5H2z" />
  </svg>
);

export const IconInfo = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 5v.5M8 8v3.5" />
  </svg>
);

export const IconAsk = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <path d="M2 3h12v10H2z" />
    <path d="M2 4l6 5 6-5" />
  </svg>
);

export const IconNeutral = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M5 8h6" />
  </svg>
);

export const IconChevron = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <path d="M6 3l5 5-5 5" />
  </svg>
);

export const IconHighPriority = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor">
    <path d="M9 1L3 9h4l-1 6 7-9H9l1-5z" />
  </svg>
);

export const IconClose = (props: IconProps) => (
  <svg {...base(props)} {...stroke}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
