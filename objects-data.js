/**
 * LipoRank Comparison Objects Data
 * Based on Reference Mockups & Realistic Scale Factors
 * Uses Lucide Icon identifiers (No emojis)
 */

export const comparisonObjects = [
  {
    id: "bottle-500",
    name: "생수병",
    detail: "휴대용 생수병 (500ml)",
    category: "daily",
    volumeLiters: 0.5,
    volumeMl: 500,
    lucideIcon: "cup-soda",
    color: "#60a5fa",
    modelType: "cylinder",
    dimensions: { radius: 0.035, height: 0.22 },
    description: "일상에서 가장 쉽게 체감할 수 있는 500ml 생수병 기준입니다."
  },
  {
    id: "bottle-2000",
    name: "대형 생수병",
    detail: "가정용 2L 생수병",
    category: "daily",
    volumeLiters: 2.0,
    volumeMl: 2000,
    lucideIcon: "milk",
    color: "#3b82f6",
    modelType: "cylinder",
    dimensions: { radius: 0.055, height: 0.32 },
    description: "일반적인 1회 지방흡입 평균 추출량(약 2,000cc)과 유사합니다."
  },
  {
    id: "bathtub",
    name: "가정용 욕조",
    detail: "표준 성인 욕조 (200L)",
    category: "daily",
    volumeLiters: 200,
    volumeMl: 200000,
    lucideIcon: "bath",
    color: "#e2e8f0",
    modelType: "bathtub",
    dimensions: { length: 1.5, width: 0.7, height: 0.5 },
    description: "일반 가정용 욕조에 가득 찬 물의 양(약 200L)입니다."
  },
  {
    id: "drum-200",
    name: "공업용 드럼통",
    detail: "200L 스틸 오일 드럼",
    category: "daily",
    volumeLiters: 200,
    volumeMl: 200000,
    lucideIcon: "cylinder",
    color: "#334155",
    modelType: "cylinder",
    dimensions: { radius: 0.29, height: 0.88 },
    description: "표준 산업용 200L 드럼통 기준입니다."
  },
  {
    id: "cow",
    name: "성체 젖소 (체지방량)",
    detail: "소 한 마리 체지방 총량",
    category: "animal",
    volumeLiters: 300,
    volumeMl: 300000,
    lucideIcon: "beef",
    color: "#f8fafc",
    modelType: "cow",
    dimensions: { length: 2.2, width: 0.9, height: 1.5 },
    description: "성체 젖소(약 650kg)의 체지방 추정 총량(약 300L)입니다."
  },
  {
    id: "lamborghini",
    name: "람보르기니 우라칸",
    detail: "슈퍼카 차체 볼륨",
    category: "vehicle",
    volumeLiters: 4700,
    volumeMl: 4700000,
    lucideIcon: "car",
    color: "#eab308",
    modelType: "car",
    dimensions: { length: 4.5, width: 1.9, height: 1.16 },
    description: "람보르기니 우라칸의 전체 내부 객실 및 트렁크 환산 부피입니다."
  },
  {
    id: "cybertruck",
    name: "테슬라 사이버트럭",
    detail: "픽업트럭 베드 & 캡 볼륨",
    category: "vehicle",
    volumeLiters: 5200,
    volumeMl: 5200000,
    lucideIcon: "truck",
    color: "#94a3b8",
    modelType: "truck",
    dimensions: { length: 5.68, width: 2.2, height: 1.79 },
    description: "사이버트럭의 카고 베드 및 주요 수납 체적(약 5,200L)입니다."
  },
  {
    id: "pool",
    name: "올림픽 공인 수영장",
    detail: "50m × 25m × 2m 규격 수영장",
    category: "architecture",
    volumeLiters: 2500000,
    volumeMl: 2500000000,
    lucideIcon: "waves",
    color: "#0284c7",
    modelType: "pool",
    dimensions: { length: 5.0, width: 2.5, height: 0.2 },
    description: "국제 규격 올림픽 수영장의 총 저수량(250만 리터)입니다."
  }
];

export function calculateMultipliers(selectedLiters) {
  return comparisonObjects.map(obj => {
    const ratio = selectedLiters / obj.volumeLiters;
    let formatted;
    if (ratio >= 1000) {
      formatted = `${ratio.toLocaleString(undefined, { maximumFractionDigits: 0 })}배`;
    } else if (ratio >= 1) {
      formatted = `${ratio.toFixed(2)}배`;
    } else if (ratio >= 0.0001) {
      formatted = `${(ratio * 100).toFixed(4)}%`;
    } else {
      formatted = `${(ratio * 100).toExponential(2)}%`;
    }

    return {
      ...obj,
      ratio,
      formattedRatio: formatted
    };
  });
}
