// /store/store.ts
import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import cartReducer from './cartSlice'
import { orderApi } from './orderApi'

export const store = configureStore({
  reducer: { cart: cartReducer, [orderApi.reducerPath]: orderApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(orderApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
})

// Enables refetchOnFocus/refetchOnReconnect for RTK Query hooks.
setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
