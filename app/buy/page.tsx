'use client'

import Image from "next/image";
import donutList from "@/donut-list";
import boxList from "@/box-list";
import drinksList from "@/drinks-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addItem, setQuantity } from "../store/cartSlice";
import { CircleMinus, CirclePlus, Trash2 } from "lucide-react";
import QuantitySelector from "../components/QuantitySelector";
import BoxBuilder from "../components/BoxBuilder";
import { useEffect, useState } from "react";
import MenuItem from "../components/MenuItem";
import QuantitySelectorBox from "../components/QuantitySelectorBox";
import { IBoxItem, ICartItem } from "@/types";

export default function Buy() {

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<'build' | 'remove' | 'edit'>('build')
  const [selectedBox, setSelectedBox] = useState<ICartItem>();
  const [selectedBoxItem, setSelectedBoxItem] = useState<IBoxItem>();

  // const [boxSize, setBoxSize] = useState<number>();

  const dispatch = useAppDispatch()
  const cart = useAppSelector(state => state.cart.items)

  const handleBoxSelected = (boxItem:IBoxItem) => {
    console.log("selected boxItem: ", boxItem)
    setBuilderMode("build")
    setSelectedBox({ ...boxItem, quantity: 1, boxID: crypto.randomUUID() })
    // setBoxSize(boxItem.size || 6)
    setIsBuilderOpen(true)
  }

  const handleBoxRemoved = (boxItem: IBoxItem) => {
    setBuilderMode("remove")
    setSelectedBox({ ...boxItem, quantity: 1 })
    // setBoxSize(boxItem.size || 6)
    setIsBuilderOpen(true)
  }
  
  const generateDonutList = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 h-full w-full pb-8 "
        style={{ gridTemplateRows:"repeat(4, minmax(0,250px)"}}
      >
        {donutList.map(donutItem => {
          

          return (
            <MenuItem item={donutItem} >
              <QuantitySelector item={donutItem} />
            </MenuItem>
        )})}
      </div>
    )
  }

  const generateDrinksList = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 h-full w-full pb-8"
        style={{ gridTemplateRows: "repeat(4, minmax(0,250px)" }}
      >
        {drinksList.map(drinkItem => (
          <MenuItem item={drinkItem} >
            <QuantitySelector item={drinkItem} />
          </MenuItem>
        ))}
      </div>
    )
  }

  const generateBoxList = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 h-full w-full pb-8"
        style={{ gridTemplateRows: "repeat(4, minmax(0,250px" }}
      >
        {boxList.map(boxItem => (
          <MenuItem item={boxItem} >
            <QuantitySelectorBox item={boxItem} handleBoxSelected={handleBoxSelected} handleBoxRemoved={handleBoxRemoved} />
          </MenuItem>
        ))}
      </div>
    )
  }

  useEffect(() => {
    console.log("cart: ", builderMode)
  }, [builderMode])


  return (
    <main className="flex flex-col pt-2 lg:px-5 gap-2 h-full w-full  bg-white">

      {selectedBox &&
        <BoxBuilder boxItem={selectedBox} isOpen={isBuilderOpen} onClose={() => {setIsBuilderOpen(false)}}
          mode={builderMode} setBuilderMode={setBuilderMode} setSelectedBox={setSelectedBox}
        />
      }
      
      <div className="flex h-full w-full">
        <Tabs defaultValue="donuts" className="w-full h-full">
          <TabsList className="w-full gap-5" style={{}}>
            <TabsTrigger className="" value="donuts">Donuts</TabsTrigger>
            <TabsTrigger value="boxes">Boxes</TabsTrigger>
            <TabsTrigger value="drinks">Drinks</TabsTrigger>
          </TabsList>

          <TabsContent className="h-full items-center justify-center" value="donuts">
            {generateDonutList()}
          </TabsContent>

          <TabsContent className="h-full items-center justify-center" value="boxes">
            {generateBoxList()}
          </TabsContent>

          <TabsContent className="h-full items-center justify-center" value="drinks">
            {generateDrinksList()}
          </TabsContent>

        </Tabs>
      </div>
      
      {/* <div className="flex border-zinc-300 border-[1px] h-full w-1/3 rounded-2xl max-h-screen">

      </div> */}


      
    </main>
  )
}


{/* donuts */ }
{/* <div className="flex flex-col my-5 xs:my-0">
        <h1 className="mr-auto my-10 ml-16">DONUTS</h1>
        <div className="xs:rounded-xl mx-5">
          {generateDonutList()}
        </div>
      </div> */}