/**
 * LipoRank Main Application Controller
 * Minimal Clean Architecture (Exact Match to User Reference Mockup)
 */
import { LipoRankScene } from './scene.js';
import { getDoctors, submitDoctorApplication } from './ranking-store.js';

class LipoRankApp {
  constructor() {
    this.currentLiters = 3000;
    this.doctors = getDoctors();

    this.initElements();
    this.init3DScene();
    this.initUIEvents();
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
    this.centerHighlightAmount = document.getElementById('center-highlight-amount');
    this.presetChips = document.querySelectorAll('.chip');
    this.btnRegisterRank = document.getElementById('btn-register-rank');
    this.registerModal = document.getElementById('register-modal');
    this.modalClose = document.getElementById('modal-close');
    this.registerForm = document.getElementById('register-form');
    this.doctorsTableBody = document.getElementById('doctors-table-body');
  }

  init3DScene() {
    this.scene = new LipoRankScene(this.canvasContainer, {
      initialLiters: this.currentLiters,
      onVolumeChange: liters => {
        this.updateVolumeText(liters);
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
    });

    // 2. Preset chips
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const liters = Number(chip.dataset.liters);
        this.currentLiters = liters;
        this.volSlider.value = liters;
        this.scene.setVolume(liters, true); // Pour animation
        this.updateVolumeText(liters);
      });
    });

    // 3. Register Rank Modal Events
    const openModal = () => {
      this.registerModal.classList.add('active');
      this.refreshIcons();
    };
    const closeModal = () => {
      this.registerModal.classList.remove('active');
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

  updateVolumeText(liters) {
    const ml = (liters * 1000).toLocaleString();
    if (this.currentVolText) {
      this.currentVolText.textContent = `${ml} ml`;
    }
    if (this.centerHighlightAmount) {
      this.centerHighlightAmount.textContent = `${ml}ml`;
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
          <button class="btn-fill-beaker" data-liters="${doc.totalLiters}" title="해당 원장님의 총 흡입량으로 비커 채우기">
            <span>3D 비커 연동</span>
            <i data-lucide="arrow-right" class="icon-sm"></i>
          </button>
        </td>
      `;

      // Click "3D 비커 연동"
      row.querySelector('.btn-fill-beaker').addEventListener('click', () => {
        this.currentLiters = doc.totalLiters;
        this.volSlider.value = Math.min(doc.totalLiters, 5000);
        this.scene.setVolume(doc.totalLiters, true);
        this.updateVolumeText(doc.totalLiters);
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
