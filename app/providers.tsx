'use client'

import { Provider } from 'react-redux'
import { store } from './store/store'
import { useContext, useEffect } from 'react'
import { clearCart, hydrate } from './store/cartSlice'
import AuthContext from './context/AuthContext'

function CartHydrator() {
  const { user, checked } = useContext(AuthContext)

  useEffect(() => {
    if (!checked) return

    const key = user ? `cart_${user.id}` : 'cart_guest'

    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        store.dispatch(hydrate(JSON.parse(raw)))
      } else {
        store.dispatch(clearCart())
      }
    } catch { }

    const unsubscribe = store.subscribe(() => {
      try {
        localStorage.setItem(key, JSON.stringify(store.getState().cart))
      } catch { }
    })

    return () => unsubscribe()
  }, [user?.id, checked])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <CartHydrator />
      {children}
    </Provider>
  )
}
