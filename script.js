const STORAGE_KEY = 'gene_pre_intake_form_v1';
const OA_LINE_ID = '%40489ydobv';
const steps = [...document.querySelectorAll('.step')];
const form = document.getElementById('intakeForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const previewBtn = document.getElementById('previewBtn');
const lineBtn = document.getElementById('lineBtn');
const copyBtn = document.getElementById('copyBtn');
const previewBox = document.getElementById('previewBox');
const previewText = document.getElementById('previewText');
const toast = document.getElementById('toast');
const currentStepEl = document.getElementById('currentStep');
const stepNameEl = document.getElementById('stepName');
const progressFill = document.getElementById('progressFill');
const hospitalFields = document.getElementById('hospitalFields');

let currentStep = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function updateHospitalVisibility() {
  const value = form.querySelector('input[name="visitedHospital"]:checked')?.value;
  hospitalFields.classList.toggle('hidden', value !== 'はい');
}

function updateStep() {
  steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
  const step = steps[currentStep];
  currentStepEl.textContent = String(currentStep + 1);
  stepNameEl.textContent = step.dataset.name;
  progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  prevBtn.disabled = currentStep === 0;
  nextBtn.classList.toggle('hidden', currentStep === steps.length - 1);
  previewBtn.classList.toggle('hidden', currentStep !== steps.length - 1);
  if (currentStep !== steps.length - 1) {
    lineBtn.classList.add('hidden');
    copyBtn.classList.add('hidden');
    previewBox.classList.add('hidden');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  const step = steps[currentStep];
  const requiredFields = [...step.querySelectorAll('[required]')];

  for (const field of requiredFields) {
    if (field.type === 'checkbox' && !field.checked) {
      showToast('未入力の必須項目があります。');
      field.focus();
      return false;
    }
    if (!field.value || !field.value.trim()) {
      showToast('未入力の必須項目があります。');
      field.focus();
      return false;
    }
  }
  return true;
}

function getCheckedValues(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
}

function serializeForm() {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      if (!Array.isArray(data[key])) data[key] = [data[key]];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  data.symptoms = getCheckedValues('symptoms');
  data.history = getCheckedValues('history');
  return data;
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeForm()));
}

function fillForm(data) {
  Object.entries(data).forEach(([key, value]) => {
    const fields = form.querySelectorAll(`[name="${key}"]`);
    if (!fields.length) return;

    if (fields[0].type === 'checkbox') {
      const values = Array.isArray(value) ? value : [value];
      fields.forEach(field => { field.checked = values.includes(field.value); });
      return;
    }

    if (fields[0].type === 'radio') {
      fields.forEach(field => { field.checked = field.value === value; });
      return;
    }

    fields[0].value = value;
  });
  updateHospitalVisibility();
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    fillForm(JSON.parse(raw));
    showToast('前回の入力内容を復元しました。');
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function clean(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('、');
  return (value || '').toString().trim();
}

function lineIfExists(label, value) {
  const v = clean(value);
  return v ? `${label}：${v}` : '';
}

function buildMessage() {
  const data = serializeForm();

  const lines = [
    '【事前問診】',
    '大阪 自律神経専門整体院 gene',
    '',
    '■ 基本情報',
    lineIfExists('お名前', data.name),
    lineIfExists('フリガナ', data.furigana),
    lineIfExists('年齢', data.age ? `${data.age}歳` : ''),
    lineIfExists('性別', data.gender),
    lineIfExists('お住まい', data.address),
    lineIfExists('お仕事', data.job),
    lineIfExists('勤務先', data.workplace),
    lineIfExists('ご紹介者', data.referrer),
    '',
    '■ 生活習慣',
    lineIfExists('座っている時間', data.sitHours),
    lineIfExists('立っている時間', data.standHours),
    lineIfExists('歩く時間', data.walkHours),
    lineIfExists('運動習慣', data.exerciseFrequency),
    lineIfExists('運動内容', data.exerciseDetail),
    '',
    '■ お困りの症状',
    lineIfExists('症状', data.symptoms),
    lineIfExists('その他の症状', data.symptomsOther),
    '',
    '■ 症状の詳細',
    lineIfExists('いつ頃から', data.sinceWhen),
    lineIfExists('強く感じる時', data.whenStrong),
    lineIfExists('日常生活への影響', data.impact),
    '',
    '■ 医療機関の受診状況',
    lineIfExists('病院受診', data.visitedHospital),
    lineIfExists('病院名', data.hospitalName),
    lineIfExists('診断名', data.diagnosis),
    lineIfExists('受けた処置', data.treatment),
    '',
    '■ 既往歴・服薬',
    lineIfExists('既往歴', data.history),
    lineIfExists('その他の既往歴', data.historyOther),
    lineIfExists('手術歴', data.surgery),
    lineIfExists('服薬', data.medication),
    lineIfExists('服薬内容', data.medicationDetail),
    '',
    '■ その他',
    lineIfExists('気になること / ご要望', data.request)
  ].filter(Boolean);

  return lines.join('\n');
}

function previewMessage() {
  if (!validateCurrentStep()) return;
  const consent = document.getElementById('consent');
  if (!consent.checked) {
    showToast('同意にチェックを入れてください。');
    consent.focus();
    return;
  }

  const message = buildMessage();
  previewText.textContent = message;
  previewBox.classList.remove('hidden');
  lineBtn.classList.remove('hidden');
  copyBtn.classList.remove('hidden');
  showToast('送信内容を確認できます。');
}

function sendToLine() {
  const message = buildMessage();
  const encoded = encodeURIComponent(message);
  const url = `https://line.me/R/oaMessage/${OA_LINE_ID}/?${encoded}`;
  window.location.href = url;
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(buildMessage());
    showToast('送信内容をコピーしました。');
  } catch {
    showToast('コピーに失敗しました。');
  }
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 0) currentStep -= 1;
  updateStep();
});

nextBtn.addEventListener('click', () => {
  if (!validateCurrentStep()) return;
  if (currentStep < steps.length - 1) currentStep += 1;
  updateStep();
});

previewBtn.addEventListener('click', previewMessage);
lineBtn.addEventListener('click', sendToLine);
copyBtn.addEventListener('click', copyMessage);
form.addEventListener('input', saveDraft);
form.addEventListener('change', () => {
  updateHospitalVisibility();
  saveDraft();
});

loadDraft();
updateHospitalVisibility();
updateStep();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
