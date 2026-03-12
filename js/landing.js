const GITHUB_PAGES_API_BASE = 'https://split8-landing.vercel.app';
const FORM_ENDPOINT = `${window.location.hostname.endsWith('github.io') ? GITHUB_PAGES_API_BASE : ''}/api/submit`;

function serializeForm(form) {
  const formData = new FormData(form);
  return Object.fromEntries(
    Array.from(formData.entries(), ([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
  );
}

function setFieldValidity(field, isValid) {
  field.classList.toggle('invalid', !isValid);
}

function validateField(field) {
  const control = field.querySelector('input, select, textarea');
  if (!control) {
    return true;
  }

  const value = control.value.trim();
  let isValid = true;

  if (control.hasAttribute('required') && !value) {
    isValid = false;
  }

  if (isValid && control.type === 'email' && value) {
    isValid = control.checkValidity();
  }

  if (isValid && control.type === 'number' && value) {
    isValid = Number(value) >= Number(control.min || 0);
  }

  setFieldValidity(field, isValid);
  return isValid;
}

function clearFormState(form) {
  form.querySelectorAll('.field').forEach((field) => setFieldValidity(field, true));

  const status = form.querySelector('.form-status');
  if (status) {
    status.textContent = '';
    status.classList.remove('is-error', 'is-success');
  }
}

function setStatus(status, message, state) {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.remove('is-error', 'is-success');

  if (state) {
    status.classList.add(state);
  }
}

async function submitForm(payload) {
  const response = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Invio non riuscito.');
  }

  return result;
}

function bindForm(formId, formType, successMessage) {
  const form = document.getElementById(formId);
  if (!form) {
    return;
  }

  const fields = Array.from(form.querySelectorAll('.field'));
  const status = form.querySelector('.form-status');

  fields.forEach((field) => {
    const control = field.querySelector('input, select, textarea');
    if (!control) {
      return;
    }

    const eventName = control.tagName === 'SELECT' ? 'change' : 'input';
    control.addEventListener(eventName, () => {
      validateField(field);
      if (status && status.classList.contains('is-error')) {
        status.textContent = '';
        status.classList.remove('is-error');
      }
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const isFormValid = fields.every((field) => validateField(field));
    if (!isFormValid) {
      setStatus(status, 'Controlla i campi evidenziati e riprova.', 'is-error');
      return;
    }

    const payload = {
      formType,
      submittedAt: new Date().toISOString(),
      data: serializeForm(form)
    };

    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalLabel = submitButton.textContent;
      submitButton.textContent = 'Invio in corso...';
    }

    setStatus(status, 'Invio in corso...', '');

    try {
      const result = await submitForm(payload);
      console.log('Form inviato:', result);

      form.reset();
      clearFormState(form);
      setStatus(status, successMessage, 'is-success');
    } catch (error) {
      setStatus(status, error.message || 'Errore durante l\'invio.', 'is-error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalLabel || submitButton.textContent;
      }
    }
  });
}

bindForm('studioForm', 'studio', 'Richiesta inviata correttamente. Ti contatteremo a breve.');
bindForm('tecnicoForm', 'tecnico', 'Candidatura inviata correttamente. Ti contatteremo a breve.');
