/**
 * LipoRank Main Application Controller
 * Handles 3D Scene events, Doctor viral flex messaging, and leaderboard interactions
 */
import { LipoRankScene } from './scene.js';
import { getDoctors, submitDoctorApplication } from './ranking-store.js';
import { COMPARISON_OBJECTS } from './objects-data.js';

class LipoRankApp {
  constructor() {
    this.currentLiters = 4820; // Default: Top rank doctor 4,820L
    this.activeDoctor = getDoctors()[0]; // 1위 김지훈 대표원장
    this.doctors = getDoctors();

    this.initElements();
    this.init3DScene();
    this.initUIEvents();
    this.renderLeaderboard();
    this.updateAllTexts(this.currentLiters, this.scene.activeObjectId);
    this.refreshIcons();
  }

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  initElements() {
    this.canvasContainer = document.getElementById('canvas-container');
    this.volSlider = document.getElementById('vol-slider');
    this.currentVolText = document.getElementById('current-vol-text');
    this.centerHighlightAmount = document.getElementById('center-highlight-amount');
    this.centerHighlightRatio = document.getElementById('center-highlight-ratio');
    this.presetChips = document.querySelectorAll('.chip');
    this.btnRegisterRank = document.getElementById('btn-register-rank');
    this.registerModal = document.getElementById('register-modal');
    this.modalClose = document.getElementById('modal-close');
    this.registerForm = document.getElementById('register-form');
    this.doctorsTableBody = document.getElementById('doctors-table-body');

    // Viral flex banner elements
    this.flexDocName = document.getElementById('flex-doc-name');
    this.flexLitersVal = document.getElementById('flex-liters-val');
    this.flexComparisonText = document.getElementById('flex-comparison-text');
    this.fatWeightText = document.getElementById('fat-weight-text');
    this.fatCalText = document.getElementById('fat-cal-text');

    // Carousel buttons & dots
    this.btnPrev = document.getElementById('carousel-prev');
    this.btnNext = document.getElementById('carousel-next');
    this.dots = document.querySelectorAll('.carousel-dots .dot');
    this.objectTabs = document.querySelectorAll('.object-label-tab, .center-highlight-box');
  }

  init3DScene() {
    this.scene = new LipoRankScene(this.canvasContainer, {
      initialLiters: this.currentLiters,
      initialObjectId: 'lamborghini',
      onVolumeChange: liters => {
        this.updateAllTexts(liters, this.scene.activeObjectId);
      },
      onObjectChange: objectId => {
        this.updateObjectTabsAndDots(objectId);
        this.updateAllTexts(this.currentLiters, objectId);
      }
    });
  }

