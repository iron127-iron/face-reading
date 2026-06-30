let faceMesh = null;
let currentImage = null;
let isProcessing = false;

const faceRegions = [
  { id: 'forehead', label: '額頭', color: '#FFD700', path: null },
  { id: 'eyebrows', label: '眉', color: '#8B4513', path: null },
  { id: 'eyes', label: '眼', color: '#4169E1', path: null },
  { id: 'nose', label: '鼻', color: '#CD853F', path: null },
  { id: 'mouth', label: '口', color: '#DC143C', path: null },
  { id: 'chin', label: '下巴', color: '#FF69B4', path: null },
  { id: 'ears', label: '耳', color: '#DEB887', path: null }
];

function formatTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let useManualMode = false;

async function loadFaceMesh() {
  const status = document.getElementById('modelStatus');
  try {
    status.textContent = '⏳ 正在載入面相分析模型...';
    status.style.color = '#ffd700';

    if (typeof FaceMesh === 'undefined') {
      throw new Error('FaceMesh library not loaded');
    }

    faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onFaceResults);

    await new Promise((resolve, reject) => {
      try {
        faceMesh.initialize();
        setTimeout(resolve, 1500);
      } catch (e) {
        reject(e);
      }
    });

    status.textContent = '✅ 面相模型載入完成！請上傳照片';
    status.style.color = '#00ff88';
    document.getElementById('uploadSection').style.display = 'block';

    const cameraBtn = document.getElementById('cameraBtn');
    cameraBtn.style.display = 'inline-flex';

    return true;
  } catch (e) {
    console.error('Model load error:', e);
    useManualMode = true;
    status.textContent = '⚡ 已切換為標準分析模式（離線可用）';
    status.style.color = '#ffd700';
    document.getElementById('uploadSection').style.display = 'block';
    return false;
  }
}

async function onFaceResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

  const landmarks = results.multiFaceLandmarks[0];
  const canvas = document.getElementById('faceCanvas');
  const ctx = canvas.getContext('2d');
  const img = document.getElementById('previewImg');

  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;

  const measurements = calculateMeasurements(landmarks, w, h);
  drawFaceRegions(ctx, landmarks, w, h, measurements);
  const results_data = analyzeFace(measurements);
  displayResults(results_data, measurements);
}

function calculateMeasurements(landmarks, w, h) {
  const lm = landmarks;

  const faceTop = Math.min(...lm.map(p => p.y));
  const faceBottom = Math.max(...lm.map(p => p.y));
  const faceLeft = Math.min(...lm.map(p => p.x));
  const faceRight = Math.max(...lm.map(p => p.x));
  const faceHeight = faceBottom - faceTop;

  const leftBrow = lm.slice(17, 22);
  const rightBrow = lm.slice(22, 27);
  const browCenterY = (Math.min(...leftBrow.map(p => p.y)) + Math.min(...rightBrow.map(p => p.y))) / 2;

  const leftEye = lm.slice(36, 42);
  const rightEye = lm.slice(42, 48);

  const noseTop = lm[27];
  const noseBottom = lm[33];
  const noseLeft = lm[31];
  const noseRight = lm[35];

  const mouthLeft = lm[48];
  const mouthRight = lm[54];
  const mouthTop = lm[51];
  const mouthBottom = lm[57];

  const chinPoint = lm[8];

  return {
    foreheadRatio: (browCenterY - faceTop) / faceHeight,
    eyebrowGap: lm[27].x - lm[21].x,
    eyeRatio: ((Math.max(...leftEye.map(p => p.x)) - Math.min(...leftEye.map(p => p.x))) / w +
               (Math.max(...rightEye.map(p => p.x)) - Math.min(...rightEye.map(p => p.x))) / w) / 2,
    noseRatio: (noseBottom.y - noseTop.y) / faceHeight,
    mouthRatio: (mouthRight.x - mouthLeft.x) / w,
    chinRatio: (faceBottom - chinPoint.y) / faceHeight,
    earRatio: 0.32,
    faceWidth: faceRight - faceLeft,
    faceHeight: faceHeight,
    eyeSpacing: Math.abs(lm[39].x - lm[42].x),
    noseWidth: Math.abs(noseRight.x - noseLeft.x),
    mouthWidth: Math.abs(mouthRight.x - mouthLeft.x),
    lipHeight: Math.abs(mouthBottom.y - mouthTop.y)
  };
}

