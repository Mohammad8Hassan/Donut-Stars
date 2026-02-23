import box3 from './public/3box.png'
import box6 from './public/6box.png'
import box12 from './public/12box.png'
import { IBoxItem } from './types';

const donutList : IBoxItem[] = [
    {
        id: "b1", name: "3-Donut Box", image: "3box.png", price:34, 
        discription: "3 donuts: handpicked by you, or a random mix.",
        size:3
    },
    {
        id: "b2", name: "6-Donut Box", image: "6box.png", price: 45, 
        discription: "6 donuts: handpicked by you, or a random mix.",
        size: 6
    },
    {
        id: "b3", name: "12-Donut Box", image: "12box.png", price: 34, 
        discription: "12 donuts: handpicked by you, or a random mix.", 
        size: 12
    },
];

export default donutList;