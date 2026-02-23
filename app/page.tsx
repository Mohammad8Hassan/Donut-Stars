'use client'
import Image from "next/image";
import logoBanner from '../public/logobanner3.png';
import mangoBanner from '../public/mangobannerts.png';
import banner2 from '../public/bannerItem1.png';
import banner3 from '../public/bannerItem2shadow.png';
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
import { useMediaQuery } from "@react-hook/media-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
// import './globals.css'


export default function Home() {
  
  const [selectedDonut, setSelectedDonut] = useState<string>("");

  // const generateDonutList = () => {
  //   return (
  //     <ul className="whitespace-nowrap h-full flex items-center gap-x-4">
  //       {donutList.map(donutItem => {
  //         let selected = selectedDonut == donutItem.id;
  //         return (
  //         <li className="h-full w-1/4 flex-shrink-0" key={donutItem.id}
  //           style={{}}
  //           onMouseEnter={() => setSelectedDonut(donutItem.id)} onMouseLeave={() => setSelectedDonut(0)}
  //         >
  //           <div className="h-full transition-all duration-300 "
  //             // style={{ paddingLeft: selected ? "40px" : "0px", paddingRight: selected ? "40px" : "0px" }}
  //             style={{ 
  //               backgroundImage: selected ? `radial-gradient(${donutItem.tint} 5%, white 50%)` : "none",
  //               backgroundPosition:"center", backgroundRepeat:"no-repeat"
  //             }}
  //           >
  //             <div className={
  //               `h-full flex flex-col items-center 
                
  //               xs:rounded-xl gap-y-2`}>
  //               <Image src={donutItem.image} alt="chocolate" quality={100}
  //                 style={{ height:selected?"50%":"75%", }}
  //                 className="object-contain transition-all duration-300" 
  //               />

  //               <text style={{ }} className="text-center text">{ donutItem.name }</text>

  //               {selected ? (
  //                 <text style={{ whiteSpace:"normal" }} className="text-center">{donutItem.discription}</text>
  //               ) : null}
                
  //             </div>
  //           </div>
  //         </li>
  //       )})}
  //     </ul>
  //   )
  // }
  
  const displayCarousel = () => {
    return(
      <Carousel className="w-full h-full mx-10" style={{}}>
        <CarouselContent className="m-0 h-full" style={{ }}>
          {donutList.map((donutItem,index) => {
            let selected = selectedDonut == donutItem.id;
            return (
            <CarouselItem key={donutItem.id} className={`basis-1/3 p-1 transition-all duration-300 
              `}
                style={{  }}
              onMouseEnter={() => setSelectedDonut(donutItem.id)} onMouseLeave={() => setSelectedDonut("")}
            >
              <div className={`h-full ${selected?"mx-1":""}`}
                // style={{ paddingLeft: selected ? "40px" : "0px", paddingRight: selected ? "40px" : "0px" }}
                style={{
                  backgroundImage: selected ? `radial-gradient(${donutItem.tint} 5%, white 50%)` : "none",
                  backgroundPosition: "center", backgroundRepeat: "no-repeat"
                }}
              >
                <div className={
                  `h-full flex flex-col items-center ${selected ? 'shadow-none' : 'shadoweded'} xs:rounded-xl gap-y-2`}>
                  <Image src={`/${donutItem.image}`} alt="chocolate" quality={100} width={1000} height={1000}
                    style={{ height: selected ? "50%" : "75%", width:"100%"}}
                    className="object-contain transition-all duration-300"
                  />

                  <text style={{}} className="text-center text">{donutItem.name}</text>

                  {selected ? (
                    <text style={{ whiteSpace: "normal" }} className="text-center">{donutItem.discription}</text>
                  ) : null}

                </div>
              </div>
            </CarouselItem>
          )})}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )
  }

  useEffect(() => {
    console.log("selectedDonut: ", selectedDonut)
  }, [selectedDonut])

  const [isXL, setIsXL] = useState(false);

  const query = useMediaQuery('only screen and (min-width: 1920px)');

  useEffect(() => {
    setIsXL(query);
  }, [query])

  
  return (
    <div className="min-h-full flex flex-col bg-white gap-10 px-16 pt-1" 
      style={{width:"100%"}}
    >
      
      {/* Header */}
      {/* <div className="xs:max-h-[500px] xs:min-h-0 h-[200px] xs:h-auto ">
        <Image src={logoBanner} alt="logoBanner" width={undefined} quality={100}
        className="h-full object-cover" />
      </div> */}

      {/* Fresh-Order */}
      <Section imageSrc={fresh6} height={85}>

        <div id="content" style={{ width: "100%", height: "100%", 
          background:"linear-gradient(to right, #f7f7f7, white)"}} 
          className="flex flex-row items-center justify-center overflow-clip "
        >
          <div className="" style={{ flex: '1 1 0px' }}>
            <Image src={mangoBanner} alt="freshly baked" width={undefined} quality={100}
              className="object-fit h-full"
            />
          </div>


          <div style={{ flex: '1 1 0px', height:"100%", }}
            className="overflow-clip flex flex-col items-center justify-center px-8"
          >
            <div style={{ flex: '3 1 0px', }} className="flex flex-col items-center justify-center gap-5">
              <p className={`header`} style={{ fontSize: "4vw", width:"100%", color:"green", textAlign:"center"}}>
                Mango on a Donut?
              </p>
              <p className="text" style={{ textAlign: "center" }}>
                Our donuts are freshly baked every day to ensure the perfect balance of softness and flavor
                in every bite. We take pride in using only the finest ingredients, so you can enjoy donuts that are always warm,
                fluffy, and delicious. Whether you’re craving something classic or a unique flavor, our freshly baked donuts are
                the ultimate treat!
              </p>
            </div>
            
            <Link href={'/buy'} style={{ flex: '1 1 0px',  }} className="flex flex-col items-center justify-center">
              <div
                className="bg-items p-3 rounded-md shadow-md hover:bg-orange-400 hover:shadow-xl"
              >
                <p className="text-xl">Get Donuts</p>
              </div>
            </Link>
          </div>
          
        </div>

      </Section>

      <Section imageSrc={fresh6} height={isXL ? 60 : 60}>

        <div id="content" style={{ width: "100%", height: "100%", }}
          className="flex flex-row items-center justify-center overflow-clip px-10"
        >
          {/* <div className="" style={{ flex: '1 1 0px' }}>
            <Image src={banner2} alt="freshly baked" width={undefined} quality={100}
              className="object-fit h-full"
            />
          </div> */}


          <div style={{ flex: '1 1 0px', height: "100%", }}
            className="overflow-clip flex flex-col items-center justify-center px-8"
          >
            <div style={{ flex: '3 1 0px', }} className="flex flex-col items-center justify-center gap-5">
              <p className={`header`} style={{ fontSize: "3vw", width: "100%", color: "green" , textAlign:"center"}}>
                Refreshing Summer Sips
              </p>
              <p className="text" style={{ textAlign: "center" }}>
                There's nothing better than a cold drink on a hot day. 
                That's why we serve up a variety of refreshing beverages 
                to pair with your favorite donuts. From creamy iced lattes 
                to fruity blends and sparkling coolers, our drinks are the 
                perfect way to stay cool, hydrated, and happy all summer long
              </p>
            </div>

            <Link href={'/buy'} style={{ flex: '1 1 0px', }} className="flex flex-col items-center justify-center">
              <div
                className="bg-items p-3 rounded-md shadow-md hover:bg-orange-400 hover:shadow-xl"
              >
                <p className="text-xl">Get Donuts</p>
              </div>
            </Link>
          </div>

          <div className="" style={{ flex: '1 1 0px' }}>
            <Image src={banner3} alt="freshly baked" width={undefined} quality={100}
              className="object-fit h-full"
            />
          </div>

        </div>

      </Section>

      {/* donuts */}
      <div className="w-full sm:max-h-[500px] sm:h-[500px] flex flex-col">
        <h1 className="mx-auto text" style={{ fontSize: "2vw" }} >Our Top Picks:</h1>

        {/* <div className="h-full xs:rounded-xl p-3 overflow-x-auto overflow-y-hidden">
          {generateDonutList()}
        </div> */}

        <div className="h-full xs:rounded-xl p-3 flex flex-row justify-center items-center overflow-y-hidden">
          {displayCarousel()}
        </div>
      </div>


      {/* jobs */}
      <Section imageSrc={work} height={50} mrgn={20}>
        <div className="flex flex-auto flex-col items-center justify-center h-[150px] xs:h-auto">
          <h1 className="mb-3" style={{ fontSize: "1.5vw" }}>Freshly baked daily</h1>
          <h2 style={{ fontSize: "1.5vw" }}>New sensations..</h2>
        </div>
      </Section>


      
      
    </div>
  )
}
