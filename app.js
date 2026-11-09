/**
 * LipoRank Main Application Controller
 * Handles SPA navigation, Real-World Physical Scale 3D Scene,
 * Front-Stage Preview Tower, Animated Slide Registration, and Audit Verification Flow
 */
import { LipoRankScene } from './scene.js';
import { getDoctors, getMyPendingTower, submitDoctorApplication } from './ranking-store.js';
import { COMPARISON_OBJECTS } from './objects-data.js';

class LipoRankApp {
  constructor() {
    this.currentLiters = 4820; // Default: SAMPLE 원장 4,820L
    this.activeDoctor = getDoctors()[0];
    this.doctors = getDoctors();
    this.myPendingTower = getMyPendingTower();

    this.initElements();
    this.initNavigation();
    this.init3DScene();
    this.initUIEvents();
    this.renderLeaderboards();
    this.renderMyRegisteredBanner();
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
    this.cubeCountBadge = document.getElementById('cube-count-badge');
    this.centerHighlightAmount = document.getElementById('center-highlight-amount');
    this.centerHighlightRatio = document.getElementById('center-highlight-ratio');
    this.presetChips = document.querySelectorAll('.chip');
    
    // Bottom Register Button
    this.btnRegisterRankBottom = document.getElementById('btn-register-rank-bottom');
    this.registerModal = document.getElementById('register-modal');
    this.modalClose = document.getElementById('modal-close');
    this.registerForm = document.getElementById('register-form');
    this.homeDoctorsTableBody = document.getElementById('home-doctors-table-body');
    this.fullDoctorsTableBody = document.getElementById('full-doctors-table-body');

    // Controls: Sunset, Walk-in HUD
    this.btnToggleSunset = document.getElementById('btn-toggle-sunset');
    this.sunsetBtnText = document.getElementById('sunset-btn-text');
    this.btnToggleGiant = document.getElementById('btn-toggle-giant');
    this.giantBtnText = document.getElementById('giant-btn-text');
    this.walkinHud = document.getElementById('walkin-hud');
    this.btnExitWalkin = document.getElementById('btn-exit-walkin');

    this.giantViewCard = document.getElementById('giant-view-card');
    this.giantObjName = document.getElementById('giant-obj-name');
    this.giantDetailText = document.getElementById('giant-detail-text');
    this.btnExitGiant = document.getElementById('btn-exit-giant');
    this.labelsOverlay = document.getElementById('labels-overlay');

    // Viral flex banner
    this.flexDocName = document.getElementById('flex-doc-name');
    this.flexLitersVal = document.getElementById('flex-liters-val');
    this.flexComparisonText = document.getElementById('flex-comparison-text');
    this.fatWeightText = document.getElementById('fat-weight-text');
    this.fatCalText = document.getElementById('fat-cal-text');

    // Carousel buttons & object tabs
    this.btnPrev = document.getElementById('carousel-prev');
    this.btnNext = document.getElementById('carousel-next');
    this.objectTabs = document.querySelectorAll('.object-label-tab, .center-highlight-box');

    // Registered Banner Elements & Verify CTA
    this.myRegisteredBanner = document.getElementById('my-registered-banner');
    this.myRegisteredName = document.getElementById('my-registered-name');
    this.myRegisteredClinic = document.getElementById('my-registered-clinic');
    this.myRegisteredLiters = document.getElementById('my-registered-liters');
    this.btnRequestVerify = document.getElementById('btn-request-verify');
    this.auditStatusTag = document.getElementById('audit-status-tag');
    this.privateTowerPill = document.getElementById('private-tower-pill');
    this.btnPillVerify = document.getElementById('btn-pill-verify');
  }

  initNavigation() {
    this.navLinks = document.querySelectorAll('.header-nav .nav-link, .header-logo, .link-more-ranking');
    this.tabViews = document.querySelectorAll('.tab-view');

    const switchTab = (targetId) => {
      document.querySelectorAll('.header-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.nav === targetId);
      });

      this.tabViews.forEach(view => {
        view.classList.toggle('active', view.id === `view-${targetId}`);
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.refreshIcons();

      if (targetId === 'home' && this.scene) {
        setTimeout(() => this.scene.onWindowResize(), 50);
      }
    };

    this.navLinks.forEach(link => {
      link.addEventListener('click', e => {
        const target = link.dataset.nav;
        if (target) {
          e.preventDefault();
          switchTab(target);
          history.pushState(null, '', `#${target}`);
        }
      });
    });

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      switchTab(hash);
    });

