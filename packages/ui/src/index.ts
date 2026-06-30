/**
 * @agent-os/ui
 *
 * Shared React + Tailwind + shadcn/ui components. Phase 1.1 ships only the
 * `cn()` helper used across components. Real components land in Phase 2+.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const PACKAGE_NAME = '@agent-os/ui' as const;
export const PACKAGE_VERSION = '1.0.0' as const;

export const cn = (...inputs: readonly ClassValue[]): string => twMerge(clsx(inputs));
