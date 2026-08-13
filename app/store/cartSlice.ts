// /store/cartSlice.ts
import { ICartItem } from '@/types'
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
      // console.log("[cartSlice.addItem] payload", item)

      // Existing behavior (single-row by id) stays only for non-box menu items.
      // For boxes we always keep each instance separate so users can add duplicates
      // with different composition and control each row via edit/remove.
      const idx = state.items.findIndex(
        i => i.id === item.id
      )

      if (idx >= 0 && !item.boxID) {
        state.items[idx].quantity += item.quantity
        // console.log("[cartSlice.addItem] merged quantity", {
        //   id: item.id,
        //   newQuantity: state.items[idx].quantity
        // })
      } else {
        state.items.push(item)
        // console.log("[cartSlice.addItem] inserted new item", { id: item.id, name: item.name })
      }

      // console.log("[cartSlice] cart after addItem:", JSON.stringify(state.items))
    },
    updateItemByBoxID(state, action: PayloadAction<{boxID: string; updated: Partial<ICartItem>}>) {
      const {boxID, updated} = action.payload
      // console.log("[cartSlice.updateItemByBoxID] payload", action.payload)
      const idx = state.items.findIndex(i => i.boxID == boxID)
      if(idx >= 0) {
        state.items[idx] = {
          ...state.items[idx],
          ...updated
        }
        // console.log("[cartSlice] cart after updateItemByBoxID:", state.items)
      } else {
        console.warn(`No item found with boxID ${boxID}`)
      }
    },
    removeItem(state, action: PayloadAction<{ id: string }>) {
      // console.log("[cartSlice.removeItem] payload", action.payload)
      state.items = state.items.filter(
        i => !(i.id === action.payload.id)
      )
      // console.log("[cartSlice] cart after removeItem:", state.items)
    },
    removeBoxItem(state, action: PayloadAction<{ boxID: string }>) {
      // console.log("[cartSlice.removeBoxItem] payload", action.payload)
      // Remove only the exact box instance, not every box of same size.
      state.items = state.items.filter(
        i => !(i.boxID === action.payload.boxID)
      )
      // console.log("[cartSlice] cart after removeBoxItem:", state.items)
    },
    removeStrays(state) {
      state.items = state.items.filter(
        i => (i.boxID)
      )
      // console.log("[cartSlice.removeStrays] cart cleaned:", state.items)
    },
    setQuantity(state, action: PayloadAction<{ id: string; quantity: number; boxID?: string; options?: Record<string, string> }>) {
      const { id, quantity, boxID } = action.payload
      // console.log("[cartSlice.setQuantity] payload", action.payload)

      // For normal items, target by id. For boxes, target by unique boxID.
      const idx = typeof boxID === 'string'
        ? state.items.findIndex(i => i.boxID === boxID)
        : state.items.findIndex(i => i.id === id)

      if (idx >= 0) {
        if (quantity <= 0) {
          // console.log("[cartSlice.setQuantity] removing because quantity <= 0", { id })
          state.items.splice(idx, 1)
        } else {
          state.items[idx].quantity = quantity
          // console.log("[cartSlice.setQuantity] updated quantity", { id, newQuantity: quantity })
        }
      } else {
        console.warn("[cartSlice.setQuantity] item not found", { id })
      }
      // console.log("[cartSlice] cart after setQuantity:", state.items)
    },
    clearCart(state) {
      state.items = []
      // console.log("[cartSlice.clearCart] cart emptied")
    },
    hydrate(state, action: PayloadAction<CartState>) {
      // console.log("[cartSlice.hydrate] loading saved cart", action.payload)
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
