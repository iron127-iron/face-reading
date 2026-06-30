let currentImage = null;
let isProcessing = false;

function formatTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function init() {
  const status = document.getElementById('modelStatus');
  status.innerHTML = '✅ 面相分析已就緒，請上傳照片';
  status.style.color = '#00ff88';
  document.getElementById('uploadSection').style.display = 'block';

  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  const hint = document.getElementById('cameraHint');
  if (!isSecure && hint) {
    hint.textContent = '💡 目前使用 HTTP，相機功能僅支援 HTTPS。請改用「選擇照片」上傳圖片';
    hint.style.display = 'block';
  }

  const uploadArea = document.querySelector('.upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); });
    uploadArea.addEventListener('dragleave', e => { e.preventDefault(); });
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) handleFile(file);
      else showToast('⚠️ 請上傳圖片檔案');
    });
  }
}

function drawFaceRegions(ctx, img, canvas) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.drawImage(img, 0, 0, w, h);

  const regions = [
    { id: 'forehead', label: '額頭', x: w * 0.2, y: h * 0.02, w: w * 0.6, h: h * 0.2 },
    { id: 'eyebrows', label: '眉', x: w * 0.15, y: h * 0.2, w: w * 0.7, h: h * 0.06 },
    { id: 'eyes', label: '眼', x: w * 0.15, y: h * 0.27, w: w * 0.7, h: h * 0.08 },
    { id: 'nose', label: '鼻', x: w * 0.35, y: h * 0.35, w: w * 0.3, h: h * 0.18 },
    { id: 'mouth', label: '口', x: w * 0.25, y: h * 0.53, w: w * 0.5, h: h * 0.08 },
    { id: 'chin', label: '下巴', x: w * 0.2, y: h * 0.62, w: w * 0.6, h: h * 0.25 },
    { id: 'ears', label: '耳', x: w * 0.05, y: h * 0.22, w: w * 0.15, h: h * 0.25 }
  ];

  regions.forEach(region => {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
    ctx.fillRect(region.x, region.y, region.w, region.h);

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(region.x, region.y, region.w, region.h);
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.max(12, Math.round(h * 0.025))}px "Noto Serif TC", "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.fillText(region.label, region.x + region.w / 2, region.y - 4);
    ctx.globalAlpha = 1;
  });
}

function getMeasurements() {
  return {
    foreheadRatio: 0.24 + Math.random() * 0.14,
    eyebrowGap: 0.02 + Math.random() * 0.05,
    eyeRatio: 0.20 + Math.random() * 0.12,
    noseRatio: 0.35 + Math.random() * 0.15,
    mouthRatio: 0.28 + Math.random() * 0.14,
    chinRatio: 0.20 + Math.random() * 0.12,
    earRatio: 0.26 + Math.random() * 0.12,
    faceWidth: 0.5,
    faceHeight: 0.5,
    eyeSpacing: 0.10 + Math.random() * 0.04,
    noseWidth: 0.06 + Math.random() * 0.04,
    mouthWidth: 0.10 + Math.random() * 0.04,
    lipHeight: 0.02 + Math.random() * 0.02
  };
}

function analyzeFace(measurements) {
  const results = {};
  for (const [key, config] of Object.entries(FACE_READINGS)) {
    const trait = config.traits.find(t => t.condition(measurements)) || config.traits[1];
    results[key] = {
      label: trait.label,
      text: trait.text,
      score: trait.score,
      name: config.name
    };
  }
  const fortuneResults = FORTUNE_TYPES.map(ft => {
    let totalScore = 0;
    for (const [part, weight] of Object.entries(ft.weight)) {
      totalScore += (results[part]?.score || 50) * weight;
    }
    const level = totalScore >= 80 ? '大吉' : totalScore >= 65 ? '吉' : totalScore >= 50 ? '中平' : '末吉';
    return { ...ft, score: Math.round(totalScore), level };
  });
  return { features: results, fortunes: fortuneResults };
}

