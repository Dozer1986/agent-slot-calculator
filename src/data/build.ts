/** The Proxmox node build drawn on the Build page: each part, its size in mm and where that size came from.
 *  Positions inside the chassis are in `src/lib/build/layout.ts`. Sizes with no datasheet behind them say so in `note`. */
export interface BuildPart {
  id: string;
  name: string;
  /** One line of what it is. */
  spec: string;
  /** Size in mm, in the part's own terms. */
  size: string;
  source?: string;
  /** How sure the size and position are, and anything unconfirmed. */
  note?: string;
}

export const BUILD_PARTS: BuildPart[] = [
  {
    id: 'chassis',
    name: 'RackChoice 3U rackmount chassis',
    spec: '19" rack, 8 full-height slots, SFX PSU, up to a 360 mm radiator',
    size: '428 × 400 × 133 body, 482.6 wide with the ears',
    source: 'https://www.amazon.com/dp/B0CPTBMQVB',
    note: 'Outside size from the listing diagram. Inside positions (slot openings, rear vent, PSU opening) were measured off the listing photos, so they can be 10 mm out. The stock drive cage and three 120 mm fans are left out.',
  },
  {
    id: 'board',
    name: 'Gigabyte Z890 EAGLE WIFI7 PLUS',
    spec: 'LGA 1851 ATX. 4 × DDR5, PCIe 5.0 x16, 2 × PCIe 4.0 x4, 4 × M.2',
    size: '305 × 244',
    source: 'https://www.gigabyte.com/Motherboard/Z890-EAGLE-WIFI7-PLUS/sp',
    note: 'Slot, socket, DIMM and heatsink positions were measured from a review photo, so they can be 5 mm out. The x16 slot is the second slot position; the x4 slots are the sixth and seventh.',
  },
  {
    id: 'cpu',
    name: 'Intel Core Ultra 7 270K Plus',
    spec: '24 cores (8P + 16E), LGA 1851',
    size: '45 × 37.5 package',
    note: 'Standard LGA 1851 package size, not checked against Intel’s datasheet.',
  },
  {
    id: 'ram',
    name: 'G.Skill Ripjaws S5 DDR5-6000, 2 × 16 GB',
    spec: 'F5-6000J3636F16GX2-RS5K, in the second and fourth DIMM slots from the CPU',
    size: '133.35 × 33 × 7 each',
    note: 'Height from the product listing; the slot pair is the usual dual-channel pair.',
  },
  {
    id: 'cooler',
    name: 'ARCTIC Liquid Freezer III Pro 360, pump block',
    spec: 'Pump and cold plate with the VRM fan, on the CPU',
    size: '98 × 78 × 55 (estimated)',
    source: 'https://www.scan.co.uk/products/arctic-liquid-freezer-iii-pro-argb-360-aio-hydro-cpu-cooler-black-3x120mm-p12-pro-60mm-vrm-fan-coppe',
    note: 'Block size estimated; ARCTIC quotes 63 mm of clearance for the whole unit. The tube route is a guess.',
  },
  {
    id: 'radiator',
    name: 'ARCTIC Liquid Freezer III Pro 360, radiator',
    spec: 'On the front fan wall, where the stock fans were',
    size: '398 × 120 × 38',
    source: 'https://www.alza.cz/kod/CBlf3b07',
    note: 'The chassis fan row is 360 mm wide, so the radiator overhangs it by 19 mm each side. The gap to the fan wall is assumed to be 15 mm.',
  },
  {
    id: 'fans-push',
    name: '3 × ARCTIC P12 Pro PST, push',
    spec: 'Between the front panel and the radiator',
    size: '120 × 120 × 25 each',
  },
  {
    id: 'fans-pull',
    name: '3 × ARCTIC P12 Pro PST, pull',
    spec: 'Behind the radiator, facing the board',
    size: '120 × 120 × 25 each',
  },
  {
    id: 'gpu',
    name: 'NVIDIA RTX A6000',
    spec: '48 GB dual-slot blower card in the PCIe 5.0 x16 slot',
    size: '267 × 112, 2 slots',
    source: 'https://www.pugetsystems.com/parts/Video-Card/NVIDIA-RTX-A6000-48GB-PCI-E-13850',
    note: 'The A6000’s power plug is on the end facing the fans, so a cable needs room past the card end.',
  },
  {
    id: 'ssd',
    name: 'MSI SPATIUM M461 2 TB',
    spec: 'M.2 2280 NVMe in M2A_CPU (PCIe 5.0 slot), under its heatsink',
    size: '80 × 22',
  },
  {
    id: 'nic',
    name: 'Dell Mellanox ConnectX-4 Lx CX4121C',
    spec: '2 × 25 GbE SFP28, PCIe 3.0 x8, in the first PCIe 4.0 x4 slot',
    size: '142 × 69 half-height card, drawn with a full-height bracket',
    source: 'https://www.starline.de/en/products/mellanox-mcx4121a-acat',
    note: 'Card length and height from the MCX4121A manual. The chassis has full-height slots only, so the half-height bracket it ships with cannot screw in.',
  },
  {
    id: 'psu',
    name: 'Corsair SF1000 Platinum',
    spec: '1000 W SFX, fully modular, standing on end at the rear',
    size: '125 × 100 × 63.5',
    source: 'https://www.pugetsystems.com/parts/Power-Supply/Corsair-SF1000-Platinum-1000W-SFX-Power-Supply-15841/',
  },
  {
    id: 'fans-rear',
    name: '2 × Noctua NF-A6x25 PWM',
    spec: 'On the rear vent, exhausting',
    size: '60 × 60 × 25 each',
    source: 'https://noctua.at/en/nf-a6x25-pwm/specification',
    note: 'The vent’s screw holes are 50 mm apart, which is the 60 mm fan pattern.',
  },
];
