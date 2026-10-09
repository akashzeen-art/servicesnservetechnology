/** The four business verticals the preloader walks through, in loading order. */
export const PRELOADER_STAGES = [
  { id: 'dcb', number: '01', title: 'Direct Carrier Billing' },
  { id: 'gateway', number: '02', title: 'India Payment Gateway' },
  { id: 'crossborder', number: '03', title: 'Forex & Cross-Border' },
  { id: 'solutions', number: '04', title: 'Telecom Solutions' },
];

export function stageForProgress(progress) {
  const index = Math.floor((Number(progress) || 0) / 25);
  return Math.min(PRELOADER_STAGES.length - 1, Math.max(0, index));
}

/** Fallback hub point; replaced at runtime by India's polygon centroid. */
export const INDIA_HUB = { longitude: 79, latitude: 22.5 };

/** Offsets (degrees) from the hub — kept small so every node frames around India. */
export const DCB_NODES = {
  subscriber: { dLon: -19, dLat: -9, label: 'Subscriber', icon: 'phone' },
  carrier: { dLon: 19, dLat: 8, label: 'Carrier', icon: 'tower' },
};

export const GATEWAY_NODES = [
  { id: 'upi', label: 'UPI', dLon: -20, dLat: 11 },
  { id: 'cards', label: 'Cards', dLon: 20, dLat: 11 },
  { id: 'wallets', label: 'Wallets', dLon: -20, dLat: -11 },
  { id: 'checkout', label: 'Checkout', dLon: 20, dLat: -11 },
];

export const SOLUTION_NODES = [
  { id: 'offers', label: 'Offers Enablement', dLon: -21, dLat: 12 },
  { id: 'core', label: 'Core VAS', dLon: 21, dLat: 12 },
  { id: 'digital', label: 'VAS & Digital', dLon: -21, dLat: -12 },
  { id: 'ads', label: 'Mobile Advertisement', dLon: 21, dLat: -12 },
];
