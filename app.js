/**
 * LipoRank Main Application Controller
 * Fully integrated with Lucide Icons (Zero Emojis)
 */
import { LipoRankScene } from './scene.js';
import { comparisonObjects, calculateMultipliers } from './objects-data.js';
import { getDoctors, submitDoctorApplication } from './ranking-store.js';

class LipoRankApp {
  constructor() {
    this.currentLiters = 3000;
    this.unit = 'ml'; // 'ml' | 'L'
    this.doctors = getDoctors();

    this.initElements();
    this.init3DScene();
    this.initUIEvents();
    this.renderComparisonGrid();
    this.renderLeaderboard();
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
    this.stageTitle = document.getElementById('stage-title');
    this.centerHighlightAmount = document.getElementById('center-highlight-amount');
    this.unitToggleBtns = document.querySelectorAll('.unit-tab');
    this.presetChips = document.querySelectorAll('.chip');
    this.btnRotate = document.getElementById('btn-rotate');
    this.btnReset = document.getElementById('btn-reset');
    this.btnPour = document.getElementById('btn-pour');
    this.btnRegisterRank = document.getElementById('btn-register-rank');
    this.registerModal = document.getElementById('register-modal');
    this.modalClose = document.getElementById('modal-close');
    this.registerForm = document.getElementById('register-form');
    this.objectsGrid = document.getElementById('objects-grid');
    this.doctorsTableBody = document.getElementById('doctors-table-body');
  }

  init3DScene() {
    this.scene = new LipoRankScene(this.canvasContainer, {
      initialLiters: this.currentLiters,
      onVolumeChange: liters => {
        this.updateVolumeText(liters);
      },
      onObjectClick: id => {
        const obj = comparisonObjects.find(o => o.id === id);
        if (obj) {
          alert(`[${obj.name}] ${obj.detail}\n용량: ${obj.volumeLiters.toLocaleString()}L\n${obj.description}`);
        }
      }
    });
  }

