const STORAGE_KEY = 'gene_pre_intake_form_v2';
const LINE_SHARE_URL = 'https://line.me/R/msg/text/?';

const form = document.getElementById('intakeForm');
const steps = Array.from(document.querySelectorAll('.form-step'));
const currentStepEl = document.getElementById('currentStep');
const stepTitleEl = document.getElementById('stepTitle');
const progressFill = document.getElementById('progressFill');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitWrap = document.getElementById('submitWrap');
const saveStatus = document.getElementById('saveStatus');
const hospitalFields = document.getElementById('hospitalFields');
const medicationFields = document.getElementById('medicationFields');
const clearBtn = document.getElementById('clearBtn');
const resultCard = document.getElementById('resultCard');
const resultBody = document.getElementById('resultBody');
const editBtn = document.getElementById('editBtn');
const copyBtn = document.getElementById('copyBtn');
const lineShareBtn = document.getElementById('lineShareBtn');

let currentStep = 1;

function updateConditionalAreas() {
  const visit = form.querySelector('input[name="hospitalVisit"]:checked')?.value;
  const medication = form.querySelector('input[name="medication"]:checked')?.value;
  hospitalFields.classList.toggle('hidden', visit !== 'はい');
  medicationFields.classList.toggle('hidden', medication !== 'あり');
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
  window.clearTimeout(setSaveStatus.timer);
  setSaveStatus.timer = window.setTimeout(() => {
    saveStatus.textContent = '入力内容は自動保存されます';
  }, 2200);
}

function getStepTitle(step) {
  return steps[step - 1]?.dataset.title || '';
}

function updateStepUI() {
  steps.forEach((stepEl, index) => {
    stepEl.classList.toggle('active', index + 1 === currentStep);
  });

  currentStepEl.textContent = String(currentStep);
  stepTitleEl.textContent = getStepTitle(currentStep);
  progressFill.style.width = `${(currentStep / steps.length) * 100}%`;

  prevBtn.disabled = currentStep === 1;
  prevBtn.style.opacity = currentStep === 1 ? '0.5' : '1';

  const isLast = currentStep === steps.length;
  nextBtn.classList.toggle('hidden', isLast);
  submitWrap.classList.toggle('hidden', !isLast);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function serializeForm() {
  const data = {};

  Array.from(form.elements).forEach((el) => {
    if (!el.name) return;

    if (el.type === 'checkbox') {
      if (!data[el.name]) data[el.name] = [];
      if (el.checked) data[el.name].push(el.value || true);
      return;
    }

    if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
      return;
    }

    if (el.type !== 'submit' && el.type !== 'button') {
      data[el.name] = el.value.trim();
    }
  });

  data.__savedAt = new Date().toISOString();
  return data;
}

function applyFormData(data) {
  if (!data || typeof data !== 'object') return;

  Array.from(form.elements).forEach((el) => {
    if (!el.name || !(el.name in data)) return;

    if (el.type === 'checkbox') {
      el.checked = Array.isArray(data[el.name]) && data[el.name].includes(el.value || true);
      return;
    }

    if (el.type === 'radio') {
      el.checked = data[el.name] === el.value;
      return;
    }

    if (typeof data[el.name] === 'string') {
      el.value = data[el.name];
    }
  });

  updateConditionalAreas();
}

function saveForm() {
  const data = serializeForm();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  setSaveStatus('入力内容を保存しました');
}

function loadForm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    applyFormData(parsed);
  } catch (error) {
    console.error(error);
  }
}

function clearErrors(stepEl) {
  stepEl.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
}

function validateStep(step) {
  const stepEl = steps[step - 1];
  clearErrors(stepEl);
  const requiredFields = Array.from(stepEl.querySelectorAll('[required]'));
  let firstInvalid = null;

  requiredFields.forEach((field) => {
    const type = field.type;
    let valid = true;

    if (type === 'checkbox') {
      valid = field.checked;
      if (!valid) field.closest('.checkbox-line')?.classList.add('error');
    } else if (type === 'radio') {
      const group = stepEl.querySelectorAll(`input[name="${field.name}"]`);
      valid = Array.from(group).some((radio) => radio.checked);
      if (!valid) group.forEach((radio) => radio.closest('.choice-pill')?.classList.add('error'));
    } else {
      valid = field.value.trim() !== '';
      if (!valid) field.classList.add('error');
    }

    if (!valid && !firstInvalid) firstInvalid = field;
  });

  if (!firstInvalid) return true;

  firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
}

