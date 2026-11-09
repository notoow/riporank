/**
 * 3D Objects Comparison Specifications
 * Strictly ordered by volumetric scale from smallest to largest:
 * [Fiji Water 0.5L] -> [Lamborghini 4,700L] -> [★ SAMPLE Tower 4,820L] -> [Cybertruck 7,100L] -> [Statue of Liberty 15,000L] -> [Olympic Pool 2,500,000L]
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
    position: [-4.8, 0, 0.0],
    rotation: [0, 0.15, 0],
    description: '휴대용 생수병 (500ml)',
    heroCamPos: [-4.8, 0.35, 1.3],
    heroLookAt: [-4.8, 0.6, 0.0],
    getRatioText: (liters) => `${(liters / 0.5).toLocaleString('ko-KR')}병 분량`,
    getGiantDetail: (liters) => {
      const bottles = Math.round(liters / 0.5);
      return `현재 수술량(${liters.toLocaleString()}L)은 이 거대 생수병을 <strong>${bottles.toLocaleString()}개</strong> 완판할 수 있는 양입니다!`;
    }
  },
  {
    id: 'lamborghini',
    name: '람보르기니 우라칸',
    subText: '슈퍼카 차체 볼륨',
    volumeLiters: 4700,
    volumeMlText: '4,700L',
    modelPath: './assets/models/lambo_lp670.glb',
    targetLength: 1.95,
    position: [-2.3, 0, 0.1],
    rotation: [0, -Math.PI * 0.25, 0],
    description: '람보르기니 슈퍼카 차체 실내외 체적 (약 4,700L)',
    heroCamPos: [-2.3, 0.45, 1.9],
    heroLookAt: [-2.3, 0.55, 0.1],
    getRatioText: (liters) => `${((liters / 4700) * 100).toFixed(1)}% (약 ${(liters / 4700).toFixed(2)}대 완판)`,
    getGiantDetail: (liters) => {
      const ratio = liters / 4700;
      if (ratio >= 1.0) {
        const extraL = liters - 4700;
        return `람보르기니 우라칸 <strong>1대 완판(100%)</strong> 후에도 <strong>+${extraL.toLocaleString()}L (${(extraL/4700).toFixed(2)}대분)</strong>를 더 채웠습니다!`;
      } else {
        const remaining = 4700 - liters;
        return `람보르기니 우라칸의 <strong>${(ratio * 100).toFixed(1)}%</strong>를 채웠으며, 1대를 가득 채우려면 <strong>${remaining.toLocaleString()}L</strong> 필요합니다.`;
      }
    }
  },
  {
    id: 'cybertruck',
    name: '사이버트럭',
    subText: '픽업 캡 & 베드 볼륨',
    volumeLiters: 7100,
    volumeMlText: '7,100L',
    modelPath: './assets/models/Cyber_truck.glb',
    targetLength: 2.1,
    position: [0.8, 0, 0.0],
    rotation: [0, -Math.PI * 0.22, 0],
    description: '테슬라 사이버트럭 캐빈 및 베드 총 용적 (약 7,100L)',
    heroCamPos: [0.8, 0.55, 2.1],
    heroLookAt: [0.8, 0.7, 0.0],
    getRatioText: (liters) => `${((liters / 7100) * 100).toFixed(1)}% 충전`,
    getGiantDetail: (liters) => {
      const pct = ((liters / 7100) * 100).toFixed(1);
      const remaining = Math.max(0, 7100 - liters);
      return `테슬라 사이버트럭의 <strong>${pct}%</strong>를 순수 지방으로 채웠으며, 1대 완판까지 <strong>${remaining.toLocaleString()}L</strong> 남았습니다.`;
    }
  },
  {
    id: 'statue_of_liberty',
    name: '자유의 여신상',
    subText: '기단부 랜드마크 스케일',
    volumeLiters: 15000,
    volumeMlText: '15,000L',
    modelPath: './assets/models/statue_of_liberty.glb',
    targetHeight: 1.6,
    position: [2.8, 0, 0.0],
    rotation: [0, Math.PI * 0.12, 0],
    description: '뉴욕 자유의 여신상 기단부 체적 (약 15,000L)',
    heroCamPos: [2.8, 0.45, 1.8],
    heroLookAt: [2.8, 1.1, 0.0],
    getRatioText: (liters) => `${((liters / 15000) * 100).toFixed(1)}% 도달`,
    getGiantDetail: (liters) => {
      const pct = ((liters / 15000) * 100).toFixed(1);
      return `자유의 여신상 기단부 체적(15,000L)의 <strong>${pct}%</strong>에 도달한 거대한 실적입니다.`;
    }
  },
  {
    id: 'swimming_pool',
    name: '올림픽 수영장',
    subText: '50m 규격 공인 수영장',
    volumeLiters: 2500000,
    volumeMlText: '2,500,000L',
    modelPath: './assets/models/swimming_pool_343.glb',
    targetWidth: 1.6,
    position: [5.2, 0, -0.1], // Rightmost!
    rotation: [0, -Math.PI * 0.65, 0],
    description: '50m × 25m × 2m 공인 규격 (2,500,000L)',
    heroCamPos: [5.2, 0.6, 2.0],
    heroLookAt: [5.2, 0.4, -0.1],
    getRatioText: (liters) => `${((liters / 2500000) * 100).toFixed(4)}% 수위`,
    getGiantDetail: (liters) => {
      const pct = ((liters / 2500000) * 100).toFixed(4);
      return `올림픽 공인 규격 수영장(250만L)의 <strong>${pct}%</strong>를 채운 수위입니다.`;
    }
  }
];

export function getBestMatchingObject(liters) {
  if (liters <= 100) return 'fiji_bottle';
  if (liters <= 5500) return 'lamborghini';
  if (liters <= 10000) return 'cybertruck';
  if (liters <= 50000) return 'statue_of_liberty';
  return 'swimming_pool';
}
