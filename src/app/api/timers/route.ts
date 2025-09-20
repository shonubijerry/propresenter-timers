import { Timer } from '@/app/interfaces/time'
import { convertTimeToSeconds } from '@/lib/formatter'
import { NextResponse } from 'next/server'

export async function GET() {
  return await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_PROPRESENTER_BASE_URL}/v1/timers?chunked=false`,
      {
        cache: 'no-store',
        headers: {
          accept: 'application/json',
        },
      }
    ),
    fetch(
      `${process.env.NEXT_PUBLIC_PROPRESENTER_BASE_URL}/v1/timers/current?chunked=false`,
      {
        cache: 'no-store',
        headers: {
          accept: 'application/json',
        },
      }
    ),
  ]).then(async ([resp1, resp2]) => {
    const resp1Data = (await resp1.json()) as Timer[]
    const resp2Data = (await resp2.json()) as Timer[]

    const map = new Map()
    resp2Data.forEach((item) => {
      item.remainingSeconds = convertTimeToSeconds(item.time)
      map.set(item.id.uuid, item)
    })

    return NextResponse.json(
      resp1Data.map((item1) => {
        const matchingItem2 = map.get(item1.id.uuid)
        return { ...item1, ...matchingItem2 }
      })
    )
  })
}

export async function POST(_: Request) {
  return fetch(`${process.env.NEXT_PUBLIC_PROPRESENTER_BASE_URL}/v1/timers`, {
    method: 'POST',
    body: JSON.stringify(await _.json()),
    headers: { 'Content-Type': 'application/json' },
  })
}
