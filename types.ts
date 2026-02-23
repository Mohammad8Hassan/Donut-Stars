export interface IItem  {
  id: string,
  name: string,
  image: string,
  price: number,
  tint?: string,
  discription: string,
}

export interface IBoxItem extends IItem {
  size: 3 | 6 | 12
  contents?: IItem[]
}

export interface ICartItem extends IItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  contents?: IItem[]
  boxID?: string
  size?: 3 | 6 | 12
}