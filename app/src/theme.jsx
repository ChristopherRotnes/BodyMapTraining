import { useEffect, useState } from 'react';
import { ThemeCtx } from './lib/hooks';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'g100';
    const saved = localStorage.getItem('carbon-theme');
    const resolved = (saved === 'g10' || saved === 'g100')
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'g100' : 'g10');
    document.documentElement.setAttribute('data-theme', resolved);
    return resolved;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('carbon-theme', theme);
  }, [theme]);

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}
