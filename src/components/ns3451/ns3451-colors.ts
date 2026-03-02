/**
 * NS 3451 category color mappings.
 *
 * The canonical hex values live in globals.css as `--color-ns-{1..7}`.
 * This module provides Tailwind utility class mappings so components can
 * apply category-aware styling without inline styles.
 *
 * Each top-level NS 3451 category (codes 1-7) maps to a distinct color.
 */

export interface NS3451CategoryColor {
  /** Tailwind bg class for a subtle background tint */
  bg: string
  /** Tailwind bg class for a strong/solid background */
  bgSolid: string
  /** Tailwind text class for readable text on white background */
  text: string
  /** Tailwind border class */
  border: string
  /** CSS custom property name (for use with inline styles if needed) */
  cssVar: string
  /** Human label (Norwegian) */
  label: string
}

/**
 * Color config keyed by the single-digit top-level NS 3451 code.
 *
 * Colors align with the --color-ns-{n} custom properties in globals.css:
 *   1: #6366F1 (indigo)
 *   2: #0066B3 (coor-blue)
 *   3: #0891B2 (cyan)
 *   4: #F59E0B (amber)
 *   5: #8B5CF6 (violet)
 *   6: #EC4899 (pink)
 *   7: #22C55E (green)
 */
export const NS3451_CATEGORY_COLORS: Record<string, NS3451CategoryColor> = {
  '1': {
    bg: 'bg-indigo-50',
    bgSolid: 'bg-indigo-500',
    text: 'text-indigo-700',
    border: 'border-indigo-500',
    cssVar: '--color-ns-1',
    label: 'Fellesanlegg',
  },
  '2': {
    bg: 'bg-blue-50',
    bgSolid: 'bg-coor-blue-500',
    text: 'text-coor-blue-700',
    border: 'border-coor-blue-500',
    cssVar: '--color-ns-2',
    label: 'Bygning',
  },
  '3': {
    bg: 'bg-cyan-50',
    bgSolid: 'bg-cyan-600',
    text: 'text-cyan-700',
    border: 'border-cyan-600',
    cssVar: '--color-ns-3',
    label: 'VVS',
  },
  '4': {
    bg: 'bg-amber-50',
    bgSolid: 'bg-amber-500',
    text: 'text-amber-700',
    border: 'border-amber-500',
    cssVar: '--color-ns-4',
    label: 'Elkraft',
  },
  '5': {
    bg: 'bg-violet-50',
    bgSolid: 'bg-violet-500',
    text: 'text-violet-700',
    border: 'border-violet-500',
    cssVar: '--color-ns-5',
    label: 'Tele og automatisering',
  },
  '6': {
    bg: 'bg-pink-50',
    bgSolid: 'bg-pink-500',
    text: 'text-pink-700',
    border: 'border-pink-500',
    cssVar: '--color-ns-6',
    label: 'Andre installasjoner',
  },
  '7': {
    bg: 'bg-green-50',
    bgSolid: 'bg-green-500',
    text: 'text-green-700',
    border: 'border-green-500',
    cssVar: '--color-ns-7',
    label: 'Utendors',
  },
}

/** Fallback color config for unknown or missing categories */
export const NS3451_FALLBACK_COLOR: NS3451CategoryColor = {
  bg: 'bg-gray-50',
  bgSolid: 'bg-gray-500',
  text: 'text-gray-700',
  border: 'border-gray-400',
  cssVar: '',
  label: 'Ukjent',
}

/**
 * Resolves the color config for any NS 3451 code by extracting
 * its top-level parent digit.
 *
 * Examples:
 *   "2"   -> category 2
 *   "26"  -> category 2
 *   "263" -> category 2
 */
export function getCategoryColor(code: string): NS3451CategoryColor {
  const topLevel = code.charAt(0)
  return NS3451_CATEGORY_COLORS[topLevel] ?? NS3451_FALLBACK_COLOR
}
