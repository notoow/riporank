/**
 * LipoRank Firebase & Ranking Data Store
 * Firebase Project: mini-sites-hub
 */

// Firebase SDK import via CDN or modular fallback
export const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForPublicClientConfig",
  authDomain: "mini-sites-hub.firebaseapp.com",
  projectId: "mini-sites-hub",
  storageBucket: "mini-sites-hub.appspot.com",
  messagingSenderId: "109823487234",
  appId: "1:109823487234:web:liporank261109"
};

// Initial verified doctor records (certified via CRM & Medical License)
export const initialDoctors = [
  {
    id: "doc-1",
    rank: 1,
    name: "김지훈 대표원장",
    clinic: "더슬림 메디컬의원 (강남본점)",
    specialty: "복부 / 대용량 흡입",
    licenseNo: "제58210호",
    totalLiters: 4820,
    totalCases: 1967,
    avgCcPerCase: 2450,
    pureFatRatio: 89,
    status: "verified", // verified | pending | unverified
    verifiedDate: "2026-10-15",
    badge: "CRM 실시간 연동 공인",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    note: "보건복지부 외과 전문의, EMR 수술 대장 전산 검증 완료"
  },
  {
    id: "doc-2",
    rank: 2,
    name: "박서연 원장",
    clinic: "바디핏 여성의원 (압구정)",
    specialty: "허벅지 / 엉덩이 라인",
    licenseNo: "제64902호",
    totalLiters: 3950,
    totalCases: 1820,
    avgCcPerCase: 2170,
    pureFatRatio: 86,
    status: "verified",
    verifiedDate: "2026-09-28",
    badge: "CRM 실시간 연동 공인",
    avatar: "https://images.unsplash.com/photo-1594824813637-b8a75e2f3d53?w=150&auto=format&fit=crop&q=80",
    note: "성형외과 전문의, 3D 체형 스캔 연동"
  },
  {
    id: "doc-3",
    rank: 3,
    name: "최명규 대표원장",
    clinic: "메가라인 성형외과 (신사)",
    specialty: "초대용량 (4,000cc+)",
    licenseNo: "제49112호",
    totalLiters: 3620,
    totalCases: 1130,
    avgCcPerCase: 3203,
    pureFatRatio: 91,
    status: "verified",
    verifiedDate: "2026-10-02",
    badge: "공증 수술차트 감사완료",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
    note: "마취과 전문의 3인 상주, 안전 수술 무사고 14년"
  },
  {
    id: "doc-4",
    rank: 4,
    name: "이준우 원장",
    clinic: "원더라인 의원 (청담)",
    specialty: "팔뚝 / 브라라인 / 등",
    licenseNo: "제71233호",
    totalLiters: 2840,
    totalCases: 1650,
    avgCcPerCase: 1720,
    pureFatRatio: 87,
    status: "verified",
    verifiedDate: "2026-10-18",
    badge: "CRM 실시간 연동 공인",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
    note: "미세 캐뷸라 특화 시술"
  },
  {
    id: "doc-5",
    rank: 5,
    name: "정수아 원장",
    clinic: "에스벨 성형외과 (서초)",
    specialty: "복부 / 허벅지 복합",
    licenseNo: "제78419호",
    totalLiters: 2410,
    totalCases: 1290,
    avgCcPerCase: 1868,
    pureFatRatio: 85,
    status: "verified",
    verifiedDate: "2026-10-22",
    badge: "공증 수술차트 감사완료",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
    note: "가정의학과 비만체형 전문의"
  }
];

// Local store with fallback to localStorage
const STORAGE_KEY = "liporank_doctors_data";
const APPLICATIONS_KEY = "liporank_doctor_applications";

export function getDoctors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Storage access failed, using initial doctors:", e);
  }
  return initialDoctors;
}

export function saveDoctors(doctors) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
  } catch (e) {
    console.error("Save doctors failed:", e);
  }
}

export function submitDoctorApplication(formData) {
  const application = {
    id: "app-" + Date.now(),
    submittedAt: new Date().toISOString(),
    name: formData.name,
    licenseNo: formData.licenseNo,
    clinic: formData.clinic,
    specialty: formData.specialty || "전신 체형 특화",
    estimatedLiters: Number(formData.liters) || 0,
    estimatedCases: Number(formData.cases) || 0,
    avgCcPerCase: Number(formData.cases) > 0 ? Math.round((Number(formData.liters) * 1000) / Number(formData.cases)) : 2000,
    crmSystem: formData.crmSystem,
    contact: formData.contact,
    proofFile: formData.proofFileName || "수술대장_사본.pdf",
    status: "pending" // 관리자 검토 대기
  };

  try {
    const existing = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
    existing.unshift(application);
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error("Save application failed:", e);
  }

  return application;
}

export function getApplications() {
  try {
    return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
