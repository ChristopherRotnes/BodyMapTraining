import { useTheme } from '../theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'g10' ? 'g100' : 'g10')}
      aria-label="Toggle color theme"
      style={{
        height: 48,
        padding: '0 16px',
        border: 'none',
        background: 'transparent',
        color: 'var(--cds-text-primary)',
        cursor: 'pointer',
        fontFamily: 'var(--cds-font-sans)',
        fontSize: '0.875rem',
      }}
    >
      {theme === 'g10' ? 'Dark mode' : 'Light mode'}
    </button>
  );
}
