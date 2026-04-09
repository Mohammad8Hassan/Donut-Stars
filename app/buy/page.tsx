'use client'

import { useEffect, useState } from 'react'
import { Donut, LoaderCircle, PackageOpen, RefreshCcw, CupSoda } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BoxBuilder from '../components/BoxBuilder'
import MenuItem from '../components/MenuItem'
import QuantitySelector from '../components/QuantitySelector'
import QuantitySelectorBox from '../components/QuantitySelectorBox'
import { IBoxItem, ICartItem, IItem } from '@/types'

type MenuResponse = {
  donuts: IItem[]
  drinks: IItem[]
  boxes: IBoxItem[]
}

const tabMeta = [
  {
    value: 'donuts',
    label: 'Donuts',
    description: 'Pick individual donuts and build your mix exactly how you want it.',
    icon: Donut,
  },
  {
    value: 'boxes',
    label: 'Boxes',
    description: 'Choose a box size and manage custom assortments from one flow.',
    icon: PackageOpen,
  },
  {
    value: 'drinks',
    label: 'Drinks',
    description: 'Add simple extras to round out the order.',
    icon: CupSoda,
  },
] as const

export default function Buy() {
  const [menu, setMenu] = useState<MenuResponse>({
    donuts: [],
    drinks: [],
    boxes: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<(typeof tabMeta)[number]['value']>('donuts')

  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [builderMode, setBuilderMode] = useState<'build' | 'remove' | 'edit'>('build')
  const [selectedBox, setSelectedBox] = useState<ICartItem>()

  const handleBoxSelected = (boxItem: IBoxItem) => {
    console.log('[Buy] open builder in remove mode', boxItem)
    setBuilderMode('remove')
    setSelectedBox({ ...boxItem, quantity: 1 })
    setIsBuilderOpen(true)
  }

  const handleBoxRemoved = (boxItem: IBoxItem) => {
    console.log('[Buy] open builder in remove mode', boxItem)
    setBuilderMode('remove')
    setSelectedBox({ ...boxItem, quantity: 1 })
    setIsBuilderOpen(true)
  }

  const renderGrid = (items: IItem[], kind: 'donut' | 'drink' | 'box') => {
    if (items.length === 0) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-dashed border-rose-200 bg-white px-6 text-center shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-500">
              Nothing here yet
            </p>
            <p className="mt-3 text-base text-zinc-600">
              This section is empty right now. Refresh the menu or check back in a moment.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map(item => (
          <MenuItem key={item.id} item={item}>
            {kind === 'box' ? (
              <QuantitySelectorBox
                item={item as IBoxItem}
                handleBoxSelected={handleBoxSelected}
                handleBoxRemoved={handleBoxRemoved}
              />
            ) : (
              <QuantitySelector item={item} />
            )}
          </MenuItem>
        ))}
      </div>
    )
  }

  useEffect(() => {
    console.log('[Buy] builderMode ->', builderMode)
  }, [builderMode])

  useEffect(() => {
    let isActive = true

    const loadMenu = async () => {
      try {
        setIsLoading(true)
        console.log('[Buy] Fetching menu from /api/menu...')

        const response = await fetch('/api/menu')

        console.log('[Buy] /api/menu response status:', response.status)

        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`Menu request failed with status ${response.status}: ${errorBody}`)
        }

        const payload = (await response.json()) as MenuResponse

        console.log('[Buy] Menu payload received:', {
          donuts: payload.donuts.length,
          drinks: payload.drinks.length,
          boxes: payload.boxes.length,
        })

        if (isActive) {
          setMenu(payload)
          setError(null)
        }
      } catch (error: any) {
        const message = error?.message || 'Failed to load menu'
        console.error('[Buy] loadMenu error:', message)

        if (isActive) {
          setError(message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
          console.log('[Buy] menu fetch completed')
        }
      }
    }

    loadMenu()

    return () => {
      isActive = false
    }
  }, [])

  const activeMeta = tabMeta.find(tab => tab.value === activeTab) ?? tabMeta[0]

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      <div className="absolute inset-0 " />

      {selectedBox && (
        <BoxBuilder
          boxItem={selectedBox}
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false)
          }}
          mode={builderMode}
          setBuilderMode={setBuilderMode}
          setSelectedBox={setSelectedBox}
        />
      )}

      <section className="relative mx-auto w-full max-w-[1760px] px-3 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-[38px] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,252,251,0.96)_0%,rgba(255,247,243,0.96)_100%)] shadow-[0_26px_70px_rgba(15,23,42,0.10)]">
          {isLoading ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-950 text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)]">
                <LoaderCircle className="h-7 w-7 animate-spin" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">Loading the menu</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600">
                Pulling in donuts, boxes, and drinks so the menu is ready.
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-500">
                <RefreshCcw className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">We couldn&apos;t load the menu</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{error}</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)} className="w-full">
              <div className="border-b border-rose-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff5f0_100%)] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="max-w-3xl">
                    <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                      Order Menu
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 sm:text-base">
                      {activeMeta.description}
                    </p>
                  </div>

                  <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-[28px] border-2 border-zinc-950 bg-zinc-950 p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)] xl:w-[760px]">
                    {tabMeta.map(tab => {
                      const Icon = tab.icon

                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="min-h-[72px] rounded-[22px] border border-transparent px-4 py-4 text-base font-black text-white/78 data-[state=active]:border-white data-[state=active]:bg-[linear-gradient(135deg,#fff8f5_0%,#ffffff_100%)] data-[state=active]:text-zinc-950 data-[state=active]:shadow-[0_12px_24px_rgba(255,255,255,0.14)]"
                        >
                          <span className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                            <Icon className="h-5 w-5" />
                            {tab.label}
                          </span>
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                </div>
              </div>

              <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
                <TabsContent value="donuts" className="mt-0">
                  {renderGrid(menu.donuts, 'donut')}
                </TabsContent>

                <TabsContent value="boxes" className="mt-0">
                  {renderGrid(menu.boxes, 'box')}
                </TabsContent>

                <TabsContent value="drinks" className="mt-0">
                  {renderGrid(menu.drinks, 'drink')}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </section>
    </main>
  )
}
