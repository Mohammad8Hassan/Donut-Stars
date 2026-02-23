import strawberry from './public/strawberryShake.jpg'
import coffee from './public/regularcoffee.jpg'
import { IItem } from './types';

const drinksList : IItem[] = [
    {
        id: "d1", name: "Strawberry Shake", image: "strawberryShake.jpg", price:34, 
        discription: "Enjoy the perfect blend of crispy and soft with our Chocolate Donut, topped with a rich, glossy glaze.",
    },
    {
        id: "d2", name: "Regular Coffee", image: "regularcoffee.jpg", price: 34,
        discription: "Enjoy the perfect blend of crispy and soft with our Chocolate Donut, topped with a rich, glossy glaze.",
    },
];

export default drinksList;