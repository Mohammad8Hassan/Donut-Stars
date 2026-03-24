'use client'

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BoxBuilder from "../components/BoxBuilder";
import MenuItem from "../components/MenuItem";
import QuantitySelector from "../components/QuantitySelector";
import QuantitySelectorBox from "../components/QuantitySelectorBox";
import { IBoxItem, ICartItem, IItem } from "@/types";

type MenuResponse = {
  donuts: IItem[];
  drinks: IItem[];
  boxes: IBoxItem[];
};

export default function Buy() {
  // Holds live menu data coming from `/api/menu`.
  const [menu, setMenu] = useState<MenuResponse>({
    donuts: [],
    drinks: [],
    boxes: [],
  });

  // Basic loading/error state for API fetch.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Box builder modal state.
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<'build' | 'remove' | 'edit'>('build')
  const [selectedBox, setSelectedBox] = useState<ICartItem>();

  // Clicking card plus now opens the same remove/manage modal.
  const handleBoxSelected = (boxItem:IBoxItem) => {
    console.log("[Buy] open builder in remove mode", boxItem)
    setBuilderMode("remove")
    setSelectedBox({ ...boxItem, quantity: 1 })
    setIsBuilderOpen(true)
  }

  // Existing row minus/edit operations also reuse the same modal instance.
  const handleBoxRemoved = (boxItem: IBoxItem) => {
    console.log("[Buy] open builder in remove mode", boxItem)
    setBuilderMode("remove")
    setSelectedBox({ ...boxItem, quantity: 1 })
    setIsBuilderOpen(true)
  }

  // Donuts section renderer from DB-backed menu state.
  const generateDonutList = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 h-full w-full pb-8 "
        style={{ gridTemplateRows:"repeat(4, minmax(0,250px)"}}
      >
        {menu.donuts.map(donutItem => (
          <MenuItem key={donutItem.id} item={donutItem}>
            <QuantitySelector item={donutItem} />
          </MenuItem>
        ))}
      </div>
    )
  }

  // Drinks section renderer from DB-backed menu state.
  const generateDrinksList = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 h-full w-full pb-8"
        style={{ gridTemplateRows: "repeat(4, minmax(0,250px" }}
      >
        {menu.drinks.map(drinkItem => (
          <MenuItem key={drinkItem.id} item={drinkItem} >
            <QuantitySelector item={drinkItem} />
          </MenuItem>
        ))}
      </div>
    )
  }

  // Boxes now open BoxBuilder in remove-mode first for add/edit/decrease/increase workflow.
  const generateBoxList = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 h-full w-full pb-8"
        style={{ gridTemplateRows: "repeat(4, minmax(0,250px" }}
      >
        {menu.boxes.map(boxItem => (
          <MenuItem key={boxItem.id} item={boxItem} >
            <QuantitySelectorBox item={boxItem} handleBoxSelected={handleBoxSelected} handleBoxRemoved={handleBoxRemoved} />
          </MenuItem>
        ))}
      </div>
    )
  }

  // Keep a quick trace when builder mode changes.
  useEffect(() => {
    console.log("[Buy] builderMode ->", builderMode)
  }, [builderMode])

  // Fetch menu from the API instead of local list files.
  useEffect(() => {
    let isActive = true;

    const loadMenu = async () => {
      try {
        setIsLoading(true)
        console.log("[Buy] Fetching menu from /api/menu...");

        const response = await fetch('/api/menu');

        console.log("[Buy] /api/menu response status:", response.status);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Menu request failed with status ${response.status}: ${errorBody}`);
        }

        const payload = await response.json() as MenuResponse;

        console.log("[Buy] Menu payload received:", {
          donuts: payload.donuts.length,
          drinks: payload.drinks.length,
          boxes: payload.boxes.length,
        });
        console.log("[Buy] Menu sample", {
          firstDonut: payload.donuts[0],
          firstDrink: payload.drinks[0],
          firstBox: payload.boxes[0],
        });

        if (isActive) {
          setMenu(payload)
          setError(null)
        }
      } catch (error: any) {
        const message = error?.message || "Failed to load menu";
        console.error("[Buy] loadMenu error:", message);

        if (isActive) {
          setError(message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
          console.log("[Buy] menu fetch completed");
        }
      }
    }

    loadMenu()

    return () => {
      isActive = false
    }
  }, [])


  return (
    <main className="flex flex-col pt-2 lg:px-5 gap-2 h-full w-full  bg-white">

      {selectedBox &&
        <BoxBuilder boxItem={selectedBox} isOpen={isBuilderOpen} onClose={() => {setIsBuilderOpen(false)}}
          mode={builderMode} setBuilderMode={setBuilderMode} setSelectedBox={setSelectedBox}
        />
      }

      <div className="flex h-full w-full">
        {isLoading ? (
          <p>Loading menu...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
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
        )}
      </div>

    </main>
  )
}