function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.style.display = 'block';
  resultsDiv.scrollIntoView({ behavior: 'smooth' });

  const featuresHtml = Object.entries(data.features).map(([key, val]) => `
    <div class="feature-card" onclick="this.classList.toggle('expanded')">
      <div class="feature-header">
        <span class="feature-name">${val.name}</span>
        <span class="feature-label">「${val.label}」</span>
        <span class="feature-score" style="color: ${val.score >= 70 ? '#00ff88' : val.score >= 50 ? '#ffd700' : '#ff6b6b'}">${val.score}分</span>
        <span class="expand-hint">▼</span>
      </div>
      <div class="feature-detail">
        <p>${val.text}</p>
      </div>
    </div>
  `).join('');

  const fortunesHtml = data.fortunes.map(f => `
    <div class="fortune-card fortune-${f.level}">
      <div class="fortune-icon">${f.icon}</div>
      <div class="fortune-info">
        <h4>${f.name}</h4>
        <div class="fortune-bar">
          <div class="fortune-fill" style="width: ${f.score}%"></div>
        </div>
        <div class="fortune-footer">
          <span class="fortune-score">${f.score}分</span>
          <span class="fortune-level level-${f.level}">${f.level}</span>
        </div>
      </div>
    </div>
  `).join('');

  const scores = Object.values(data.features).map(f => f.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bestFeature = Object.entries(data.features).reduce((a, b) => a[1].score > b[1].score ? a : b);
  const worstFeature = Object.entries(data.features).reduce((a, b) => a[1].score < b[1].score ? a : b);

  const overallReadings = [
    `面相綜合評分 ${Math.round(avg)} 分。${bestFeature[1].name}最為出眾，是您運勢的強項；${worstFeature[1].name}則需多加留意，可透過後天修養補足。`,
    `觀君面相，${bestFeature[1].label}格局已成，主一生順遂。${worstFeature[1].name}雖有不足，然面相乃動態之相，善念善行可改之。`,
    `此面相${avg >= 70 ? '格局上佳' : avg >= 55 ? '中正平和' : '尚有可塑之處'}。${bestFeature[1].name}顯示${bestFeature[1].label}之相，${worstFeature[1].name}則需多加修持。`
  ];

  resultsDiv.innerHTML = `
    <div class="results-container">
      <div class="results-header">
        <div class="bagua">☰</div>
        <h2>面相分析報告</h2>
        <p class="reading-time">⚡ ${formatTimestamp()}</p>
      </div>
      <div class="section-title">
        <span class="ornament">◈</span> 五官解析 <span class="ornament">◈</span>
      </div>
      <div class="features-grid">${featuresHtml}</div>
      <div class="section-title">
        <span class="ornament">◈</span> 運勢總覽 <span class="ornament">◈</span>
      </div>
      <div class="fortunes-grid">${fortunesHtml}</div>
      <div class="overall-section">
        <h3>📜 綜合命評</h3>
        <p class="overall-text">${overallReadings[Math.floor(Math.random() * overallReadings.length)]}</p>
      </div>
      <div class="disclaimer">⚠️ 本分析僅供娛樂參考，命運掌握在自己手中</div>
    </div>
  `;
}

function performAnalysis() {
  const img = document.getElementById('previewImg');
  if (!img) return;

  const canvas = document.getElementById('faceCanvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  drawFaceRegions(ctx, img, canvas);

  const measurements = getMeasurements();
  const data = analyzeFace(measurements);
  displayResults(data);
  document.getElementById('shareSection').style.display = 'block';
}

function startCamera() {
  if (isProcessing) return;
  isProcessing = true;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('⚠️ 相機功能需要 HTTPS 連線，請改用選擇照片');
    isProcessing = false;
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
    .then(stream => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>📸 拍照</h3>
          <video id="cameraVideo" style="width:100%;max-width:500px;border-radius:8px;"></video>
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); stopCamera();">取消</button>
            <button class="btn btn-primary" onclick="capturePhoto(this)">拍照</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      setTimeout(() => {
        const v = document.getElementById('cameraVideo');
        if (v) v.srcObject = stream;
      }, 100);

      window._cameraStream = stream;
    })
    .catch(err => {
      const hint = document.getElementById('cameraHint');
      if (hint) {
        hint.textContent = '⚠️ 無法開啟相機，請確認相機權限或改用選擇照片';
        hint.style.display = 'block';
      }
      showToast('⚠️ 無法開啟相機，請改用選擇照片');
      isProcessing = false;
    });
}

function stopCamera() {
  if (window._cameraStream) {
    window._cameraStream.getTracks().forEach(t => t.stop());
    window._cameraStream = null;
  }
  isProcessing = false;
}

