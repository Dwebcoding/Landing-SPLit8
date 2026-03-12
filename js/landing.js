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

function bindForm(formId, logLabel, successMessage) {
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const isFormValid = fields.every((field) => validateField(field));
    if (!isFormValid) {
      if (status) {
        status.textContent = 'Controlla i campi evidenziati e riprova.';
        status.classList.remove('is-success');
        status.classList.add('is-error');
      }
      return;
    }

    const payload = serializeForm(form);
    console.log(logLabel, payload);

    if (status) {
      status.textContent = successMessage;
      status.classList.remove('is-error');
      status.classList.add('is-success');
    }

    form.reset();
    clearFormState(form);

    if (status) {
      status.textContent = successMessage;
      status.classList.add('is-success');
    }
  });
}

bindForm('studioForm', 'Richiesta studio:', 'Richiesta raccolta correttamente. Controlla la console per i dati.');
bindForm('tecnicoForm', 'Candidatura tecnico:', 'Candidatura raccolta correttamente. Controlla la console per i dati.');
