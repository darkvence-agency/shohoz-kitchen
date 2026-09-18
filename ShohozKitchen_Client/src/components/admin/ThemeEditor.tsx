"use client";

import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch, updateTheme, resetTheme, toggleDarkMode } from '@/redux';

const ThemeEditor: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useAppSelector(state => state.theme.config);

    // Apply theme to CSS variables
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', theme.primaryColor);
        root.style.setProperty('--color-secondary', theme.secondaryColor);
        root.style.setProperty('--color-accent', theme.accentColor);
        root.style.setProperty('--color-background', theme.backgroundColor);
        root.style.setProperty('--color-surface', theme.surfaceColor);
        root.style.setProperty('--color-text-primary', theme.textPrimary);
        root.style.setProperty('--color-text-secondary', theme.textSecondary);
        root.style.setProperty('--color-text-muted', theme.textMuted);

        // Update utility classes
        const style = document.createElement('style');
        style.id = 'dynamic-theme';
        style.innerHTML = `
      .cp { color: ${theme.primaryColor} !important; }
      .ct { color: ${theme.secondaryColor} !important; }
      .bgp { background-color: ${theme.primaryColor} !important; }
      .ts { color: ${theme.secondaryColor} !important; }
    `;

        // Remove old style if exists
        const oldStyle = document.getElementById('dynamic-theme');
        if (oldStyle) oldStyle.remove();
        document.head.appendChild(style);
    }, [theme]);

    const handleColorChange = (key: string, value: string) => {
        dispatch(updateTheme({ [key]: value }));
    };

    const colorInputs = [
        { key: 'primaryColor', label: 'Primary Color', description: 'Main brand color (buttons, links)' },
        { key: 'secondaryColor', label: 'Secondary Color', description: 'Secondary text, headers' },
        { key: 'accentColor', label: 'Accent Color', description: 'Sale badges, notifications' },
        { key: 'backgroundColor', label: 'Background Color', description: 'Page background' },
        { key: 'surfaceColor', label: 'Surface Color', description: 'Card backgrounds, inputs' },
        { key: 'textPrimary', label: 'Text Primary', description: 'Main text color' },
        { key: 'textSecondary', label: 'Text Secondary', description: 'Subtitle, muted text' },
        { key: 'successColor', label: 'Success Color', description: 'Success messages' },
        { key: 'warningColor', label: 'Warning Color', description: 'Warning messages' },
        { key: 'errorColor', label: 'Error Color', description: 'Error messages' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-24">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Theme Customization</h1>
                    <p className="text-gray-600 mt-2">Customize your store's appearance</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Settings Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Colors */}
                        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-md bgp flex items-center justify-center text-white font-bold">🎨</span>
                                Colors
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {colorInputs.map(input => (
                                    <div key={input.key} className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            {input.label}
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={(theme as any)[input.key]}
                                                onChange={(e) => handleColorChange(input.key, e.target.value)}
                                                className="w-12 h-12 rounded-md cursor-pointer border-2 border-gray-200"
                                            />
                                            <div>
                                                <input
                                                    type="text"
                                                    value={(theme as any)[input.key]}
                                                    onChange={(e) => handleColorChange(input.key, e.target.value)}
                                                    className="w-28 px-3 py-2 border rounded-md text-sm font-mono"
                                                />
                                                <p className="text-xs text-gray-400 mt-1">{input.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Typography */}
                        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center text-white font-bold">Aa</span>
                                Typography
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Font Family
                                    </label>
                                    <select
                                        value={theme.fontFamily}
                                        onChange={(e) => dispatch(updateTheme({ fontFamily: e.target.value, headingFont: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="'Roboto', sans-serif">Roboto</option>
                                        <option value="'Poppins', sans-serif">Poppins</option>
                                        <option value="'Inter', sans-serif">Inter</option>
                                        <option value="'Open Sans', sans-serif">Open Sans</option>
                                        <option value="'Nunito', sans-serif">Nunito</option>
                                        <option value="'Montserrat', sans-serif">Montserrat</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dark Mode */}
                        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-md bg-gray-800 flex items-center justify-center text-white">🌙</span>
                                Dark Mode
                            </h2>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Enable Dark Mode</p>
                                    <p className="text-sm text-gray-400">Switch to dark theme</p>
                                </div>
                                <button
                                    onClick={() => dispatch(toggleDarkMode())}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${theme.darkMode ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${theme.darkMode ? 'translate-x-8' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => dispatch(resetTheme())}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
                            >
                                Reset to Default
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.setItem('megashop-theme', JSON.stringify(theme));
                                    alert('Theme saved successfully!');
                                }}
                                className="px-6 py-3 bgp text-white rounded-md font-medium hover:opacity-90 transition-opacity"
                            >
                                Save Theme
                            </button>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 sticky top-8">
                            <h2 className="text-xl font-semibold mb-6">Live Preview</h2>

                            {/* Preview Card */}
                            <div
                                className="rounded-md p-4 mb-4"
                                style={{ backgroundColor: theme.surfaceColor }}
                            >
                                <div
                                    className="w-16 h-16 rounded-md mb-3 flex items-center justify-center text-2xl"
                                    style={{ backgroundColor: theme.primaryColor }}
                                >
                                    🛍️
                                </div>
                                <h3
                                    className="font-semibold mb-1"
                                    style={{ color: theme.textPrimary }}
                                >
                                    Sample Product
                                </h3>
                                <p
                                    className="text-sm mb-2"
                                    style={{ color: theme.textSecondary }}
                                >
                                    Electronics
                                </p>
                                <div className="flex gap-2 items-center">
                                    <span
                                        className="font-bold"
                                        style={{ color: theme.primaryColor }}
                                    >
                                        ৳2,499
                                    </span>
                                    <span
                                        className="text-sm line-through"
                                        style={{ color: theme.textMuted }}
                                    >
                                        ৳3,999
                                    </span>
                                </div>
                            </div>

                            {/* Preview Buttons */}
                            <div className="space-y-3">
                                <button
                                    className="w-full py-2 rounded-md text-white font-medium"
                                    style={{ backgroundColor: theme.primaryColor }}
                                >
                                    Primary Button
                                </button>
                                <button
                                    className="w-full py-2 rounded-md text-white font-medium"
                                    style={{ backgroundColor: theme.secondaryColor }}
                                >
                                    Secondary Button
                                </button>
                                <button
                                    className="w-full py-2 rounded-md text-white font-medium"
                                    style={{ backgroundColor: theme.accentColor }}
                                >
                                    Accent Button
                                </button>
                            </div>

                            {/* Status Colors */}
                            <div className="mt-4 flex gap-2">
                                <span
                                    className="px-3 py-1 rounded-md text-white text-xs"
                                    style={{ backgroundColor: theme.successColor }}
                                >
                                    Success
                                </span>
                                <span
                                    className="px-3 py-1 rounded-md text-white text-xs"
                                    style={{ backgroundColor: theme.warningColor }}
                                >
                                    Warning
                                </span>
                                <span
                                    className="px-3 py-1 rounded-md text-white text-xs"
                                    style={{ backgroundColor: theme.errorColor }}
                                >
                                    Error
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeEditor;
