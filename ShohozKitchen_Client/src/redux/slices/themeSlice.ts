import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

    // Mode
    darkMode: boolean;
}

const defaultTheme: ThemeConfig = {
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
    fontFamily: "'Roboto', sans-serif",
    headingFont: "'Roboto', sans-serif",
    darkMode: false,
};

interface ThemeState {
    config: ThemeConfig;
    isLoading: boolean;
}

const initialState: ThemeState = {
    config: defaultTheme,
    isLoading: false,
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        updateTheme: (state, action: PayloadAction<Partial<ThemeConfig>>) => {
            state.config = { ...state.config, ...action.payload };
        },

        resetTheme: (state) => {
            state.config = defaultTheme;
        },

        toggleDarkMode: (state) => {
            state.config.darkMode = !state.config.darkMode;

            if (state.config.darkMode) {
                state.config.backgroundColor = '#0F172A';
                state.config.surfaceColor = '#1E293B';
                state.config.textPrimary = '#F8FAFC';
                state.config.textSecondary = '#CBD5E1';
                state.config.textMuted = '#64748B';
            } else {
                state.config.backgroundColor = '#FFFFFF';
                state.config.surfaceColor = '#F8FAFC';
                state.config.textPrimary = '#1E293B';
                state.config.textSecondary = '#4B5966';
                state.config.textMuted = '#94A3B8';
            }
        },

        setThemeFromAPI: (state, action: PayloadAction<Partial<ThemeConfig>>) => {
            state.config = { ...defaultTheme, ...action.payload };
            state.isLoading = false;
        },

        setThemeLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
    },
});

export const {
    updateTheme,
    resetTheme,
    toggleDarkMode,
    setThemeFromAPI,
    setThemeLoading
} = themeSlice.actions;

export { defaultTheme };
export default themeSlice.reducer;
