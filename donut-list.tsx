import chocolate from './public/chocolate.png'
import strawberry from './public/strawberry.png'
import sugarcream from './public/sugarcream.png'
import strawcream from './public/strawcream.png'
import caramel from './public/caramel.png'
import mango from './public/mango.png'
import baked from './public/baked.png'
import { IItem } from './types'

const donutList: IItem[] = [
  {
    id: '1',
    name: 'Chocolate Donut',
    image: 'chocolate.png',
    price: 34,
    discription:
      'Enjoy the perfect blend of crispy and soft with our Chocolate Donut, topped with a rich, glossy glaze.',
    tint: '#CCAE97',
    tags: ['Classic'],
  },
  {
    id: '2',
    name: 'Strawberry Donut',
    image: 'strawberry.png',
    price: 45,
    discription:
      'Delight in our Strawberry Donut. Soft, fluffy, and coated in a vibrant, sweet strawberry glaze for a burst of fruity flavor.',
    tint: '#FFB3CA',
    tags: ['Fruity'],
  },
  {
    id: '3',
    name: 'Sugar Donut',
    image: 'sugarcream.png',
    price: 34,
    discription:
      'Simple, sweet, and satisfying. Our Sugar Donut is lightly dusted with a perfect coating of fine sugar for a classic, delicious treat.',
    tint: '#DED8CE',
    tags: ['Best Seller'],
  },
  {
    id: '4',
    name: 'Strawberry & Cream\nDonut',
    image: 'strawcream.png',
    price: 45,
    discription:
      'Treat yourself to our Strawberry & Cream Donut. Soft, fluffy, and topped with a sweet strawberry glaze and a creamy finish',
    tint: '',
    tags: ['Creamy'],
  },
  {
    id: '5',
    name: 'Caramel Donut',
    image: 'caramel.png',
    price: 45,
    discription:
      'Indulge in our Caramel Donut. Soft, fluffy, and drizzled with rich, golden caramel for a sweet, melt-in-your-mouth experience.',
    tint: '',
    tags: ['Rich'],
  },
  {
    id: '6',
    name: 'Mango Donut',
    image: 'mango.png',
    price: 62,
    discription:
      'Enjoy the tropical sweetness of our Mango & Cream Donut. fluffy and soft, topped with a luscious mango glaze and a creamy finish for a perfect balance of flavors.',
    tint: '',
    tags: ['Seasonal'],
  },
  {
    id: '7',
    name: 'Baked Vanilla Donut',
    image: 'baked.png',
    price: 50,
    discription:
      'Indulge in our Baked Vanilla Donut, featuring a soft, golden exterior and a creamy, smooth vanilla filling for the perfect balance of flavor and sweetness.',
    tint: '',
    tags: ['Filled'],
  },
]

export default donutList
