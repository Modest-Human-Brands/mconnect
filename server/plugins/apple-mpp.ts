import { definePlugin } from 'nitro'

export const appleMppCidrs: string[] = []

const APPLE_MPP_CSV_URL = 'https://mask-api.icloud.com/egress-ip-ranges.csv'

async function fetchAppleIps() {
  try {
    const response = await fetch(APPLE_MPP_CSV_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const csvText = await response.text()

    const lines = csvText.split('\n')
    const parsedCidrs: string[] = []

    for (const line of lines) {
      if (!line || line.trim() === '') continue
      const [cidr] = line.split(',')
      if (cidr) parsedCidrs.push(cidr.trim())
    }

    appleMppCidrs.length = 0
    appleMppCidrs.push(...parsedCidrs)

    console.log(`Successfully loaded ${appleMppCidrs.length} Apple MPP IP ranges.`)
  } catch (error) {
    console.error('Failed to fetch Apple MPP IPs:', error)
  }
}

export default definePlugin(async () => {
  await fetchAppleIps()

  setInterval(fetchAppleIps, 24 * 60 * 60 * 1000)
})
