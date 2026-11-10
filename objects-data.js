/**
 * 3D Objects Comparison Specifications
 * Strictly calibrated to 1:1 Real-World Physical Scale (1 unit = 1 meter)
 * Layout (left → right by VOLUME ASCENDING order):
 *
 * 1.  fiji_bottle      (0.5L)   : x = -26.0
 * 2.  human_body       (70L)    : x = -21.0
 * 3.  new_thin_barrel  (200L)   : x = -16.5
 * 4.  cow              (300L)   : x = -12.0
 * 5.  thinker_rodin    (500L)   : x = -7.5
 * [6. 강민서 원장 탑]  (3,200L) : x = -2.5 (scene.js)
 * [7. 정우진 원장 탑]  (3,950L) : x =  1.0 (scene.js)
 * 8.  lamborghini      (4,700L) : x =  5.5
 * [9. SAMPLE 원장 탑]  (4,820L) : x = 10.5 (scene.js)
 * 10. cybertruck       (7,100L) : x = 15.5
 * 11. tyrannosaurus    (8,000L) : x = 23.5
 * 12. statue_liberty   (15,000L): x = 34.0
 * 13. swimming_pool (2,500,000L): x = 46.0
 */
export const COMPARISON_OBJECTS = [
  {
    id: 'fiji_bottle',
    name: '생수병',
    subText: '휴대용 500ml 규격',
    volumeLiters: 0.5,
    volumeMlText: '500ml',
    modelPath: './assets/models/fiji_water_bottle.glb',
    targetHeight: 0.22,
    position: [-26.0, 0, 0.0],
    rotation: [0, 0.15, 0],
    description: '휴대용 500ml 생수병 (높이 22cm)',
    heroCamPos: [-26.0, 0.18, 0.65],
    heroLookAt: [-26.0, 0.12, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${(liters / 0.5).toLocaleString('ko-KR')}병 분량`,
    getGiantDetail: (liters) => {
      const bottles = Math.round(liters / 0.5);
      return `현재 수술량(${liters.toLocaleString()}L)은 실제 높이 22cm 생수병을 <strong>${bottles.toLocaleString()}개</strong> 완판할 수 있는 양입니다!`;
    }
  },
  {
    id: 'human_body',
    name: '성인 인체',
    subText: '성인 표준 신장 1.75m',
    volumeLiters: 70,
    volumeMlText: '70L',
    modelPath: './assets/models/human_body.glb',
    targetHeight: 1.75,
    position: [-21.0, 0, 0.0],
    rotation: [0, 0, 0],
    description: '성인 표준 인체 (신장 1.75m)',
    heroCamPos: [-21.0, 0.9, 2.5],
    heroLookAt: [-21.0, 0.9, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${(liters / 70).toFixed(1)}명 인체 체적`,
    getGiantDetail: (liters) => {
      return `성인 인체 전체 부피 기준 <strong>${(liters / 70).toFixed(1)}명분</strong>에 해당하는 양입니다.`;
    }
  },
  {
    id: 'new_thin_barrel',
    name: '200L 드럼통',
    subText: '공업용 스틸 오일 배럴',
    volumeLiters: 200,
    volumeMlText: '200L',
    modelPath: './assets/models/drum-new.glb',
    targetHeight: 0.88,
    position: [-16.5, 0, 0.0],
    rotation: [0, 0.2, 0],
    description: '공업용 200L 스틸 배럴 (높이 88cm)',
    heroCamPos: [-16.5, 0.45, 1.8],
    heroLookAt: [-16.5, 0.45, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${(liters / 200).toFixed(1)}개 분량`,
    getGiantDetail: (liters) => {
      const b = (liters / 200).toFixed(1);
      return `표준 200L 스틸 드럼통 <strong>${b}통</strong>을 황금빛 순수 지방으로 가득 채운 양입니다!`;
    }
  },
  {
    id: 'cow',
    name: '성체 젖소',
    subText: '성체 소 체지방 300L',
    volumeLiters: 300,
    volumeMlText: '300L',
    modelPath: './assets/models/cow.glb',
    targetHeight: 1.45,
    position: [-12.0, 0, 0.0],
    rotation: [0, Math.PI * 0.35, 0],
    description: '성체 홀스타인 젖소 (체고 1.45m)',
    heroCamPos: [-12.0, 0.75, 3.0],
    heroLookAt: [-12.0, 0.75, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${(liters / 300).toFixed(1)}마리분`,
    getGiantDetail: (liters) => {
      const cows = (liters / 300).toFixed(1);
      return `성체 젖소 <strong>${cows}마리</strong>의 총 체지방량에 달하는 거대한 순수 지방입니다!`;
    }
  },
  {
    id: 'thinker_rodin',
    name: '생각하는 사람',
    subText: '로댕 명작 좌상',
    volumeLiters: 500,
    volumeMlText: '500L',
    modelPath: './assets/models/thinker_rodin.glb',
    targetHeight: 1.80,
    position: [-7.5, 0, 0.0],
    rotation: [0, -0.2, 0],
    description: '로댕 생각하는 사람 (높이 1.8m)',
    heroCamPos: [-7.5, 0.95, 3.0],
    heroLookAt: [-7.5, 0.95, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${(liters / 500).toFixed(1)}배 부피`,
    getGiantDetail: (liters) => {
      return `로댕 조각상 부피의 <strong>${(liters / 500).toFixed(1)}배</strong>에 달하는 실적입니다!`;
    }
  },
  {
    id: 'lamborghini',
    name: '람보르기니 우라칸',
    subText: '슈퍼카 차체 볼륨',
    volumeLiters: 4700,
    volumeMlText: '4,700L',
    modelPath: './assets/models/lambo_lp670.glb',
    targetHeight: 1.165,
    position: [5.5, 0, 0.0],
    rotation: [0, -Math.PI * 0.25, 0],
    description: '슈퍼카 우라칸 (전고 1.16m, 체적 4,700L)',
    heroCamPos: [5.5, 0.65, 4.0],
    heroLookAt: [5.5, 0.6, 0.0],
    isAlwaysVisible: true,
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
    subText: '픽업 캡 & 베드 7,100L',
    volumeLiters: 7100,
    volumeMlText: '7,100L',
    modelPath: './assets/models/Cyber_truck.glb',
    targetHeight: 1.79,
    position: [15.5, 0, 0.0],
    rotation: [0, -Math.PI * 0.22, 0],
    description: '테슬라 사이버트럭 (전고 1.79m, 체적 7,100L)',
    heroCamPos: [15.5, 0.9, 5.0],
    heroLookAt: [15.5, 0.9, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${((liters / 7100) * 100).toFixed(1)}% 충전`,
    getGiantDetail: (liters) => {
      const pct = ((liters / 7100) * 100).toFixed(1);
      const remaining = Math.max(0, 7100 - liters);
      return `테슬라 사이버트럭의 <strong>${pct}%</strong>를 순수 지방으로 채웠으며, 1대 완판까지 <strong>${remaining.toLocaleString()}L</strong> 남았습니다.`;
    }
  },
  {
    id: 'tyrannosaurus_rex',
    name: '티라노사우루스',
    subText: '백악기 거대 포식자',
    volumeLiters: 8000,
    volumeMlText: '8,000L',
    modelPath: './assets/models/tyrannosaurus_rex.glb',
    targetHeight: 3.8,
    position: [23.5, 0, 0.0],
    rotation: [0, -Math.PI * 0.35, 0],
    description: '티렉스 골반고 3.8m, 전장 12m',
    heroCamPos: [23.5, 1.8, 7.0],
    heroLookAt: [23.5, 1.8, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${((liters / 8000) * 100).toFixed(1)}% 체적`,
    getGiantDetail: (liters) => {
      return `거대 공룡 티라노사우루스 전체 체적의 <strong>${((liters / 8000) * 100).toFixed(1)}%</strong>에 달하는 양입니다!`;
    }
  },
  // Giant Landmarks: Evenly spaced (approx 7m interval from T-Rex)
  {
    id: 'statue_of_liberty',
    name: '자유의 여신상',
    subText: '기단부 랜드마크 스케일',
    volumeLiters: 15000,
    volumeMlText: '15,000L',
    modelPath: './assets/models/statue_of_liberty.glb',
    targetHeight: 12.0,
    position: [33.5, 0, 0.0],
    rotation: [0, Math.PI * 0.12, 0],
    description: '자유의 여신상 (체적 15,000L)',
    heroCamPos: [33.5, 2.5, 9.0],
    heroLookAt: [33.5, 5.0, 0.0],
    isAlwaysVisible: true,
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
    targetLength: 20.0,
    position: [44.0, 0, 0.0],
    rotation: [0, -Math.PI * 0.65, 0],
    description: '올림픽 공인 규격 수영장 (250만L)',
    heroCamPos: [44.0, 4.0, 14.0],
    heroLookAt: [44.0, 1.0, 0.0],
    isAlwaysVisible: true,
    getRatioText: (liters) => `${((liters / 2500000) * 100).toFixed(4)}% 수위`,
    getGiantDetail: (liters) => {
      const pct = ((liters / 2500000) * 100).toFixed(4);
      return `올림픽 공인 규격 수영장(250만L)의 <strong>${pct}%</strong>를 채운 수위입니다.`;
    }
  }
];

export function getBestMatchingObject(liters) {
  if (liters <= 50) return 'fiji_bottle';
  if (liters <= 250) return 'new_thin_barrel';
  if (liters <= 1000) return 'cow';
  if (liters <= 5500) return 'lamborghini';
  if (liters <= 7500) return 'cybertruck';
  if (liters <= 9000) return 'tyrannosaurus_rex';
  if (liters <= 25000) return 'statue_of_liberty';
  return 'swimming_pool';
}
