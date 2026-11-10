/**
 * LipoRank Verified Doctor Data Store
 * Official verified doctor record (SAMPLE 원장) & user's private pending application
 */

export const initialDoctors = [
  {
    id: "doc-adm-01",
    rank: 1,
    name: "[DEMO] SAMPLE 원장",
    clinic: "더슬림 메디컬의원 (강남본점)",
    specialty: "복부 / 대용량 지방흡입 특화",
    licenseNo: "제58210호",
    totalLiters: 4820,
    totalCases: 1967,
    avgCcPerCase: 2450,
    pureFatRatio: 89,
    status: "verified", // Official verified doctor
    isOfficial: true,
    isDemo: true,
    verifiedDate: "2026-10-15",
    badge: "CRM 전산 실시간 연동 공인 [DEMO 샘플]",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    note: "보건복지부 외과 전문의, EMR 수술 대장 공증 검증 완료 (데모 데이터)"
  },
  {
    id: "doc-adm-02",
    rank: 2,
    name: "[DEMO] 정우진 원장",
    clinic: "탑바디 체형성형센터",
    specialty: "허벅지 360도 둘레 특화",
    licenseNo: "제61294호",
    totalLiters: 3950,
    totalCases: 1620,
    avgCcPerCase: 2438,
    pureFatRatio: 88,
    status: "verified",
    isOfficial: true,
    isDemo: true,
    verifiedDate: "2026-09-20",
    badge: "CRM 연동 공인 [DEMO 샘플]",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
    note: "성형외과 전문의 (데모 데이터)"
  },
  {
    id: "doc-adm-03",
    rank: 3,
    name: "[DEMO] 강민서 원장",
    clinic: "슬림핏 라이프의원",
    specialty: "팔뚝 / 상체 라인 조각",
    licenseNo: "제63811호",
    totalLiters: 3200,
    totalCases: 2150,
    avgCcPerCase: 1488,
    pureFatRatio: 91,
    status: "verified",
    isOfficial: true,
    isDemo: true,
    verifiedDate: "2026-10-02",
    badge: "CRM 연동 공인 [DEMO 샘플]",
    avatar: "https://images.unsplash.com/photo-1594824813637-45607db7752e?w=150&auto=format&fit=crop&q=80",
    note: "외과 전문의 (데모 데이터)"
  }
];

const STORAGE_KEY = "liporank_doctors_data";
const MY_PENDING_KEY = "liporank_my_pending_tower";
const USER_AUTH_KEY = "liporank_user_session";

export function getCurrentUser() {
  try {
    const saved = localStorage.getItem(USER_AUTH_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_AUTH_KEY);
    }
  } catch (e) {}
}

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

export function saveMyTower(towerData) {
  try {
    localStorage.setItem(MY_PENDING_KEY, JSON.stringify(towerData));
  } catch (e) {
    console.error("Save tower failed:", e);
  }
  return towerData;
}

export function submitDoctorApplication(formData) {
  const existing = getMyPendingTower();
  const application = {
    id: existing ? existing.id : ("my-tower-" + Date.now()),
    submittedAt: new Date().toISOString(),
    name: formData.name || (existing ? existing.name : "내 원장"),
    licenseNo: formData.licenseNo || (existing ? existing.licenseNo : "비공개"),
    clinic: formData.clinic || (existing ? existing.clinic : "미인증 의원"),
    specialty: formData.specialty || "전신 체형 특화",
    totalLiters: Number(formData.liters || formData.totalLiters) || (existing ? existing.totalLiters : 0),
    totalCases: Number(formData.cases || formData.totalCases) || (existing ? existing.totalCases : Math.round((formData.liters || 0) / 2.5)),
    avgCcPerCase: 2400,
    crmSystem: formData.crmSystem || "미연동",
    contact: formData.contact || "",
    status: existing && existing.status === 'verified' ? 'verified' : (formData.status || "pending"),
    isMyPrivate: !(existing && existing.status === 'verified'),
    badge: existing && existing.status === 'verified' ? "공인 EMR 인증 완료" : "공인 심사 대기 (나만 보기)"
  };

  saveMyTower(application);
  return application;
}
