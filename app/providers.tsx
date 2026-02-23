'use client'

import { Provider } from 'react-redux'
import { store } from './store/store'
import { useEffect } from 'react'
import { hydrate } from './store/cartSlice'
import router from 'next/router'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Rehydrate from localStorage
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('cart')
      if (raw) store.dispatch(hydrate(JSON.parse(raw)))
    } catch { }

    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      try {
        localStorage.setItem('cart', JSON.stringify(store.getState().cart))
      } catch { }
    })

    return () => unsubscribe()
  }, [])



  return <Provider store={ store }> { children } </Provider>
}