  initUIEvents() {
    // 1. Slider change
    if (this.volSlider) {
      this.volSlider.addEventListener('input', e => {
        const liters = Number(e.target.value);
        this.currentLiters = liters;
        this.scene.setVolume(liters);
      });
    }

    // 2. Preset chips
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const liters = Number(chip.dataset.liters);
        this.currentLiters = liters;
        if (this.volSlider) this.volSlider.value = liters;
        this.scene.setVolume(liters);
      });
    });

    // 3. Carousel Navigation (< and >)
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => this.scene.prevObject());
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => this.scene.nextObject());
    }

    // 4. Object Tab Clicks
    this.objectTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const objId = tab.dataset.objectId;
        if (objId) this.scene.setActiveObject(objId);
      });
    });

    // 5. Dots Click
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = Number(dot.dataset.index);
        if (COMPARISON_OBJECTS[idx]) {
          this.scene.setActiveObject(COMPARISON_OBJECTS[idx].id);
        }
      });
    });

    // 6. Register Rank Modal
    const openModal = () => {
      if (this.registerModal) this.registerModal.classList.add('active');
      this.refreshIcons();
    };
    const closeModal = () => {
      if (this.registerModal) this.registerModal.classList.remove('active');
    };

    if (this.btnRegisterRank) {
      this.btnRegisterRank.addEventListener('click', openModal);
    }
    if (this.modalClose) {
      this.modalClose.addEventListener('click', closeModal);
    }
    if (this.registerModal) {
      this.registerModal.addEventListener('click', e => {
        if (e.target === this.registerModal) closeModal();
      });
    }

    // Form submit
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = {
          name: document.getElementById('reg-name').value,
          licenseNo: document.getElementById('reg-license').value,
          clinic: document.getElementById('reg-clinic').value,
          liters: document.getElementById('reg-liters').value,
          cases: document.getElementById('reg-cases').value,
          crmSystem: document.getElementById('reg-crm').value,
          contact: document.getElementById('reg-contact').value
        };

        submitDoctorApplication(formData);
        alert(`[${formData.name}] 원장님의 랭크 등록 신청이 정상 접수되었습니다.\n\n제출하신 EMR/CRM 데이터 및 의사면허(${formData.licenseNo}) 공증 검토 후 24시간 이내에 전세계 공인 LipoRank 리더보드에 정식 등재됩니다.`);
        closeModal();
        this.registerForm.reset();
      });
    }
  }

  updateObjectTabsAndDots(objectId) {
    // Update dots
    const activeIdx = COMPARISON_OBJECTS.findIndex(c => c.id === objectId);
    this.dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
    });

    // Update object tabs highlight
    this.objectTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.objectId === objectId);
    });
  }

  updateAllTexts(liters, objectId) {
    const formattedL = liters.toLocaleString();
    if (this.currentVolText) {
      this.currentVolText.textContent = `${formattedL} L`;
    }
    if (this.centerHighlightAmount) {
      this.centerHighlightAmount.textContent = `${formattedL}L`;
    }
    if (this.flexLitersVal) {
      this.flexLitersVal.textContent = `${formattedL}L`;
    }

    // Fat physical stats (density approx 0.9 kg/L, 9000 kcal/kg)
    const kg = Math.round(liters * 0.9);
    const kcal = Math.round(liters * 0.9 * 9000);
    if (this.fatWeightText) {
      this.fatWeightText.textContent = `약 ${kg.toLocaleString()} kg`;
    }
    if (this.fatCalText) {
      this.fatCalText.textContent = `약 ${kcal.toLocaleString()} kcal`;
    }

    // Update comparison viral message
    const cfg = COMPARISON_OBJECTS.find(c => c.id === objectId) || COMPARISON_OBJECTS[2];
    const ratioText = cfg.getRatioText(liters);

    if (this.centerHighlightRatio) {
      this.centerHighlightRatio.textContent = ratioText;
    }

    if (this.flexComparisonText) {
      let customMsg = `<strong>${cfg.name}</strong> 기준 <strong>${ratioText}</strong>를 순수 지방으로 가득 채운 대기록입니다!`;
      if (objectId === 'lamborghini') {
        const pct = ((liters / 4700) * 100).toFixed(1);
        customMsg = `<strong>람보르기니 우라칸 1대(${pct}%)</strong>를 황금빛 순수 지방으로 가득 채운 대기록입니다!`;
      } else if (objectId === 'cybertruck') {
        const pct = ((liters / 7100) * 100).toFixed(1);
        customMsg = `<strong>테슬라 사이버트럭의 ${pct}%</strong>를 황금빛 순수 지방으로 채운 체적입니다!`;
      } else if (objectId === 'fiji_bottle') {
        const bottles = Math.round(liters / 0.5);
        customMsg = `500ml 휴대용 생수병 <strong>${bottles.toLocaleString()}병</strong>을 가득 채운 양입니다!`;
      } else if (objectId === 'statue_of_liberty') {
        const pct = ((liters / 15000) * 100).toFixed(1);
        customMsg = `<strong>자유의 여신상 기단부의 ${pct}%</strong>에 도달한 거대한 실적입니다!`;
      } else if (objectId === 'swimming_pool') {
        const pct = ((liters / 2500000) * 100).toFixed(4);
        customMsg = `올림픽 공인 수영장(250만L)의 <strong>${pct}%</strong>에 해당하는 체적입니다!`;
      }
      this.flexComparisonText.innerHTML = customMsg;
    }
  }

  renderLeaderboard() {
    if (!this.doctorsTableBody) return;
    this.doctorsTableBody.innerHTML = '';

    this.doctors.forEach(doc => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>
          <div class="rank-badge">${doc.rank}</div>
        </td>
        <td>
          <div class="doc-profile-cell">
            <img src="${doc.avatar}" class="doc-img" alt="${doc.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=0953ff&color=fff'">
            <div class="doc-info-text">
              <div class="name">${doc.name}</div>
              <div class="sub">${doc.clinic} · 의사면허 ${doc.licenseNo}</div>
            </div>
          </div>
        </td>
        <td>
          <strong style="color: #0953ff; font-size: 15px;">${doc.totalLiters.toLocaleString()} L</strong>
          <span style="font-size: 11px; color: #9ca3af; display: block;">수술 ${doc.totalCases.toLocaleString()}건</span>
        </td>
        <td>
          <strong>${doc.avgCcPerCase.toLocaleString()} cc</strong>
          <span style="font-size: 11px; color: #9ca3af; display: block;">순수지방 ${doc.pureFatRatio}%</span>
        </td>
        <td>
          <span class="badge-verified">
            <i data-lucide="shield-check" class="icon-sm"></i>
            <span>${doc.badge}</span>
          </span>
        </td>
        <td>
          <button class="btn-fill-beaker" data-liters="${doc.totalLiters}" title="해당 원장님의 총 흡입량으로 3D 체급 연동">
            <span>3D 체급 연동</span>
            <i data-lucide="arrow-right" class="icon-sm"></i>
          </button>
        </td>
      `;

      // Click "3D 체급 연동"
      row.querySelector('.btn-fill-beaker').addEventListener('click', () => {
        this.currentLiters = doc.totalLiters;
        if (this.volSlider) this.volSlider.value = doc.totalLiters;
        this.scene.setVolume(doc.totalLiters);
        this.scene.setActiveObject('lamborghini'); // Lambo matches 4820L best
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      this.doctorsTableBody.appendChild(row);
    });

    this.refreshIcons();
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new LipoRankApp();
});
