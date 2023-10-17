import Image from "next/image";
import logoBanner from '../public/logobanner3.png';
import fresh6 from "../public/fresh6.jpg"
import donutList from "@/donut-list";
import work from '../public/job.jpg'
import footer from '../public/bannerTrans.png'

export default function Home() {
  
  const generateDonutList = () => {
    return (
      <ul className="whitespace-nowrap">
        {donutList.map(donutItem => (
          <li className="inline-block mr-2" key={donutItem.id}>
            <div className="flex flex-col hover:bg-[#ffffffCC] xs:rounded-xl">
              <Image src={donutItem.image} alt="chocolate" width={undefined} quality={100}
                className="w-auto max-h-[200px] xs:max-h-[300px] object-contain" />

              <pre className="mx-auto p-4 text-center">{ donutItem.name }</pre>
            </div>
          </li>
        ))}
      </ul>
    )
  }



  return (
    <main className="flex flex-col lg:mx-[8%] lg:border-x-2 lg:border-x-gray-600 bg-white">
      
      {/* Header */}
      <div className="xs:max-h-[500px] xs:min-h-0 h-[200px] xs:h-auto ">
        <Image src={logoBanner} alt="logoBanner" width={undefined} quality={100}
        className="h-full object-cover" />
      </div>

      {/* Fresh-Order */}
      <div className="sm:p-10 sm:max-h-[500px] ">
        <div className="xs:rounded-xl bg-white border-orange-600 border-2 flex xs:flex-row flex-col-reverse xs:shadow-lg">

          <div className="xs:w-1/2 xs:rounded-xl lg:min-h-[400px] max-h-[400px]">
            <Image src={fresh6} alt="freshly baked" width={undefined} quality={100}
              className="xs:rounded-tl-xl xs:rounded-bl-xl h-full object-cover"
            />
          </div>
          
          <div className="flex flex-auto flex-col items-center justify-center h-[150px] xs:h-auto">
            <h1 className="mb-3">Freshly baked daily</h1>
            <h2>New sensations..</h2>
          </div>
        </div>
      </div>

      {/* donuts */}
      <div className="flex flex-col my-5 xs:my-0">
        <h1 className="mx-auto py-4">Discover our collection</h1>
        <div className="list-bg xs:rounded-xl p-3 overflow-x-auto">
          {generateDonutList()}
        </div>
      </div>

      {/* jobs */}
      <div className="flex flex-col xs:p-10 my-5 xs:my-0">
        <h1 className="mx-auto py-4">Want to join us?</h1>
        <div className="xs:rounded-xl bg-white border-orange-600 border-2 flex xs:flex-row flex-col-reverse xs:shadow-lg">

          <div className="xs:w-1/2 xs:rounded-xl lg:min-h-[400px] max-h-[400px]">
            <Image src={work} alt="freshly baked" width={undefined} quality={100}
              className="xs:rounded-tl-xl xs:rounded-bl-xl h-full object-cover work-position"
            />
          </div>
          
          <div className="flex flex-auto flex-col items-center justify-center h-[150px] xs:h-auto">
            <h1 className="mb-3">Freshly baked daily</h1>
            <h2>New sensations..</h2>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex xs:mt-20 my-0 lg:min-h-[450px] footer-bg">
        <div className="flex flex-col basis-1/2">
          <div className="flex flex-col">
            <h2>Contact us</h2>
          </div>
          
          <div className="flex flex-col">
            <h2>Follow us</h2>
          </div>
        </div>

        <Image src={footer} alt="footerImg" width={undefined} quality={100} 
          className="w-1/2 h-auto object-cover object-left" />
      </div>
      
    </main>
  )
}
