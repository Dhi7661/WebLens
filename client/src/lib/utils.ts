import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines conditional class names and resolves conflicting Tailwind CSS classes.
 * Example: cn('px-4 py-2', isPrimary && 'bg-blue-600', 'px-6') -> 'py-2 bg-blue-600 px-6'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
