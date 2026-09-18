import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
    cartReducer,
    authReducer,
    wishlistReducer,
    themeReducer,
    productReducer,
    uiReducer,
    savedForLaterReducer
} from './slices';

import { baseApi } from './api/baseApi';

const rootReducer = combineReducers({
    [baseApi.reducerPath]: baseApi.reducer,
    cart: cartReducer,
    auth: authReducer,
    wishlist: wishlistReducer,
    theme: themeReducer,
    products: productReducer,
    ui: uiReducer,
    savedForLater: savedForLaterReducer,
});

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(baseApi.middleware),
    devTools: process.env.NODE_ENV !== 'production',
});


// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
