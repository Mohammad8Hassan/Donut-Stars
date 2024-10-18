'use client'
import Image from "next/image";
import logoBanner from '../public/logobanner3.png';
import fresh6 from "../public/fresh6.jpg"
import donutList from "@/donut-list";
import work from '../public/job.jpg'
import footer from '../public/bannerTrans.png'
import { MdPhoneInTalk as Phone } from 'react-icons/md'
import { MdEmail as Email } from 'react-icons/md'
import { MdLocationOn as Location } from 'react-icons/md'
import Link from 'next/link'
import Section from "./components/Section";
import { useEffect, useState } from "react";

export default function Home() {
  
  const [selectedDonut, setSelectedDonut] = useState<number>(0);

  const generateDonutList = () => {
    return (
      <ul className="whitespace-nowrap h-full flex items-center gap-x-4">
        {donutList.map(donutItem => {
          let selected = selectedDonut == donutItem.id;
          return (
          <li className="h-full w-1/4 flex-shrink-0" key={donutItem.id}
            style={{}}
            onMouseEnter={() => setSelectedDonut(donutItem.id)} onMouseLeave={() => setSelectedDonut(0)}
          >
            <div className="h-full transition-all duration-300 "
              style={{ paddingLeft: selected ? "40px" : "0px", paddingRight: selected ? "40px" : "0px" }}
            >
              <div className={`h-full flex flex-col items-center ${selected ? 'shadow-none' : 'shadoweded'} xs:rounded-xl gap-y-2`}>
                <Image src={donutItem.image} alt="chocolate" quality={100}
                  style={{ height:selected?"50%":"75%", }}
                  className="object-contain transition-all duration-300" 
                />

                <pre style={{ }} className="text-center">{ donutItem.name }</pre>

                {selected ? (
                  <text style={{ whiteSpace:"normal" }} className="text-center">{donutItem.discription}</text>
                ) : null}
                
              </div>
            </div>
          </li>
        )})}
      </ul>
    )
  }

  useEffect(() => {
    console.log("selectedDonut: ", selectedDonut)
  }, [selectedDonut])

  return (
    <main className="min-h-full flex flex-col lg:mx-[8%] bg-white main-shadow">
      
      {/* Header */}
      {/* <div className="xs:max-h-[500px] xs:min-h-0 h-[200px] xs:h-auto ">
        <Image src={logoBanner} alt="logoBanner" width={undefined} quality={100}
        className="h-full object-cover" />
      </div> */}

      {/* Fresh-Order */}
      <Section imageSrc={fresh6}>
        <h1 className="mb-3 text-center">Our donuts are freshly baked every day to ensure the perfect balance of softness and flavor 
          in every bite. We take pride in using only the finest ingredients, so you can enjoy donuts that are always warm, 
          fluffy, and delicious. Whether you’re craving something classic or a unique flavor, our freshly baked donuts are 
          the ultimate treat!
        </h1>
        
        <Link href={'/buy'}>
          <div
            className="bg-items p-3 mt-6 rounded-md shadow-md hover:bg-orange-400 hover:shadow-xl">
            <p className="text-xl">Get Donuts</p>
          </div>
        </Link>
      </Section>

      {/* donuts */}
      <div className="sm:max-h-[500px] sm:h-[500px] flex flex-col my-5 xs:my-0">
        <h1 className="mx-auto mt-10">Discover our collection</h1>
        <div className="h-full xs:rounded-xl p-3 overflow-x-scroll overflow-y-clip">
          {generateDonutList()}
        </div>
      </div>

      {/* jobs */}
      <Section imageSrc={work} title="Want to join us?">
        <div className="flex flex-auto flex-col items-center justify-center h-[150px] xs:h-auto">
          <h1 className="mb-3">Freshly baked daily</h1>
          <h2>New sensations..</h2>
        </div>
      </Section>

      {/* footer */}
      <div className="flex xs:mt-20 my-0 lg:min-h-[450px] footer-bg">

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
