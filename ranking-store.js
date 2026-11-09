/**
 * LipoRank Verified Doctor Data Store
 * Manages official verified doctors & user's private pending tower
 */

export const initialDoctors = [
  {
    id: "doc-adm-01",
    rank: 1,
    name: "김지훈 대표원장",
    clinic: "더슬림 메디컬의원 (강남본점)",
    specialty: "복부 / 대용량 지방흡입",
    licenseNo: "제58210호",
    totalLiters: 4820,
    totalCases: 1967,
    avgCcPerCase: 2450,
    pureFatRatio: 89,
    status: "verified", // Official verified
    isOfficial: true,
    verifiedDate: "2026-10-15",
    badge: "CRM 전산 실시간 연동 공인",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    note: "보건복지부 외과 전문의, EMR 수술 대장 공증 검증 완료"
  }
];

const STORAGE_KEY = "liporank_doctors_data";
const MY_PENDING_KEY = "liporank_my_pending_tower";

export function getDoctors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // fallback
  }
  return initialDoctors;
}

export function getMyPendingTower() {
  try {
    const saved = localStorage.getItem(MY_PENDING_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function submitDoctorApplication(formData) {
  const application = {
    id: "my-tower-" + Date.now(),
    submittedAt: new Date().toISOString(),
    name: formData.name,
    licenseNo: formData.licenseNo,
    clinic: formData.clinic,
    specialty: formData.specialty || "전신 체형 특화",
    totalLiters: Number(formData.liters) || 0,
    totalCases: Number(formData.cases) || 0,
    avgCcPerCase: Number(formData.cases) > 0 ? Math.round((Number(formData.liters) * 1000) / Number(formData.cases)) : 2000,
    crmSystem: formData.crmSystem,
    contact: formData.contact,
    status: "pending", // Unverified, visible only to this user
    isMyPrivate: true,
    badge: "공인 심사 진행중 (나만 보기)"
  };

  try {
    localStorage.setItem(MY_PENDING_KEY, JSON.stringify(application));
  } catch (e) {
    console.error("Save pending application failed:", e);
  }

  return application;
}
