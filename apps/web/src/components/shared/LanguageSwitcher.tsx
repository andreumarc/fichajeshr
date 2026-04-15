'use client';
import { useTranslation } from 'react-i18next';
import { LANG_KEY } from '@/lib/i18n';

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'ca', label: 'CA' },
  { code: 'gl', label: 'GL' },
  { code: 'en', label: 'EN' },
];

interface LanguageSwitcherProps {
  /** 'light' for dark backgrounds (sidebars), 'dark' for light backgrounds (topbars) */
  variant?: 'light' | 'dark';
}

export default function LanguageSwitcher({ variant = 'dark' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_KEY, code);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {LANGUAGES.map((lang) => {
        const isActive = i18n.language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            title={lang.label}
            className={[
              'px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors',
              variant === 'light'
                ? isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                : isActive
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
            ].join(' ')}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}
