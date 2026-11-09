/**
 * 3D Objects Comparison Specifications
 * Real-world volumetric capacities & 3D layout configurations
 */
export const COMPARISON_OBJECTS = [
  {
    id: 'fiji_bottle',
    name: '생수병',
    subText: '휴대용 500ml 규격',
    volumeLiters: 0.5,
    volumeMlText: '500ml',
    modelPath: './assets/models/fiji_water_bottle.glb',
    targetHeight: 1.05,
    position: [-4.2, 0, 0.0],
    rotation: [0, 0.15, 0], // Perfectly upright
    description: '휴대용 생수병 (500ml)',
    getRatioText: (liters) => `${(liters / 0.5).toLocaleString('ko-KR')}병 분량`
  },
  {
    id: 'swimming_pool',
    name: '올림픽 수영장',
    subText: '50m 규격 공인 수영장',
    volumeLiters: 2500000,
    volumeMlText: '2,500,000L',
    modelPath: './assets/models/swimming_pool_343.glb',
    targetWidth: 1.6,
    position: [-2.1, 0, -0.1],
    rotation: [0, -Math.PI * 0.65, 0], // Perspective showing front entrance steps
    description: '50m × 25m × 2m 공인 규격 (2,500,000L)',
    getRatioText: (liters) => `${((liters / 2500000) * 100).toFixed(4)}% 수위`
  },
  {
    id: 'lamborghini',
    name: '람보르기니 우라칸',
    subText: '슈퍼카 차체 볼륨',
    volumeLiters: 4700,
    volumeMlText: '4,700L',
    modelPath: './assets/models/lambo_lp670.glb',
    targetLength: 1.95,
    position: [0.0, 0, 0.1], // Center spotlight
    rotation: [0, -Math.PI * 0.25, 0], // Front headlights towards camera
    description: '람보르기니 슈퍼카 차체 실내외 체적 (약 4,700L)',
    getRatioText: (liters) => `${((liters / 4700) * 100).toFixed(1)}% (약 ${(liters / 4700).toFixed(2)}대 완판)`
  },
  {
    id: 'cybertruck',
    name: '사이버트럭',
    subText: '픽업 캡 & 베드 볼륨',
    volumeLiters: 7100,
    volumeMlText: '7,100L',
    modelPath: './assets/models/Cyber_truck.glb',
    targetLength: 2.1,
    position: [2.2, 0, 0.0],
    rotation: [0, -Math.PI * 0.22, 0], // Front lightbar towards camera!
    description: '테슬라 사이버트럭 캐빈 및 베드 총 용적 (약 7,100L)',
    getRatioText: (liters) => `${((liters / 7100) * 100).toFixed(1)}% 충전`
  },
  {
    id: 'statue_of_liberty',
    name: '자유의 여신상',
    subText: '기단부 랜드마크 스케일',
    volumeLiters: 15000,
    volumeMlText: '15,000L',
    modelPath: './assets/models/statue_of_liberty.glb',
    targetHeight: 1.6,
    position: [4.2, 0, 0.0],
    rotation: [0, Math.PI * 0.12, 0],
    description: '뉴욕 자유의 여신상 기단부 체적 (약 15,000L)',
    getRatioText: (liters) => `${((liters / 15000) * 100).toFixed(1)}% 도달`
  }
];

export function getBestMatchingObject(liters) {
  if (liters <= 100) return 'fiji_bottle';
  if (liters <= 5500) return 'lamborghini';
  if (liters <= 10000) return 'cybertruck';
  if (liters <= 50000) return 'statue_of_liberty';
  return 'swimming_pool';
}
