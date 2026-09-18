import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: 'user' | 'admin' | 'superadmin';
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },

        loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.isLoading = false;
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.error = null;
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('token', action.payload.token);
                    localStorage.setItem('user', JSON.stringify(action.payload.user));
                } catch {
                    /* ignore */
                }
            }
        },

        loginFailure: (state, action: PayloadAction<string>) => {
            state.isLoading = false;
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.error = action.payload;
            if (typeof window !== 'undefined') {
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                } catch {
                    /* ignore */
                }
            }
        },

        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            if (typeof window !== 'undefined') {
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                } catch {
                    /* ignore */
                }
            }
        },

        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem('user', JSON.stringify(state.user));
                    } catch {
                        /* ignore */
                    }
                }
            }
        },

        updateAddress: (state, action: PayloadAction<User['address']>) => {
            if (state.user) {
                state.user.address = action.payload;
            }
        },

        clearError: (state) => {
            state.error = null;
        },
    },
});

export const {
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    updateUser,
    updateAddress,
    clearError
} = authSlice.actions;

export default authSlice.reducer;