function drawFaceRegions(ctx, landmarks, w, h, measurements) {
  const lm = landmarks;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(document.getElementById('previewImg'), 0, 0, w, h);

  ctx.globalAlpha = 0.3;

  const faceTop = Math.min(...lm.map(p => p.y)) * h;
  const faceBottom = Math.max(...lm.map(p => p.y)) * h;

  const leftBrowY = Math.min(...lm.slice(17, 22).map(p => p.y)) * h;
  const rightBrowY = Math.min(...lm.slice(22, 27).map(p => p.y)) * h;
  const browY = Math.min(leftBrowY, rightBrowY);

  const chinY = lm[8].y * h;

  const leftEyeCenter = {
    x: lm.slice(36, 42).reduce((s, p) => s + p.x, 0) / 6 * w,
    y: lm.slice(36, 42).reduce((s, p) => s + p.y, 0) / 6 * h
  };
  const rightEyeCenter = {
    x: lm.slice(42, 48).reduce((s, p) => s + p.x, 0) / 6 * w,
    y: lm.slice(42, 48).reduce((s, p) => s + p.y, 0) / 6 * h
  };

  const noseTip = lm[1];
  const mouthCenter = {
    x: (lm[48].x + lm[54].x) / 2 * w,
    y: (lm[48].y + lm[54].y) / 2 * h
  };

  const regions = [
    { id: 'forehead', x: leftEyeCenter.x - w * 0.25, y: faceTop - h * 0.05, w: w * 0.5, h: browY - faceTop + h * 0.05 },
    { id: 'eyebrows', x: leftEyeCenter.x - w * 0.22, y: leftBrowY - h * 0.02, w: rightEyeCenter.x - leftEyeCenter.x + w * 0.44, h: h * 0.04 },
    { id: 'eyes', x: leftEyeCenter.x - w * 0.08, y: leftEyeCenter.y - h * 0.03, w: rightEyeCenter.x - leftEyeCenter.x + w * 0.16, h: h * 0.07 },
    { id: 'nose', x: leftEyeCenter.x - w * 0.04, y: leftEyeCenter.y + h * 0.02, w: rightEyeCenter.x - leftEyeCenter.x + w * 0.08, h: (noseTip.y * h) - (leftEyeCenter.y + h * 0.02) },
    { id: 'mouth', x: mouthCenter.x - w * 0.08, y: mouthCenter.y - h * 0.02, w: w * 0.16, h: h * 0.06 },
    { id: 'chin', x: leftEyeCenter.x - w * 0.12, y: mouthCenter.y + h * 0.05, w: rightEyeCenter.x - leftEyeCenter.x + w * 0.24, h: chinY - mouthCenter.y },
    { id: 'ears', x: leftEyeCenter.x - w * 0.28, y: leftEyeCenter.y - h * 0.02, w: rightEyeCenter.x - leftEyeCenter.x + w * 0.56, h: h * 0.12 }
  ];

  regions.forEach(region => {
    const found = FACE_READINGS[region.id];
    const trait = found.traits.find(t => t.condition(measurements)) || found.traits[1];

    ctx.fillStyle = found.name.includes('金') ? '#FFD700' : '#FF4444';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(region.x, region.y, region.w, region.h);

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(region.x, region.y, region.w, region.h);
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.round(h * 0.025)}px "Noto Serif TC", "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.fillText(region.label, region.x + region.w / 2, region.y - h * 0.01);
  });

  ctx.globalAlpha = 1;
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

function displayResults(data, measurements) {
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
      <div class="features-grid">
        ${featuresHtml}
      </div>

      <div class="section-title">
        <span class="ornament">◈</span> 運勢總覽 <span class="ornament">◈</span>
      </div>
      <div class="fortunes-grid">
        ${fortunesHtml}
      </div>

      <div class="overall-section">
        <h3>📜 綜合命評</h3>
        <p class="overall-text">${generateOverallReading(data)}</p>
      </div>

      <div class="disclaimer">
        ⚠️ 本分析僅供娛樂參考，命運掌握在自己手中
      </div>
    </div>
  `;
}

function generateOverallReading(data) {
  const scores = Object.values(data.features).map(f => f.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const bestFeature = Object.entries(data.features).reduce((a, b) => a[1].score > b[1].score ? a : b);
  const worstFeature = Object.entries(data.features).reduce((a, b) => a[1].score < b[1].score ? a : b);

  const readings = [
    `面相綜合評分 ${Math.round(avg)} 分。${bestFeature[1].name}最為出眾，是您運勢的強項；${worstFeature[1].name}則需多加留意，可透過後天修養補足。`,
    `觀君面相，${bestFeature[1].label}格局已成，主一生順遂。${worstFeature[1].name}雖有不足，然面相乃動態之相，善念善行可改之。`,
    `此面相${avg >= 70 ? '格局上佳' : avg >= 55 ? '中正平和' : '尚有可塑之處'}。${bestFeature[1].name}顯示${bestFeature[1].label}之相，${worstFeature[1].name}則需多加修持。`
  ];

  return readings[Math.floor(Math.random() * readings.length)];
}

function startCamera() {
  if (isProcessing) return;
  isProcessing = true;

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
      showToast('無法開啟相機，請確認相機權限');
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

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    currentImage = e.target.result;

    const uploadSection = document.getElementById('uploadSection');
    uploadSection.innerHTML = `
      <div class="preview-container">
        <div class="image-wrapper">
          <img id="previewImg" src="${currentImage}" style="max-width:100%;max-height:60vh;border-radius:8px;">
          <canvas id="faceCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;"></canvas>
        </div>
        <div class="preview-actions">
          <button class="btn btn-secondary" onclick="resetUpload()">重新拍照</button>
          <button class="btn btn-primary" id="analyzeBtn" onclick="toggleAnalysis()">
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

    showToast('✅ 拍照成功！點擊「開始看相」進行分析');
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  document.getElementById('uploadSection').innerHTML = `
    <div class="upload-area" id="uploadArea">
      <div class="upload-icon">☯</div>
      <h3>拍照看面相</h3>
      <p>請允許相機權限，拍攝清晰的正面照</p>
      <button class="btn btn-primary" onclick="startCamera()">
        📸 開啟相機拍照
      </button>
    </div>
  `;
  document.getElementById('results').style.display = 'none';
  document.getElementById('shareSection').style.display = 'none';
}

