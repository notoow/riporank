# LipoRank (리포랭크)

> **전세계 1위 공인 지방흡입 수술량 랭킹 & 3D 볼륨 비교 플랫폼**

LipoRank는 병원 CRM 차트 및 의사면허 공인 검증을 거친 지방흡입 집도의 순위를 제공하며, 누적 흡입 지방량(L)을 실사 3D 모델(생수병, 올림픽 수영장, 람보르기니, 사이버트럭 등)과 인터랙티브하게 비교할 수 있는 웹 3D 플랫폼입니다.

---

## 🌟 주요 기능

1. **실사 3D 모델 기반 체감 비교 (Three.js)**
   - 실제 GLB 3D 모델(피지 생수병 500ml, 올림픽 수영장 2,500,000ml, 람보르기니 우라칸, 테슬라 사이버트럭, 젖소)과 중앙 지방 용기 라인업
   - Three.js WebGL 실시간 렌더링, 부드러운 화이트 스튜디오 무한 바닥과 그림자
   - 마우스 드래그 360° 회전 및 줌, `[자동 회전]`, `[초기화]` 지원

2. **지방 유체 찰랑거림(Sloshing) & 채우기(Pouring) 물리 연출**
   - 3중 사인/코사인 파동 중첩 물리 셰이더로 실제 액체처럼 찰랑거리는 황금빛 지방 액체
   - 용량 변경 시 상단에서 지방 줄기와 스플래시 물방울이 쏟아져 차오르는 애니메이션
   - 순수 지방 환산 무게(kg) 및 칼로리(kcal) 실시간 계산

3. **공인 의사 랭킹 및 내 랭크 등록**
   - 2026 공인 지방흡입 집도의 실적 순위표 (누적 흡입량 L, 1인 평균 cc, 순수 지방률)
   - '3D 비커 연동' 클릭 시 해당 의사의 총 흡입량으로 3D 비커가 채워지는 인터랙션
   - 최상단 `[+ 내 랭크 등록하기]` 버튼을 통한 EMR/CRM 전산 차트 및 면허 공인 신청 모달

4. **모던 UI/UX**
   - 프리텐다드(Pretendard) 웹폰트 전면 적용
   - Lucide Icons 벡터 아이콘 100% 적용
   - GitHub Pages 무설치 정적 배포 지원 (`.nojekyll`, Importmap)

---

## 🚀 빠른 시작 (Local)

```bash
# 저장소 복제
git clone https://github.com/notoow/riporank.git
cd riporank

# 로컬 웹 서버 실행 (Python 내장 서버)
python -m http.server 8080
```

웹 브라우저에서 `http://localhost:8080` 접속

---

## 📁 프로젝트 구조

```
riporank/
├── index.html              # 메인 엔트리 HTML (헤더, 3D 뷰포트, 랭킹 리더보드)
├── styles.css              # 프리텐다드 기반 클린 미니멀 화이트/블루 스타일
├── app.js                 # 메인 애플리케이션 컨트롤러
├── scene.js               # Three.js 3D 씬 (GLB 모델 로더, 조명, OrbitControls)
├── fat-fluid.js           # 지방 액체 슬로싱 셰이더 & 파티클 시스템
├── objects-data.js        # 사물별 용량 및 환산 배수 데이터
├── ranking-store.js       # 의사 공인 데이터 및 인증 신청 스토어
├── assets/models/         # 3D GLB 모델 파일들
├── vendor/                # Three.js 및 Lucide 로컬 라이브러리
└── .nojekyll              # GitHub Pages 서빙 설정
```
