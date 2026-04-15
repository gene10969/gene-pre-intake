const STORAGE_KEY = 'gene_pre_intake_v1';
const steps = Array.from(document.querySelectorAll('.step'));
const form = document.getElementById('intakeForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const summarySection = document.getElementById('summarySection');
const summaryContent = document.getElementById('summaryContent');
const editBtn = document.getElementById('editBtn');
const copyBtn = document.getElementById('copyBtn');
const lineShareBtn = document.getElementById('lineShareBtn');
const hospitalFields = document.getElementById('hospitalFields');
const medicineDetailsWrap = document.getElementById('medicineDetailsWrap');
const currentStepText = document.getElementById('currentStepText');
const currentStepLabel = document.getElementById('currentStepLabel');
const progressBar = document.getElementById('progressBar');
let currentStep = 0;

function saveFormState() {
  const data = getFormData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFormState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([name, value]) => {
      const elements = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      if (!elements.length) return;
      const first = elements[0];
      if (first.type === 'checkbox') {
        elements.forEach(el => {
          el.checked = Array.isArray(value) ? value.includes(el.value) : Boolean(value);
        });
      } else if (first.type === 'radio') {
        elements.forEach(el => {
          el.checked = el.value === value;
        });
      } else {
        first.value = value ?? '';
      }
    });
  } catch (_) {}
}

function getFormData() {
  const data = {};
  const elements = Array.from(form.elements).filter(el => el.name);
  const grouped = new Map();

  elements.forEach(el => {
    if (!grouped.has(el.name)) grouped.set(el.name, []);
    grouped.get(el.name).push(el);
  });

  grouped.forEach((group, name) => {
    const first = group[0];
    if (first.type === 'checkbox') {
      if (group.length === 1) {
        data[name] = first.checked;
      } else {
        data[name] = group.filter(el => el.checked).map(el => el.value);
      }
    } else if (first.type === 'radio') {
      const checked = group.find(el => el.checked);
      data[name] = checked ? checked.value : '';
    } else {
      data[name] = first.value.trim();
    }
  });

  return data;
}

function showConditionalFields() {
  const hospitalVisited = form.querySelector('input[name="hospitalVisited"]:checked')?.value;
  hospitalFields.style.display = hospitalVisited === 'はい' ? 'grid' : 'none';

  const medicine = form.querySelector('input[name="medicine"]:checked')?.value;
  medicineDetailsWrap.style.display = medicine === 'あり' ? 'flex' : 'none';
}

function updateStep() {
  steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
  currentStepText.textContent = String(currentStep + 1);
  currentStepLabel.textContent = steps[currentStep].dataset.title;
  progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  prevBtn.classList.toggle('hidden', currentStep === 0);
  nextBtn.classList.toggle('hidden', currentStep === steps.length - 1);
  submitBtn.classList.toggle('hidden', currentStep !== steps.length - 1);
  window.scrollTo({ top: document.getElementById('form-card').offsetTop - 12, behavior: 'smooth' });
}

function clearErrors(step) {
  step.querySelectorAll('.error').forEach(el => el.remove());
}

function addError(fieldContainer, message) {
  const error = document.createElement('p');
  error.className = 'error';
  error.textContent = message;
  fieldContainer.appendChild(error);
}

function validateStep(stepIndex) {
  const step = steps[stepIndex];
  clearErrors(step);
  let valid = true;
  const requiredFields = step.querySelectorAll('[required]');
  requiredFields.forEach(input => {
    const field = input.closest('.field') || input.parentElement;
    if (input.type === 'checkbox') {
      if (!input.checked) {
        addError(field, '確認のうえチェックを入れてください。');
        valid = false;
      }
      return;
    }
    if (!input.value.trim()) {
      addError(field, '入力してください。');
      valid = false;
    }
  });

  if (stepIndex === 2) {
    const checked = form.querySelectorAll('input[name="symptoms"]:checked').length;
    if (!checked) {
      const symptomGroup = step.querySelector('.symptom-groups');
      addError(symptomGroup, '症状を1つ以上選択してください。');
      valid = false;
    }
  }

  return valid;
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.join('、') : '未入力';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  return value ? value : '未入力';
}

function buildSummary(data) {
  const fields = [
    ['お名前', data.name],
    ['フリガナ', data.furigana],
    ['年齢', data.age ? `${data.age}歳` : ''],
    ['性別', data.gender],
    ['お住まい', data.city],
    ['お仕事', data.occupation],
    ['勤務先', data.workplace],
    ['ご紹介者', data.referrer],
    ['座っている時間', data.sitTime],
    ['立っている時間', data.standTime],
    ['歩く時間', data.walkTime],
    ['運動習慣', data.exerciseFreq],
    ['運動内容', data.exerciseDetails],
    ['お困りの症状', data.symptoms],
    ['その他の症状', data.symptomOther],
    ['いつ頃から', data.sinceWhen],
    ['強く感じる時', data.whenStronger],
    ['日常生活への影響', data.impact],
    ['病院受診', data.hospitalVisited],
    ['病院名', data.hospitalName],
    ['診断名', data.diagnosis],
    ['受けた処置', data.treatment],
    ['既往歴', data.history],
    ['その他の既往歴', data.historyOther],
    ['手術歴', data.surgeryHistory],
    ['服薬', data.medicine],
    ['服薬内容', data.medicineDetails],
    ['気になること・ご要望', data.requests],
  ];

  summaryContent.innerHTML = '';
  fields.forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `<h3>${label}</h3><p>${escapeHtml(formatValue(value))}</p>`;
    summaryContent.appendChild(item);
  });

  const summaryText = [
    '【大阪 自律神経専門整体院 GENE｜事前問診】',
    ...fields.map(([label, value]) => `${label}：${Array.isArray(value) ? value.join('、') || '未入力' : (value ? value : '未入力')}`),
  ].join('\n');

  const encoded = encodeURIComponent(summaryText);
  lineShareBtn.href = `https://line.me/R/msg/text/?${encoded}`;
  lineShareBtn.dataset.copy = summaryText;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep -= 1;
    updateStep();
  }
});

nextBtn.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    updateStep();
  }
});

form.addEventListener('input', () => {
  saveFormState();
  showConditionalFields();
});
form.addEventListener('change', () => {
  saveFormState();
  showConditionalFields();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateStep(currentStep)) return;
  const data = getFormData();
  buildSummary(data);
  form.classList.add('hidden');
  summarySection.classList.remove('hidden');
  summarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

editBtn.addEventListener('click', () => {
  summarySection.classList.add('hidden');
  form.classList.remove('hidden');
  document.getElementById('form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

copyBtn.addEventListener('click', async () => {
  const text = lineShareBtn.dataset.copy || '';
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'コピーしました';
    setTimeout(() => { copyBtn.textContent = '内容をコピーする'; }, 1800);
  } catch (_) {
    alert('コピーできませんでした。手動で選択してコピーしてください。');
  }
});

loadFormState();
showConditionalFields();
updateStep();
medicineDetailsWrap.style.display = 'none';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
