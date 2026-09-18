"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Default theme configuration
export interface ThemeConfig {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  successColor: string;
  warningColor: string;
  errorColor: string;

  // Typography
  fontFamily: string;
  headingFont: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };

  // Spacing
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };

  // Shadows
  boxShadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

const defaultTheme: ThemeConfig = {
  // Colors
  primaryColor: '#4F46E5',
  secondaryColor: '#6366F1',
  accentColor: '#EF4444',
  backgroundColor: '#FFFFFF',
  surfaceColor: '#F8FAFC',
  textPrimary: '#1E293B',
  textSecondary: '#4B5966',
  textMuted: '#94A3B8',
  successColor: '#22C55E',
  warningColor: '#F59E0B',
  errorColor: '#EF4444',

  // Typography
  fontFamily: "'Roboto', sans-serif",
  headingFont: "'Roboto', sans-serif",
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },

  // Spacing
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
};

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from localStorage or API on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Try to load from localStorage first
        const savedTheme = localStorage.getItem('ecommerce-theme');
        if (savedTheme) {
          setTheme({ ...defaultTheme, ...JSON.parse(savedTheme) });
        }

        // TODO: Load from API for admin-saved themes
        // const response = await fetch('/api/theme');
        // const apiTheme = await response.json();
        // setTheme({ ...defaultTheme, ...apiTheme });
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;

      // Colors
      root.style.setProperty('--color-primary', theme.primaryColor);
      root.style.setProperty('--color-secondary', theme.secondaryColor);
      root.style.setProperty('--color-accent', theme.accentColor);
      root.style.setProperty('--color-background', theme.backgroundColor);
      root.style.setProperty('--color-surface', theme.surfaceColor);
      root.style.setProperty('--color-text-primary', theme.textPrimary);
      root.style.setProperty('--color-text-secondary', theme.textSecondary);
      root.style.setProperty('--color-text-muted', theme.textMuted);
      root.style.setProperty('--color-success', theme.successColor);
      root.style.setProperty('--color-warning', theme.warningColor);
      root.style.setProperty('--color-error', theme.errorColor);

      // Typography
      root.style.setProperty('--font-family', theme.fontFamily);
      root.style.setProperty('--font-heading', theme.headingFont);

      // Font sizes
      Object.entries(theme.fontSize).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value);
      });

      // Border radius
      Object.entries(theme.borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--radius-${key}`, value);
      });

      // Shadows
      Object.entries(theme.boxShadow).forEach(([key, value]) => {
        root.style.setProperty(`--shadow-${key}`, value);
      });
    }
  }, [theme]);

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    localStorage.setItem('ecommerce-theme', JSON.stringify(newTheme));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('ecommerce-theme');
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { defaultTheme };