function sectionMarkup(title, lines) {
  const filtered = lines.filter(Boolean);
  if (!filtered.length) return '';
  return `
    <div class="result-item">
      <h3>${title}</h3>
      ${filtered.map((line) => `<p>${line}</p>`).join('')}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatList(value) {
  if (!Array.isArray(value) || !value.length) return 'なし';
  return value.join('、');
}

function buildResult(data) {
  const sections = [
    sectionMarkup('基本情報', [
      `お名前：${escapeHtml(data.name || '未入力')}`,
      `フリガナ：${escapeHtml(data.kana || '未入力')}`,
      `年齢：${escapeHtml(data.age || '未入力')}`,
      `生年月日：${escapeHtml(data.birthdate || '未入力')}`,
      `性別：${escapeHtml(data.gender || '未入力')}`,
      `お住まい：${escapeHtml(data.city || '未入力')}`,
      `お仕事：${escapeHtml(data.job || '未入力')}`,
      `勤務先：${escapeHtml(data.workplace || '未入力')}`,
      `ご紹介者：${escapeHtml(data.referrer || '未入力')}`,
    ]),
    sectionMarkup('生活習慣', [
      `座っている時間：${escapeHtml(data.sitTime || '未選択')}`,
      `立っている時間：${escapeHtml(data.standTime || '未選択')}`,
      `歩く時間：${escapeHtml(data.walkTime || '未選択')}`,
      `運動習慣：${escapeHtml(data.exercise || '未選択')}`,
      `運動内容・趣味：${escapeHtml(data.exerciseDetail || 'なし')}`,
    ]),
    sectionMarkup('お困りの症状', [
      `症状：${escapeHtml(formatList(data.symptoms))}`,
      `その他の症状：${escapeHtml(data.symptomOther || 'なし')}`,
    ]),
    sectionMarkup('症状の詳細', [
      `いつ頃から：${escapeHtml(data.since || '未入力')}`,
      `強く感じる時：${escapeHtml(data.trigger || '未入力')}`,
      `日常生活への影響：${escapeHtml(data.impact || '未選択')}`,
    ]),
    sectionMarkup('医療機関の受診状況', [
      `受診状況：${escapeHtml(data.hospitalVisit || '未選択')}`,
      data.hospitalVisit === 'はい' ? `病院名：${escapeHtml(data.hospitalName || '未入力')}` : '',
      data.hospitalVisit === 'はい' ? `診断名：${escapeHtml(data.diagnosis || '未入力')}` : '',
      data.hospitalVisit === 'はい' ? `処置：${escapeHtml(data.treatment || '未入力')}` : '',
    ]),
    sectionMarkup('既往歴・服薬', [
      `既往歴：${escapeHtml(formatList(data.history))}`,
      `既往歴・その他詳細：${escapeHtml(data.historyOther || 'なし')}`,
      `手術歴：${escapeHtml(data.surgery || 'なし')}`,
      `服薬：${escapeHtml(data.medication || '未選択')}`,
      data.medication === 'あり' ? `服薬内容：${escapeHtml(data.medicationDetail || '未入力')}` : '',
    ]),
    sectionMarkup('その他・ご要望', [
      `気になること・ご要望：${escapeHtml(data.requests || 'なし')}`,
    ]),
  ];

  resultBody.innerHTML = sections.join('');

  const lineText = [
    '【大阪 自律神経専門整体院 gene 事前問診フォーム】',
    `お名前：${data.name || ''}`,
    `フリガナ：${data.kana || ''}`,
    `年齢：${data.age || ''}`,
    `性別：${data.gender || ''}`,
    `お住まい：${data.city || ''}`,
    `お仕事：${data.job || ''}`,
    `勤務先：${data.workplace || ''}`,
    `ご紹介者：${data.referrer || ''}`,
    '',
    `座っている時間：${data.sitTime || ''}`,
    `立っている時間：${data.standTime || ''}`,
    `歩く時間：${data.walkTime || ''}`,
    `運動習慣：${data.exercise || ''}`,
    `運動内容・趣味：${data.exerciseDetail || ''}`,
    '',
    `症状：${Array.isArray(data.symptoms) ? data.symptoms.join('、') : ''}`,
    `その他の症状：${data.symptomOther || ''}`,
    `いつ頃から：${data.since || ''}`,
    `強く感じる時：${data.trigger || ''}`,
    `日常生活への影響：${data.impact || ''}`,
    '',
    `受診状況：${data.hospitalVisit || ''}`,
    `病院名：${data.hospitalName || ''}`,
    `診断名：${data.diagnosis || ''}`,
    `処置：${data.treatment || ''}`,
    '',
    `既往歴：${Array.isArray(data.history) ? data.history.join('、') : ''}`,
    `既往歴・その他詳細：${data.historyOther || ''}`,
    `手術歴：${data.surgery || ''}`,
    `服薬：${data.medication || ''}`,
    `服薬内容：${data.medicationDetail || ''}`,
    '',
    `ご要望：${data.requests || ''}`,
  ].join('\n');

  lineShareBtn.href = `${LINE_SHARE_URL}${encodeURIComponent(lineText)}`;
}



async function copyResultText() {
  const data = serializeForm();
  const text = [
    '【大阪 自律神経専門整体院 gene 事前問診フォーム】',
    `お名前：${data.name || ''}`,
    `フリガナ：${data.kana || ''}`,
    `年齢：${data.age || ''}`,
    `生年月日：${data.birthdate || ''}`,
    `性別：${data.gender || ''}`,
    `お住まい：${data.city || ''}`,
    `お仕事：${data.job || ''}`,
    `勤務先：${data.workplace || ''}`,
    `ご紹介者：${data.referrer || ''}`,
    '',
    `座っている時間：${data.sitTime || ''}`,
    `立っている時間：${data.standTime || ''}`,
    `歩く時間：${data.walkTime || ''}`,
    `運動習慣：${data.exercise || ''}`,
    `運動内容・趣味：${data.exerciseDetail || ''}`,
    '',
    `症状：${Array.isArray(data.symptoms) ? data.symptoms.join('、') : ''}`,
    `その他の症状：${data.symptomOther || ''}`,
    `いつ頃から：${data.since || ''}`,
    `強く感じる時：${data.trigger || ''}`,
    `日常生活への影響：${data.impact || ''}`,
    '',
    `受診状況：${data.hospitalVisit || ''}`,
    `病院名：${data.hospitalName || ''}`,
    `診断名：${data.diagnosis || ''}`,
    `処置：${data.treatment || ''}`,
    '',
    `既往歴：${Array.isArray(data.history) ? data.history.join('、') : ''}`,
    `既往歴・その他詳細：${data.historyOther || ''}`,
    `手術歴：${data.surgery || ''}`,
    `服薬：${data.medication || ''}`,
    `服薬内容：${data.medicationDetail || ''}`,
    '',
    `気になること・ご要望：${data.requests || ''}`
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    setSaveStatus('入力内容をコピーしました');
  } catch (error) {
    console.error(error);
    window.prompt('コピーできない場合は、下の内容をコピーしてください。', text);
  }
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep -= 1;
    updateStepUI();
  }
});

nextBtn.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  if (currentStep < steps.length) {
    currentStep += 1;
    updateStepUI();
  }
});

form.addEventListener('input', () => {
  updateConditionalAreas();
  saveForm();
});

form.addEventListener('change', () => {
  updateConditionalAreas();
  saveForm();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateStep(currentStep)) return;

  const data = serializeForm();
  buildResult(data);
  resultCard.classList.remove('hidden');
  form.classList.add('hidden');
  document.querySelector('.progress-card').classList.add('hidden');
  document.querySelector('.intro-card').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

copyBtn?.addEventListener('click', copyResultText);

editBtn.addEventListener('click', () => {
  resultCard.classList.add('hidden');
  form.classList.remove('hidden');
  document.querySelector('.progress-card').classList.remove('hidden');
  document.querySelector('.intro-card').classList.remove('hidden');
  updateStepUI();
});

clearBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  form.reset();
  updateConditionalAreas();
  currentStep = 1;
  updateStepUI();
  setSaveStatus('入力内容をリセットしました');
});


loadForm();
updateConditionalAreas();
updateStepUI();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => console.error(error));
  });
}
