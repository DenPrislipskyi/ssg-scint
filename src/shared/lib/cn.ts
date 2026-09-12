import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Об'єднує класи з коректним вирішенням конфліктів Tailwind. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
