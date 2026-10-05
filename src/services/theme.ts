export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  bgMain: string;
  bgSurface: string;
  bgSurfaceSubtle: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  isDark?: boolean;
}

export const THEME_PRESETS: ThemePalette[] = [
  {
    id: 'plum-magenta',
    name: 'Plum & Electric Magenta',
    description: 'Deep plum #4D0834 background with #7A1354 surface, #AF1F72 borders, and #E82A89 accents',
    bgMain: '#4D0834',
    bgSurface: '#7A1354',
    bgSurfaceSubtle: '#5E0D41',
    borderSubtle: '#AF1F72',
    borderStrong: '#E82A89',
    textPrimary: '#FFFFFF',
    textSecondary: '#FCE7F3',
    textMuted: '#F472B6',
    accentPrimary: '#E82A89',
    isDark: true
  },
  {
    id: 'warm-ivory',
    name: 'Warm Ivory Paper',
    description: 'Classic calm academic paper aesthetic with subtle warm beige undertones',
    bgMain: '#FCFBF8',
    bgSurface: '#FFFFFF',
    bgSurfaceSubtle: '#F7F6F1',
    borderSubtle: '#E8E7E2',
    borderStrong: '#D5D3CB',
    textPrimary: '#1E2022',
    textSecondary: '#5A5E65',
    textMuted: '#848A94',
    accentPrimary: '#F4C430'
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Slate & Frost',
    description: 'Cool minimalist grey with crisp high-contrast cards and cobalt accents',
    bgMain: '#F3F4F6',
    bgSurface: '#FFFFFF',
    bgSurfaceSubtle: '#E5E7EB',
    borderSubtle: '#D1D5DB',
    borderStrong: '#9CA3AF',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    accentPrimary: '#2563EB'
  },
  {
    id: 'vintage-parchment',
    name: 'Vintage Parchment',
    description: 'Rich sepia book tone with warm amber accents and readable contrasting text',
    bgMain: '#F5EFE6',
    bgSurface: '#FAF8F5',
    bgSurfaceSubtle: '#EBE2D5',
    borderSubtle: '#DDD2C1',
    borderStrong: '#BAAC98',
    textPrimary: '#2C2621',
    textSecondary: '#675D52',
    textMuted: '#9C8F80',
    accentPrimary: '#D97706'
  },
  {
    id: 'botanical-sage',
    name: 'Botanical Sage',
    description: 'Soothing natural green palette for sustained eye-friendly study sessions',
    bgMain: '#F0F4F1',
    bgSurface: '#FFFFFF',
    bgSurfaceSubtle: '#E2EBE4',
    borderSubtle: '#D0DDD3',
    borderStrong: '#A9BFB0',
    textPrimary: '#1C2B20',
    textSecondary: '#475C4C',
    textMuted: '#7C9482',
    accentPrimary: '#16A34A'
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    description: 'Gentle muted violet background with serene purple accents',
    bgMain: '#F5F3FF',
    bgSurface: '#FFFFFF',
    bgSurfaceSubtle: '#EDE9FE',
    borderSubtle: '#DDD6FE',
    borderStrong: '#C4B5FD',
    textPrimary: '#1E1B4B',
    textSecondary: '#5B21B6',
    textMuted: '#8B5CF6',
    accentPrimary: '#7C3AED'
  },
  {
    id: 'studio-clean',
    name: 'Studio Ceramic',
    description: 'Neutral ultra-clean monochrome with slate borders and sky blue highlights',
    bgMain: '#FAFAFA',
    bgSurface: '#FFFFFF',
    bgSurfaceSubtle: '#F4F4F5',
    borderSubtle: '#E4E4E7',
    borderStrong: '#D4D4D8',
    textPrimary: '#09090B',
    textSecondary: '#52525B',
    textMuted: '#A1A1AA',
    accentPrimary: '#0284C7'
  },
  {
    id: 'dark-academia',
    name: 'Dark Academia',
    description: 'Deep obsidian night mode with gold highlights and low eye strain',
    bgMain: '#0F1115',
    bgSurface: '#181A20',
    bgSurfaceSubtle: '#222631',
    borderSubtle: '#2C3140',
    borderStrong: '#3E4559',
    textPrimary: '#F3F4F6',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    accentPrimary: '#F4C430',
    isDark: true
  }
];

const THEME_STORAGE_KEY = 'syncademic_background_theme_v1';

export function getActiveTheme(): ThemePalette {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.bgMain) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read saved theme palette:', e);
  }
  return THEME_PRESETS[0];
}

export function applyTheme(palette: ThemePalette): void {
  try {
    const root = document.documentElement;
    root.style.setProperty('--bg-main', palette.bgMain);
    root.style.setProperty('--bg-surface', palette.bgSurface);
    root.style.setProperty('--bg-surface-subtle', palette.bgSurfaceSubtle);
    root.style.setProperty('--border-subtle', palette.borderSubtle);
    root.style.setProperty('--border-strong', palette.borderStrong);
    root.style.setProperty('--text-primary', palette.textPrimary);
    root.style.setProperty('--text-secondary', palette.textSecondary);
    root.style.setProperty('--text-muted', palette.textMuted);
    root.style.setProperty('--accent-primary', palette.accentPrimary);

    document.body.style.backgroundColor = palette.bgMain;
    document.body.style.color = palette.textPrimary;

    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(palette));
    window.dispatchEvent(new CustomEvent('syncademic-theme-change', { detail: palette }));
  } catch (err) {
    console.error('Error applying theme palette:', err);
  }
}