function capturePhoto(btn) {
  const video = document.getElementById('cameraVideo');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  canvas.toBlob(blob => {
    const file = new File([blob], 'camera_photo.jpg', { type: 'image/jpeg' });
    handleFile(file);
    btn.closest('.modal').remove();
    stopCamera();
  }, 'image/jpeg');
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  handleFile(file);
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    currentImage = e.target.result;

    const uploadSection = document.getElementById('uploadSection');
    uploadSection.innerHTML = `
      <div class="preview-container">
        <div class="image-wrapper">
          <img id="previewImg" src="${currentImage}" style="max-width:100%;max-height:60vh;border-radius:8px;">
          <canvas id="faceCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;"></canvas>
        </div>
        <div class="preview-actions">
          <button class="btn btn-secondary" onclick="resetUpload()">重新選擇</button>
          <button class="btn btn-primary" id="analyzeBtn" onclick="performAnalysis()">
            🔮 開始看相
          </button>
        </div>
      </div>
    `;

    uploadSection.style.display = 'block';
    document.getElementById('results').style.display = 'none';
    document.getElementById('shareSection').style.display = 'none';

    const img = document.getElementById('previewImg');
    img.onload = () => {
      const canvas = document.getElementById('faceCanvas');
      canvas.style.width = img.offsetWidth + 'px';
      canvas.style.height = img.offsetHeight + 'px';
    };

    showToast('✅ 照片上傳成功！點擊「開始看相」進行分析');
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  document.getElementById('uploadSection').innerHTML = `
    <div class="upload-area" id="uploadArea">
      <div class="upload-icon">☯</div>
      <h3>上傳照片看面相</h3>
      <p>請上傳清晰的正面照片（JPG / PNG）</p>
      <input type="file" id="photoInput" accept="image/*" onchange="handleFileUpload(event)" style="display:none">
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="document.getElementById('photoInput').click()">
          📁 選擇照片
        </button>
        <button class="btn btn-secondary" onclick="startCamera()">
          📸 拍照
        </button>
      </div>
      <p id="cameraHint" style="font-size:12px;color:#666;margin-top:12px;display:none"></p>
    </div>
  `;
  document.getElementById('results').style.display = 'none';
  document.getElementById('shareSection').style.display = 'none';
}

async function shareToDiscord() {
  const webhookInput = document.getElementById('webhookUrl');
  const webhookUrl = webhookInput.value.trim();

  if (!webhookUrl) {
    showToast('⚠️ 請輸入 Discord Webhook 網址');
    webhookInput.focus();
    webhookInput.style.borderColor = '#ff6b6b';
    setTimeout(() => webhookInput.style.borderColor = '#3a3a5c', 2000);
    return;
  }

  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    showToast('⚠️ Webhook 網址格式不正確');
    return;
  }

  const shareBtn = document.querySelector('.share-btn');
  shareBtn.disabled = true;
  shareBtn.textContent = '⏳ 上傳中...';

  try {
    const img = document.getElementById('previewImg');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth || img.width;
    tempCanvas.height = img.naturalHeight || img.height;
    tempCanvas.getContext('2d').drawImage(img, 0, 0);
    const imgData = tempCanvas.toDataURL('image/jpeg', 0.9);

    const blob = await (await fetch(imgData)).blob();
    const formData = new FormData();
    formData.append('file', blob, 'face_reading.jpg');

    const resultsDiv = document.getElementById('results');
    let message = `**🔮 面相分析結果**\n⏰ ${formatTimestamp()}\n\n**📋 五官解析：**\n`;
    const featureCards = resultsDiv?.querySelectorAll('.feature-card') || [];
    featureCards.forEach(card => {
      const name = card.querySelector('.feature-name')?.textContent || '';
      const label = card.querySelector('.feature-label')?.textContent || '';
      const score = card.querySelector('.feature-score')?.textContent || '';
      message += `▸ ${name} ${label} — ${score}\n`;
    });

    message += '\n**📊 運勢總覽：**\n';
    const fortuneCards = resultsDiv?.querySelectorAll('.fortune-card') || [];
    fortuneCards.forEach(card => {
      const name = card.querySelector('h4')?.textContent || '';
      const score = card.querySelector('.fortune-score')?.textContent || '';
      const level = card.querySelector('.fortune-level')?.textContent || '';
      message += `▸ ${name} ${score} [${level}]\n`;
    });

    const overall = resultsDiv?.querySelector('.overall-text')?.textContent || '';
    message += `\n**📜 綜合命評：**\n${overall}`;

    formData.append('payload_json', JSON.stringify({
      content: message,
      embeds: [{
        title: '📷 面相照片',
        image: { url: 'attachment://face_reading.jpg' },
        color: 0xFFD700
      }]
    }));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    showToast('✅ 面相分析已成功分享到 Discord！');
    webhookInput.value = '';
  } catch (e) {
    console.error('Discord share error:', e);
    showToast('⚠️ 分享失敗，請檢查 Webhook 網址是否正確');
  } finally {
    shareBtn.disabled = false;
    shareBtn.textContent = '📤 分享到 Discord';
  }
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  let toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
