// /store/cartSlice.ts
import { ICartItem, IItem } from '@/types'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// export type CartItem = {
//   id: string
//   name: string
//   price: number
//   image: string
//   quantity: number
//   contents?: IItem[]
// }

export type CartState = { items: ICartItem[] }

const initialState: CartState = { items: [] }

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<ICartItem>) {
      const item = action.payload
      const idx = state.items.findIndex(
        i => i.id === item.id
      )
      if (idx >= 0 && !item.id.includes("b")) {
        state.items[idx].quantity += item.quantity
      } else {
        state.items.push(item)
      }
      console.log("cart updated: ", JSON.stringify(state.items))
    },
    updateItemByBoxID(state, action: PayloadAction<{boxID: string; updated: Partial<ICartItem>}>) {
      const {boxID, updated} = action.payload
      const idx = state.items.findIndex(i => i.boxID == boxID)
      if(idx >= 0) {
        state.items[idx] = {
          ...state.items[idx],
          ...updated
        }
        console.log("cart updated (edit): ", state.items)
      } else {
        console.warn(`No item found with boxID ${boxID}`)
      }
    },
    removeItem(state, action: PayloadAction<{ id: string }>) {
      state.items = state.items.filter(
        i => !(i.id === action.payload.id)
      )
      console.log("cart updated: ", state.items)
    },
    removeBoxItem(state, action: PayloadAction<{ boxID: string }>) {
      state.items = state.items.filter(
        i => !(i.boxID === action.payload.boxID)
      )
      console.log("cart updated: ", state.items)
    },
    removeStrays(state) {
      state.items = state.items.filter(
        i => (i.boxID)
      )
      console.log("cart cleaned: ", state.items)
    },
    setQuantity(state, action: PayloadAction<{ id: string; quantity: number; options?: Record<string, string> }>) {
      const { id, quantity, } = action.payload
      const idx = state.items.findIndex(
        i => i.id === id
      )
      if (idx >= 0) {
        if (quantity <= 0) {
          state.items.splice(idx, 1) 
        } else {
          state.items[idx].quantity = quantity
        }
      }
      console.log("cart updated: ", state.items)
    },
    clearCart(state) {
      state.items = []
      console.log("cart updated: ", state.items)
    },
    hydrate(state, action: PayloadAction<CartState>) {
      return action.payload
    },
  },
})

export const { addItem, updateItemByBoxID, removeBoxItem, removeItem, setQuantity, clearCart, hydrate, removeStrays } = cartSlice.actions

export const selectCartItems = (state: { cart: CartState }) => state.cart.items
export const selectCartCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((s, i) => s + i.quantity, 0)
export const selectCartTotal = (state: { cart: CartState }) =>
  state.cart.items.reduce((s, i) => s + i.quantity * i.price, 0)

export default cartSlice.reducer
