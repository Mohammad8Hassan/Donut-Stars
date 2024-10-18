import Image from "next/image";
import donutList from "@/donut-list";
import footer from '@/public/bannerTrans.png'
import { MdPhoneInTalk as Phone } from 'react-icons/md'
import { MdEmail as Email } from 'react-icons/md'
import { MdLocationOn as Location } from 'react-icons/md'

export default function Buy() {
  
  const generateDonutList = () => {
    return (
      <ul>
        {donutList.map(donutItem => (
          <li className="inline-block mr-2 transition-all duration-300" key={donutItem.id}>
            <div className="flex flex-col hover:shadow-2xl xs:rounded-xl">
              <Image src={donutItem.image} alt="chocolate" width={undefined} quality={100}
                className="w-auto max-h-[200px] xs:max-h-[300px] object-contain" />

              <div className="flex justify-around">
                <pre className="p-4 pt-0 text-left">{ donutItem.name }</pre>
                <pre className="p-4 pt-0 text-right">{ donutItem.price }</pre>
              </div>
              
            </div>
          </li>
        ))}
      </ul>
    )
  }



  return (
    <main className="flex flex-col lg:mx-[8%] main-shadow bg-white">
      


      {/* donuts */}
      <div className="flex flex-col my-5 xs:my-0">
        <h1 className="mr-auto my-10 ml-16">DONUTS</h1>
        <div className="xs:rounded-xl mx-5">
          {generateDonutList()}
        </div>
      </div>


      {/* footer */}
      <div className="flex xs:mt-20 mt-32 lg:min-h-[450px] footer-bg">

        <div className="flex flex-col basis-1/2 xs:p-10">
          <div className="flex flex-col">
            <h2>Contact us</h2>
            <ul className="mt-3 xs:ml-3">
              <li className="flex items-center">
                <Phone size={25} />
                <p className="ml-2">101001011</p>
              </li>
              <li className="flex items-center">
                <Email size={25} />
                <p className="ml-2">hobba@hobba.hhh</p>
              </li>
              <li className="flex items-center">
                <Location size={25} />
                <p className="ml-2">the street beside the building</p>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col mt-10">
            <h2>Follow us</h2>
            <ul>
              <li>FB</li>
              <li>X</li>
              <li>linkedin</li>
              <li>insta</li>
            </ul>
          </div>
        </div>

        <Image src={footer} alt="footerImg" width={undefined} quality={100} 
          className="w-1/2 h-auto object-cover object-left" />

      </div>
      
    </main>
  )
}