    const initialHash = window.location.hash.replace('#', '') || 'home';
    switchTab(initialHash);
  }

  init3DScene() {
    this.scene = new LipoRankScene(this.canvasContainer, {
      initialLiters: this.currentLiters,
      onVolumeChange: liters => {
        this.updateAllTexts(liters, this.scene.activeObjectId);
      },
      onObjectChange: objectId => {
        this.updateObjectTabs(objectId);
        this.updateAllTexts(this.currentLiters, objectId);
        if (this.scene.cameraMode === 'giant') {
          this.updateGiantCard(objectId);
        }
      },
      onCameraModeChange: (mode, cfg) => {
        this.handleCameraModeUI(mode, cfg);
      }
    });

    // If user already registered a tower previously, place it in the lineup
    if (this.myPendingTower) {
      this.scene.confirmAndRegisterMyTower(this.myPendingTower);
    }
  }

  initUIEvents() {
    // 1. Slider change (Volume & Spawns Front-Stage Preview Tower)
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

    // 3. Carousel Navigation (< and >): Scroll ribbon by 1 item without moving 3D camera
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        if (!this.labelsOverlay) return;
        const itemWidth = this.labelsOverlay.clientWidth / 5;
        this.labelsOverlay.scrollBy({ left: -itemWidth, behavior: 'smooth' });
      });
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        if (!this.labelsOverlay) return;
        const itemWidth = this.labelsOverlay.clientWidth / 5;
        this.labelsOverlay.scrollBy({ left: itemWidth, behavior: 'smooth' });
      });
    }

    // Realtime Standardizer Part Selector change listener
    const selPart = document.getElementById('sel-surgery-part');
    if (selPart) {
      selPart.addEventListener('change', () => {
        this.updateAllTexts(this.currentLiters, this.scene.activeObjectId);
      });
    }

    // 4. Object Tab Clicks & Visibility Toggles
    this.objectTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        // If clicked on the eye toggle button, don't trigger selection/giant view
        if (e.target.closest('.btn-vis-toggle')) return;

        const objId = tab.dataset.objectId;
        if (objId) {
          if (objId === 'sample_tower') {
            // Focus camera on SAMPLE official tower (x = -8.5, height = 4.82m)
            this.scene.startCameraTransition(
              new THREE.Vector3(-8.5, 3.0, 7.5),
              new THREE.Vector3(-8.5, 2.4, 0.0)
            );
            this.updateObjectTabs(objId);
            return;
          }

          // Always enter Giant View (close-up cinematic view) when clicking object tab
          this.scene.enterGiantView(objId);
          this.updateObjectTabs(objId);
        }
      });
    });

    // Visibility toggle eye buttons
    document.querySelectorAll('.btn-vis-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const objId = btn.dataset.visId;
        if (!objId || !this.scene) return;

        const isVisible = this.scene.toggleObjectVisibility(objId);
        btn.classList.toggle('is-off', !isVisible);
        btn.title = isVisible ? '가시성 끄기 (현재 켜짐)' : '가시성 켜기 (현재 숨김)';
        this.refreshIcons();
      });
    });

    // 5. Sunset Mode Toggle
    if (this.btnToggleSunset) {
      this.btnToggleSunset.addEventListener('click', () => {
        const isSunset = this.scene.toggleSunsetMode();
        this.btnToggleSunset.classList.toggle('active-sunset', isSunset);
        if (this.sunsetBtnText) {
          this.sunsetBtnText.textContent = isSunset ? '스튜디오 모드' : '노을 모드';
        }
        this.refreshIcons();
      });
    }

    // 6. 3D Walk-in Direct Enter / Exit Buttons
    if (this.btnToggleGiant) {
      this.btnToggleGiant.addEventListener('click', () => {
        if (this.scene.cameraMode === 'walkin') {
          this.scene.exitFirstPersonMode();
        } else {
          this.scene.enterFirstPersonMode();
        }
      });
    }

    if (this.btnExitWalkin) {
      this.btnExitWalkin.addEventListener('click', () => {
        this.scene.exitFirstPersonMode();
      });
    }

    if (this.btnExitGiant) {
      this.btnExitGiant.addEventListener('click', () => {
        this.scene.exitGiantView();
      });
    }

    // 7. Register Rank Modal (Bottom Button)
    const openModal = () => {
      if (this.registerModal) {
        const litersInput = document.getElementById('reg-liters');
        if (litersInput) litersInput.value = this.currentLiters;
        this.registerModal.classList.add('active');
        this.refreshIcons();
      }
    };
    const closeModal = () => {
      if (this.registerModal) this.registerModal.classList.remove('active');
    };

    if (this.btnRegisterRankBottom) {
      this.btnRegisterRankBottom.addEventListener('click', () => {
        // Instant Register: 바로 3D 캔버스 적당한 위치로 슬라이드 등록!
        const liters = this.currentLiters;
        const currentData = {
          name: '내 원장',
          licenseNo: '비공개',
          clinic: '미인증 의원',
          totalLiters: liters,
          cases: Math.round(liters / 2.5),
          crmSystem: '미연동',
          contact: ''
        };

        const registered = submitDoctorApplication(currentData);
        this.myPendingTower = registered;

        // Slide the preview tower immediately into its height-ranked lineup slot
        this.scene.confirmAndRegisterMyTower(registered);
        this.renderMyRegisteredBanner();

        // Visual feedback
        this.showRegistrationNotice(liters);
      });
    }

    if (this.modalClose) {
      this.modalClose.addEventListener('click', closeModal);
    }
    if (this.registerModal) {
      this.registerModal.addEventListener('click', e => {
        if (e.target === this.registerModal) closeModal();
      });
    }

    if (this.btnPillVerify) {
      this.btnPillVerify.addEventListener('click', () => {
        openModal();
      });
    }

    // Form submit: Animate and slide tower into lineup!
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = {
          name: document.getElementById('reg-name').value,
          licenseNo: document.getElementById('reg-license').value,
          clinic: document.getElementById('reg-clinic').value,
          liters: Number(document.getElementById('reg-liters').value),
          cases: Number(document.getElementById('reg-cases').value),
          crmSystem: document.getElementById('reg-crm').value,
          contact: document.getElementById('reg-contact').value
        };

        const registered = submitDoctorApplication(formData);
        this.myPendingTower = registered;

        // Slide the preview tower into its exact position in 3D lineup!
        this.scene.confirmAndRegisterMyTower(registered);
        this.renderMyRegisteredBanner();

        alert(`[${formData.name}] 원장님의 3D 탑이 생성되어 라인업 위치로 성공적으로 등록되었습니다!\n\n아래 [공인 인증받기]를 진행하시면 관리자 EMR 실사 후 온라인에 정식 공개됩니다.`);
        closeModal();
        this.registerForm.reset();
      });
    }

    // 8. "공인 인증받기" Click Flow
    if (this.btnRequestVerify) {
      this.btnRequestVerify.addEventListener('click', () => {
        if (!this.myPendingTower) return;
        alert(`[공인 인증 심사 접수 완료]\n\n원장님(${this.myPendingTower.name} / ${this.myPendingTower.clinic})의 의사면허(${this.myPendingTower.licenseNo}) 및 EMR 전자차트 공증 실사가 시작되었습니다.\n\n관리자 현장/전산 공인 인증 완료 시 전세계 LipoRank 공식 랭킹 리더보드에 정식 공개됩니다.`);
        if (this.auditStatusTag) {
          this.auditStatusTag.textContent = '공인 실사 심사 진행중 (온라인 공개 예정)';
          this.auditStatusTag.style.background = '#fef3c7';
          this.auditStatusTag.style.color = '#b45309';
        }
      });
    }
  }

  handleCameraModeUI(mode, cfg) {
    const isGiant = (mode === 'giant');
    const isWalkin = (mode === 'walkin');

    if (this.giantViewCard) {
      this.giantViewCard.classList.toggle('active', isGiant);
    }
    if (this.walkinHud) {
      this.walkinHud.classList.toggle('active', isWalkin);
    }
    // Keep labelsOverlay visible in giant mode so user can click other tabs; hide only in walk-in mode
    if (this.labelsOverlay) {
      this.labelsOverlay.classList.toggle('hidden', isWalkin);
    }
    if (this.giantBtnText) {
      this.giantBtnText.textContent = (isWalkin || isGiant) ? '전체보기 복귀' : '3D 세상 직접 들어가기';
    }
    if (isGiant && cfg) {
      this.updateGiantCard(cfg.id);
      this.updateObjectTabs(cfg.id);
    }
    this.refreshIcons();
  }

  updateGiantCard(objectId) {
    const cfg = COMPARISON_OBJECTS.find(c => c.id === objectId);
    if (!cfg) return;

    if (this.giantObjName) {
      this.giantObjName.textContent = `${cfg.name} 거인 뷰`;
    }
    if (this.giantDetailText) {
      this.giantDetailText.innerHTML = cfg.getGiantDetail(this.currentLiters);
    }
  }

  updateObjectTabs(objectId) {
    let activeTab = null;
    this.objectTabs.forEach(tab => {
      const isMatch = tab.dataset.objectId === objectId;
      tab.classList.toggle('active', isMatch);
      if (isMatch) activeTab = tab;
    });

    // Smoothly center the active tab in the 5-item visible viewport ribbon
    if (activeTab && this.labelsOverlay) {
      const containerWidth = this.labelsOverlay.clientWidth;
      const tabLeft = activeTab.offsetLeft;
      const tabWidth = activeTab.offsetWidth;
      const targetScroll = tabLeft - (containerWidth / 2) + (tabWidth / 2);

      this.labelsOverlay.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }

  updateAllTexts(liters, objectId) {
    const formattedL = liters.toLocaleString();
    const cubeCount = (liters / 1000).toFixed(2);
    const heightM = (cubeCount * 1.0).toFixed(2);

    if (this.currentVolText) {
      this.currentVolText.textContent = `${formattedL} L`;
    }
    if (this.cubeCountBadge) {
      this.cubeCountBadge.textContent = `${cubeCount} 개 (${formattedL}L = ${cubeCount}m³)`;
    }

    // Update Clinical Surgery Equivalent Statistics (Body parts with standard multiplier)
    const selPart = document.getElementById('sel-surgery-part');
    const partMultiplier = selPart ? parseFloat(selPart.value) || 3.0 : 3.0;
    const partName = selPart ? selPart.options[selPart.selectedIndex].text.split('(')[0].trim() : '복부 360도';

    const standardizedCases = Math.round(liters / partMultiplier);
    const abCases = Math.round(liters / 3.0); // 3,000cc
    const thighCases = Math.round(liters / 2.5); // 2,500cc
    const armCases = Math.round(liters / 1.0); // 1,000cc
    const chinCases = Math.round(liters / 0.1); // 100cc

    const equivSummary = document.getElementById('clinical-equiv-text');
    if (equivSummary) {
      equivSummary.innerHTML = `선택 부위 표준: <strong>${standardizedCases.toLocaleString()}회 집도</strong> (총 ${formattedL}L)`;
    }

    const formulaEl = document.getElementById('part-summary-formula');
    if (formulaEl) {
      formulaEl.innerHTML = `표준화 공식: 총 ${formattedL}L ÷ 1회 [${partName}] ${partMultiplier}L = <strong>총 ${standardizedCases.toLocaleString()}회 집도 실적</strong>`;
    }

    const thighEl = document.getElementById('thigh-count-text');
    const armEl = document.getElementById('arm-count-text');
    const chinEl = document.getElementById('chin-count-text');

    if (thighEl) thighEl.textContent = `${thighCases.toLocaleString()}회`;
    if (armEl) armEl.textContent = `${armCases.toLocaleString()}회`;
    if (chinEl) chinEl.textContent = `${chinCases.toLocaleString()}회`;

    if (this.centerHighlightAmount) {
      this.centerHighlightAmount.textContent = `${formattedL}L`;
    }
    if (this.flexLitersVal) {
      this.flexLitersVal.textContent = `${formattedL}L`;
    }

    const kg = Math.round(liters * 0.9);
    const kcal = Math.round(liters * 0.9 * 9000);
    if (this.fatWeightText) {
      this.fatWeightText.textContent = `약 ${kg.toLocaleString()} kg`;
    }
    if (this.fatCalText) {
      this.fatCalText.textContent = `약 ${kcal.toLocaleString()} kcal`;
    }

    if (this.centerHighlightRatio) {
      this.centerHighlightRatio.textContent = `4.82m 높이 돌파`;
    }

    if (this.flexComparisonText) {
      const cfg = COMPARISON_OBJECTS.find(c => c.id === objectId) || COMPARISON_OBJECTS[2];
      let customMsg = `<strong>1m³(1,000L) 글래스 큐브 ${cubeCount}개 (높이 ${heightM}m)</strong> 및 <strong>${cfg.name}</strong> 완판 체적입니다!`;
      if (objectId === 'lamborghini') {
        const pct = ((liters / 4700) * 100).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개 (높이 ${heightM}m)</strong> 및 <strong>람보르기니 우라칸 1대(${pct}%)</strong>를 순수 지방으로 완판한 대기록입니다!`;
      } else if (objectId === 'cybertruck') {
        const pct = ((liters / 7100) * 100).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 <strong>테슬라 사이버트럭의 ${pct}%</strong>를 황금빛 순수 지방으로 채운 체적입니다!`;
      } else if (objectId === 'fiji_bottle') {
        const bottles = Math.round(liters / 0.5);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 500ml 생수병 <strong>${bottles.toLocaleString()}병</strong>을 가득 채운 양입니다!`;
      } else if (objectId === 'cow') {
        const cows = (liters / 300).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 성체 젖소 <strong>${cows}마리분</strong>의 체지방량입니다!`;
      }
      this.flexComparisonText.innerHTML = customMsg;
    }

    if (this.scene.cameraMode === 'giant') {
      this.updateGiantCard(objectId);
    }
  }

  showRegistrationNotice(liters) {
    // Show non-blocking sleek toast/notice
    const toast = document.createElement('div');
    toast.className = 'reg-success-toast';
    toast.innerHTML = `
      <div class="toast-icon"><i data-lucide="check-circle" class="icon-md"></i></div>
      <div class="toast-body">
        <strong>내 3D 큐브 탑(${liters.toLocaleString()}L)이 라인업에 등록되었습니다!</strong>
        <p>현재 상태는 <em>[나만 보기]</em> 모드입니다. 관리자 EMR 실사 인증을 완료하면 전세계 공식 랭킹에 공개됩니다.</p>
      </div>
      <button class="toast-btn-action" id="toast-verify-btn">인증 신청</button>
    `;
    document.body.appendChild(toast);
    this.refreshIcons();

    const verifyBtn = toast.querySelector('#toast-verify-btn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        toast.remove();
        if (this.registerModal) {
          const litersInput = document.getElementById('reg-liters');
          if (litersInput) litersInput.value = liters;
          this.registerModal.classList.add('active');
          this.refreshIcons();
        }
      });
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => toast.remove(), 400);
    }, 6000);
  }

  renderMyRegisteredBanner() {
    if (this.myPendingTower) {
      if (this.myRegisteredBanner) {
        this.myRegisteredBanner.style.display = 'flex';
        if (this.myRegisteredName) this.myRegisteredName.textContent = this.myPendingTower.name;
        if (this.myRegisteredClinic) this.myRegisteredClinic.textContent = this.myPendingTower.clinic;
        if (this.myRegisteredLiters) this.myRegisteredLiters.textContent = `${this.myPendingTower.totalLiters.toLocaleString()} L`;
      }
      if (this.privateTowerPill) {
        this.privateTowerPill.style.display = 'inline-flex';
      }
    } else {
      if (this.myRegisteredBanner) this.myRegisteredBanner.style.display = 'none';
      if (this.privateTowerPill) {
        this.privateTowerPill.style.display = 'none';
      }
    }
    this.refreshIcons();
  }

  renderLeaderboards() {
    const renderRows = (container) => {
      if (!container) return;
      container.innerHTML = '';

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
            <span style="font-size: 11px; color: #94a3b8; display: block;">수술 ${doc.totalCases.toLocaleString()}건 (1m³ 큐브 ${(doc.totalLiters / 1000).toFixed(2)}개)</span>
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
            <button class="btn-fill-beaker" data-liters="${doc.totalLiters}" title="해당 원장님의 1m³ 큐브 탑 & 사물 체급 연동">
              <span>3D 체급 연동</span>
              <i data-lucide="arrow-right" class="icon-sm"></i>
            </button>
          </td>
        `;

        row.querySelector('.btn-fill-beaker').addEventListener('click', () => {
          this.currentLiters = doc.totalLiters;
          if (this.volSlider) this.volSlider.value = doc.totalLiters;
          this.scene.setVolume(doc.totalLiters);
          window.location.hash = '#home';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        container.appendChild(row);
      });
    };

    renderRows(this.homeDoctorsTableBody);
    renderRows(this.fullDoctorsTableBody);
    this.refreshIcons();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new LipoRankApp();
});
