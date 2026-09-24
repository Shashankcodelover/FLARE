import { useState, useEffect, useMemo, useCallback } from 'react';
import { TRANSLATIONS, LANG_LIST, translate } from '../i18n/locales';
import type { Language } from '../i18n/locales';
import { API_URL } from '../config';

export type ThemeMode = 'light' | 'dark' | 'contrast' | 'glass';
export type TextSize = 'sm' | 'md' | 'lg';
export type UserRole = 'admin' | 'coordinator' | 'field_agent' | 'responder' | 'viewer';

// Re-export i18n types and constants so existing consumers don't break
export type { Language };
export { TRANSLATIONS, LANG_LIST };

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('mirage_theme') as ThemeMode) || 'light';
  });

  const [textSize, setTextSize] = useState<TextSize>(() => {
    return (localStorage.getItem('mirage_text_size') as TextSize) || 'md';
  });

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('mirage_lang') as Language) || 'en';
  });

  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('mirage_role') as UserRole) || 'coordinator';
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mirage_token');
  });

  // Sync theme with HTML document element classes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'contrast');
    if (themeMode === 'dark' || themeMode === 'glass') {
      root.classList.add('dark');
    } else if (themeMode === 'contrast') {
      root.classList.add('contrast');
    }
  }, [themeMode]);

  // Automatically fetch token when role changes
  useEffect(() => {
    if (userRole === 'viewer') {
      setToken(null);
      localStorage.removeItem('mirage_token');
      return;
    }
    
    fetch(`${API_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub: `user_${userRole}`,
        role: userRole,
        secret: import.meta.env.VITE_AUTH_SECRET ?? 'change_me_in_production',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('mirage_token', data.token);
        }
      })
      .catch((err) => console.error('Auto-auth failed:', err));
  }, [userRole]);

  // Detect low-end devices or browsers without backdrop-filter support
  useEffect(() => {
    const hasBackdropFilter = CSS.supports('backdrop-filter', 'blur(15px)');
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!hasBackdropFilter || (isMobile && hardwareConcurrency <= 2)) {
      setIsLowEndDevice(true);
    }
  }, []);

  // Haptic feedback triggers using standard Web Vibration API
  const triggerHaptic = useCallback((pattern: 'sos' | 'success' | 'warning' | 'tap') => {
    if (typeof window === 'undefined' || !navigator.vibrate) return;
    
    switch (pattern) {
      case 'sos':
        navigator.vibrate([100, 50, 100, 50, 100]); // SOS beacon
        break;
      case 'success':
        navigator.vibrate([15]);
        break;
      case 'warning':
        navigator.vibrate([200, 100, 200]);
        break;
      case 'tap':
        navigator.vibrate([8]);
        break;
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      // Cycle: light -> dark -> contrast -> light
      let nextMode: ThemeMode;
      if (prev === 'light') nextMode = 'dark';
      else if (prev === 'dark' || prev === 'glass') nextMode = 'contrast';
      else nextMode = 'light';

      localStorage.setItem('mirage_theme', nextMode);
      return nextMode;
    });
    triggerHaptic('success');
  }, [triggerHaptic]);

  const changeThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('mirage_theme', mode);
    triggerHaptic('success');
  }, [triggerHaptic]);

  const changeTextSize = useCallback((size: TextSize) => {
    setTextSize(size);
    localStorage.setItem('mirage_text_size', size);
    triggerHaptic('success');
  }, [triggerHaptic]);

  const changeLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('mirage_lang', newLang);
    triggerHaptic('success');
  }, [triggerHaptic]);

  const changeRole = useCallback((newRole: UserRole) => {
    setUserRole(newRole);
    localStorage.setItem('mirage_role', newRole);
    triggerHaptic('success');
  }, [triggerHaptic]);

  const t = useCallback((key: string): string => {
    return translate(lang, key);
  }, [lang]);

  // Backward compatibility style bag for legacy components
  const styles = useMemo(() => {
    const baseFontSize = textSize === 'sm' ? '12px' : textSize === 'md' ? '14px' : '16px';
    const isContrast = themeMode === 'contrast';
    const isLight = themeMode === 'light';
    
    return {
      fontSize: baseFontSize,
      fontFamily: isContrast ? '"Courier New", Courier, monospace' : 'var(--font-inter)',
      appBg: 'var(--bg-canvas)',
      textColor: 'var(--text-primary)',
      borderColor: isContrast ? '#00ff00' : isLight ? 'rgba(203, 213, 225, 0.8)' : 'rgba(255, 255, 255, 0.12)',
      borderWidth: isContrast ? '2px' : '1px',
      
      // Panel styling
      panelBg: 'var(--glass-bg)',
      panelBackdrop: isLowEndDevice || isContrast ? 'none' : 'var(--glass-blur)',
      
      // Buttons
      btnPrimaryBg: isContrast ? 'transparent' : '#2563eb',
      btnPrimaryColor: isContrast ? '#00ff00' : '#ffffff',
      btnPrimaryBorder: isContrast ? '2px solid #00ff00' : '1px solid #2563eb',
      
      btnDangerBg: isContrast ? 'transparent' : '#dc2626',
      btnDangerColor: isContrast ? '#ff3333' : '#ffffff',
      btnDangerBorder: isContrast ? '2px solid #ff3333' : '1px solid #dc2626',

      headerBg: 'var(--glass-bg)',
      statsBarBg: isContrast ? '#000000' : isLight ? '#f8fafc' : '#040e1c',
      
      glowColor: isContrast ? 'rgba(0, 255, 0, 0.6)' : isLight ? 'rgba(234, 88, 12, 0.3)' : 'rgba(56, 189, 248, 0.5)',
      
      glowShadow: isContrast 
        ? '0 0 10px #00ff00' 
        : isLight
        ? '0 10px 30px rgba(15, 23, 42, 0.08)'
        : '0 10px 30px rgba(0, 0, 0, 0.4)',
    };
  }, [themeMode, textSize, isLowEndDevice]);

  return {
    themeMode,
    textSize,
    lang,
    userRole,
    token,
    isLowEndDevice,
    toggleTheme,
    changeThemeMode,
    changeTextSize,
    changeLanguage,
    changeRole,
    triggerHaptic,
    t,
    styles,
  };
}

export type ThemeHook = ReturnType<typeof useTheme>;