  initUIEvents() {
    // 1. Slider change
    this.volSlider.addEventListener('input', e => {
      const liters = Number(e.target.value);
      this.currentLiters = liters;
      this.scene.setVolume(liters, false);
      this.updateVolumeText(liters);
      this.renderComparisonGrid();
    });

    // 2. Unit toggle
    this.unitToggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.unitToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.unit = btn.dataset.unit;
        this.updateVolumeText(this.currentLiters);
      });
    });

    // 3. Preset chips
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const liters = Number(chip.dataset.liters);
        this.currentLiters = liters;
        this.volSlider.value = liters;
        this.scene.setVolume(liters, true); // Pour animation
        this.updateVolumeText(liters);
        this.renderComparisonGrid();
      });
    });

    // 4. Viewport Toolbar
    if (this.btnRotate) {
      this.btnRotate.addEventListener('click', () => {
        const active = this.scene.toggleAutoRotate();
        this.btnRotate.classList.toggle('active', active);
      });
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => {
        this.scene.resetCamera();
      });
    }

    if (this.btnPour) {
      this.btnPour.addEventListener('click', () => {
        this.scene.setVolume(this.currentLiters, true);
      });
    }

    // 5. Register Rank Modal Events
    const openModal = () => {
      this.registerModal.classList.add('active');
      this.refreshIcons();
    };
    const closeModal = () => {
      this.registerModal.classList.remove('active');
    };

    this.btnRegisterRank.addEventListener('click', openModal);
    if (this.btnSidebarRegister) {
      this.btnSidebarRegister.addEventListener('click', openModal);
    }
    this.modalClose.addEventListener('click', closeModal);
    this.registerModal.addEventListener('click', e => {
      if (e.target === this.registerModal) closeModal();
    });

    // Form submit
    this.registerForm.addEventListener('submit', e => {
      e.preventDefault();
      const formData = {
        name: document.getElementById('reg-name').value,
        licenseNo: document.getElementById('reg-license').value,
        clinic: document.getElementById('reg-clinic').value,
        specialty: document.getElementById('reg-specialty').value,
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

  updateVolumeText(liters) {
    if (this.unit === 'ml') {
      const ml = (liters * 1000).toLocaleString();
      this.currentVolText.textContent = `${ml} ml`;
      if (this.stageTitle) this.stageTitle.textContent = `${ml}ml의 지방을 3D로 비교해보세요`;
      if (this.centerHighlightAmount) this.centerHighlightAmount.textContent = `${ml}ml`;
    } else {
      this.currentVolText.textContent = `${liters.toLocaleString()} L`;
      if (this.stageTitle) this.stageTitle.textContent = `${liters.toLocaleString()}L의 지방을 3D로 비교해보세요`;
      if (this.centerHighlightAmount) this.centerHighlightAmount.textContent = `${liters.toLocaleString()}L`;
    }
  }

  renderComparisonGrid() {
    const list = calculateMultipliers(this.currentLiters);
    this.objectsGrid.innerHTML = '';

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'object-card';
      card.innerHTML = `
        <div class="object-icon-wrap" style="color: #0953ff; margin-bottom: 4px;">
          <i data-lucide="${item.lucideIcon}" class="icon-lg"></i>
        </div>
        <div class="object-name">${item.name}</div>
        <div class="object-ratio">${item.formattedRatio}</div>
        <div class="object-detail">${item.detail} (${item.volumeLiters.toLocaleString()}L)</div>
      `;
      card.addEventListener('click', () => {
        this.scene.fatSystem.triggerSlosh(0.08);
      });
      this.objectsGrid.appendChild(card);
    });

    this.refreshIcons();
  }

  renderLeaderboard() {
    this.doctorsTableBody.innerHTML = '';

    this.doctors.forEach(doc => {
      const row = document.createElement('tr');
      const rankClass = doc.rank === 1 ? 'rank-1' : doc.rank === 2 ? 'rank-2' : doc.rank === 3 ? 'rank-3' : 'rank-n';

      row.innerHTML = `
        <td>
          <div class="rank-pill ${rankClass}">${doc.rank}</div>
        </td>
        <td>
          <div class="doc-info">
            <img src="${doc.avatar}" class="doc-avatar" alt="${doc.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=0953ff&color=fff'">
            <div class="doc-name-group">
              <span class="doc-name">${doc.name}</span>
              <span class="doc-clinic">${doc.clinic} · 의사면허 ${doc.licenseNo}</span>
            </div>
          </div>
        </td>
        <td>
          <strong style="color: #0953ff; font-size: 15px;">${doc.totalLiters.toLocaleString()} L</strong>
          <span style="font-size: 11px; color: #94a3b8; display: block;">수술 ${doc.totalCases.toLocaleString()}건</span>
        </td>
        <td>
          <strong>${doc.avgCcPerCase.toLocaleString()} cc</strong>
          <span style="font-size: 11px; color: #94a3b8; display: block;">순수지방 ${doc.pureFatRatio}%</span>
        </td>
        <td>
          <span class="badge-verified">
            <i data-lucide="shield-check" class="icon-sm"></i>
            <span>${doc.badge}</span>
          </span>
        </td>
        <td>
          <button class="btn-view-beaker" data-liters="${doc.totalLiters}" title="해당 원장님의 총 흡입량으로 비커 채우기">
            <span>비커로 보기</span>
            <i data-lucide="arrow-right" class="icon-sm"></i>
          </button>
        </td>
      `;

      // Click "비커로 보기"
      row.querySelector('.btn-view-beaker').addEventListener('click', () => {
        this.currentLiters = doc.totalLiters;
        this.volSlider.value = Math.min(doc.totalLiters, 5000);
        this.scene.setVolume(doc.totalLiters, true);
        this.updateVolumeText(doc.totalLiters);
        this.renderComparisonGrid();
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
