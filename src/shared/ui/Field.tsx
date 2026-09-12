import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

const FIELD =
  'rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none ' +
  'focus:outline-2 focus:-outline-offset-1 focus:outline-ink';

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(FIELD, className)} {...rest} />
);

export const Select = ({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(FIELD, className)} {...rest} />
);

export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(FIELD, 'resize-y font-sans', className)} {...rest} />
);