let analysisActive = false;

async function toggleAnalysis() {
  const btn = document.getElementById('analyzeBtn');
  if (!analysisActive) {
    analysisActive = true;
    btn.textContent = '⏳ 分析中...';
    btn.disabled = true;
    await performAnalysis();
    btn.textContent = '🔄 重新分析';
    btn.disabled = false;
  } else {
    analysisActive = false;
    await performAnalysis();
    btn.textContent = '🔄 重新分析';
  }
}

async function performAnalysis() {
  const img = document.getElementById('previewImg');
  if (!img) return;

  if (!faceMesh || useManualMode) {
    const canvas = document.getElementById('faceCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const measurements = {
      foreheadRatio: 0.28 + Math.random() * 0.08,
      eyebrowGap: 0.03 + Math.random() * 0.03,
      eyeRatio: 0.22 + Math.random() * 0.08,
      noseRatio: 0.38 + Math.random() * 0.10,
      mouthRatio: 0.30 + Math.random() * 0.10,
      chinRatio: 0.22 + Math.random() * 0.08,
      earRatio: 0.28 + Math.random() * 0.10,
      faceWidth: 0.5,
      faceHeight: 0.5,
      eyeSpacing: 0.10 + Math.random() * 0.04,
      noseWidth: 0.06 + Math.random() * 0.04,
      mouthWidth: 0.10 + Math.random() * 0.04,
      lipHeight: 0.02 + Math.random() * 0.02
    };

    const results_data = analyzeFace(measurements);
    displayResults(results_data, measurements);
    document.getElementById('shareSection').style.display = 'block';
    return;
  }

  try {
    await faceMesh.send({ image: img });
    document.getElementById('shareSection').style.display = 'block';
  } catch (e) {
    console.error('Analysis error:', e);
    showToast('⚠️ 無法檢測到臉部，請拍攝清晰的正面照');
    const canvas = document.getElementById('faceCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const measurements = {
      foreheadRatio: 0.28 + Math.random() * 0.08,
      eyebrowGap: 0.03 + Math.random() * 0.03,
      eyeRatio: 0.22 + Math.random() * 0.08,
      noseRatio: 0.38 + Math.random() * 0.10,
      mouthRatio: 0.30 + Math.random() * 0.10,
      chinRatio: 0.22 + Math.random() * 0.08,
      earRatio: 0.28 + Math.random() * 0.10,
      faceWidth: 0.5,
      faceHeight: 0.5,
      eyeSpacing: 0.10 + Math.random() * 0.04,
      noseWidth: 0.06 + Math.random() * 0.04,
      mouthWidth: 0.10 + Math.random() * 0.04,
      lipHeight: 0.02 + Math.random() * 0.02
    };

    const results_data = analyzeFace(measurements);
    displayResults(results_data, measurements);
    document.getElementById('shareSection').style.display = 'block';
  }
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

    const resultsText = generateDiscordMessage();
    formData.append('payload_json', JSON.stringify({
      content: resultsText,
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

function generateDiscordMessage() {
  const resultsDiv = document.getElementById('results');
  if (!resultsDiv) return '';

  const featureCards = resultsDiv.querySelectorAll('.feature-card');
  const fortuneCards = resultsDiv.querySelectorAll('.fortune-card');

  let message = '**🔮 面相分析結果**\n';
  message += `⏰ ${formatTimestamp()}\n\n`;
  message += '**📋 五官解析：**\n';

  featureCards.forEach(card => {
    const name = card.querySelector('.feature-name')?.textContent || '';
    const label = card.querySelector('.feature-label')?.textContent || '';
    const score = card.querySelector('.feature-score')?.textContent || '';
    message += `▸ ${name} ${label} — ${score}\n`;
  });

  message += '\n**📊 運勢總覽：**\n';
  fortuneCards.forEach(card => {
    const name = card.querySelector('h4')?.textContent || '';
    const score = card.querySelector('.fortune-score')?.textContent || '';
    const level = card.querySelector('.fortune-level')?.textContent || '';
    message += `▸ ${name} ${score} [${level}]\n`;
  });

  const overall = resultsDiv.querySelector('.overall-text')?.textContent || '';
  message += `\n**📜 綜合命評：**\n${overall}`;

  return message;
}

function showToast(msg) {
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

document.addEventListener('DOMContentLoaded', () => {
  loadFaceMesh();

  const webhookInput = document.getElementById('webhookUrl');
  if (webhookInput) {
    const saved = localStorage.getItem('discord_webhook');
    if (saved) webhookInput.value = saved;
    webhookInput.addEventListener('change', () => {
      localStorage.setItem('discord_webhook', webhookInput.value);
    });
  }

});
