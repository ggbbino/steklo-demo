'use strict';

const schedule = createSchedule();
const byId = (id) => document.getElementById(id);
const shortDay = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', timeZone: 'UTC',
});
const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' });
const longDay = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
});
const asDate = (day) => new Date(day + 'T00:00:00Z');
const hourLabel = (hour) => hour + ':00';
let service = null;
let day = null;
let hour = null;
let currentView = 'booking';

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function choice(text, caption, selected, enabled, onSelect) {
  const button = element('button', text);
  button.type = 'button';
  button.disabled = !enabled;
  button.setAttribute('aria-pressed', String(selected));
  if (caption) button.append(element('small', caption));
  button.addEventListener('click', onSelect);
  return button;
}

function hoursFor(type) {
  return Array.from({ length: DAY_END - DAY_START - SERVICES[type].hours + 1 },
    (_, offset) => DAY_START + offset);
}

function showSummary(box, row) {
  const { name, hours } = SERVICES[row.service];
  box.className = 'summary ' + row.service;
  box.replaceChildren(
    element('div', name, 'head'),
    element('div', longDay.format(asDate(row.day))),
    element('div', hourLabel(row.hour) + '–' + hourLabel(row.hour + hours)),
    element('div', CARS[row.car], 'muted'),
  );
}

function renderBooking(focus) {
  const fittingHours = service ? hoursFor(service) : [];
  const fits = (date) => fittingHours.some((start) => schedule.available(date, start, service));
  if (service && !fits(day)) day = schedule.days.find(fits) || null;
  if (hour !== null && !schedule.available(day, hour, service)) hour = null;

  for (const type of Object.keys(SERVICES)) {
    byId('type-' + type).setAttribute('aria-pressed', String(service === type));
  }
  byId('day-step').classList.toggle('hidden', !service);
  byId('time-step').classList.toggle('hidden', !day);
  byId('form-step').classList.toggle('hidden', hour === null);
  byId('booking-status').textContent = service && !day ? 'Свободных окон нет.' : '';
  if (!service) return;

  byId('days').replaceChildren(...schedule.days.map((date) => {
    const enabled = fits(date);
    return choice(shortDay.format(asDate(date)),
      enabled ? weekday.format(asDate(date)) : 'нет мест', date === day, enabled, () => {
        day = date;
        hour = null;
        renderBooking('day');
      });
  }));
  if (focus === 'day') byId('days').querySelector('[aria-pressed="true"]')?.focus();
  if (!day) return;

  byId('time-day').textContent = longDay.format(asDate(day));
  byId('times').replaceChildren(...fittingHours.map((start) => {
    const enabled = schedule.available(day, start, service);
    return choice(hourLabel(start), enabled ? '' : 'занято', start === hour, enabled, () => {
      hour = start;
      renderBooking('car');
    });
  }));
  if (hour !== null) showSummary(byId('summary'), { day, hour, service, car: byId('car').value });
  if (focus === 'car') byId('car').focus();
}

for (const type of Object.keys(SERVICES)) {
  byId('type-' + type).addEventListener('click', () => {
    service = type;
    hour = null;
    renderBooking();
  });
}
byId('car').addEventListener('change', () => renderBooking());
byId('book').addEventListener('click', () => {
  const booking = schedule.add(day, hour, service, byId('car').value);
  if (!booking) {
    renderBooking();
    byId('booking-status').textContent = 'Выберите свободное время.';
    return;
  }
  showSummary(byId('done-summary'), booking);
  byId('book-screen').classList.add('hidden');
  byId('done-screen').classList.remove('hidden');
  byId('done-title').focus();
});
byId('again').addEventListener('click', () => {
  hour = null;
  byId('done-screen').classList.add('hidden');
  byId('book-screen').classList.remove('hidden');
  renderBooking();
  byId('times').querySelector('button:not(:disabled)')?.focus();
});

function makeCard(row, editable) {
  const card = element('article', '');
  showSummary(card, row);
  const cancelled = row.status === 'cancelled';
  card.append(element('div', cancelled ? 'Отменена' : 'Активна', 'muted'));
  if (!editable) return card;

  const action = element('button', cancelled ? 'Восстановить запись' : 'Отменить запись', 'secondary');
  action.type = 'button';
  action.dataset.bookingId = String(row.id);
  action.addEventListener('click', () => {
    const updated = schedule.setStatus(row.id, cancelled ? 'booked' : 'cancelled');
    byId('staff-status').textContent = updated
      ? (cancelled ? 'Запись восстановлена.' : 'Запись отменена.')
      : 'Восстановить запись нельзя, это время уже занято.';
    if (updated) {
      renderStaff();
      byId('staff-list').querySelector('[data-booking-id="' + row.id + '"]')?.focus();
    }
  });
  card.append(action);
  return card;
}

function renderStaff() {
  const selected = byId('staff-day').value;
  const rows = schedule.list().filter((row) => row.day === selected);
  byId('staff-list').replaceChildren(...(rows.length
    ? rows.map((row) => makeCard(row, true))
    : [element('p', 'На этот день записей нет.', 'muted')]));
}

function renderRecords() {
  const selected = byId('record-filter').value;
  const rows = schedule.list().filter((row) => selected === 'all' || row.status === selected);
  byId('record-count').textContent = 'Записей: ' + rows.length;
  byId('record-list').replaceChildren(...rows.map((row) => makeCard(row, false)));
}

byId('staff-day').append(...schedule.days.map((date) => {
  const option = element('option', longDay.format(asDate(date)));
  option.value = date;
  return option;
}));
byId('staff-day').addEventListener('change', () => {
  byId('staff-status').textContent = '';
  renderStaff();
});
byId('record-filter').addEventListener('change', renderRecords);

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    const target = button.dataset.view;
    byId(currentView).classList.add('hidden');
    document.querySelector('[data-view="' + currentView + '"]').setAttribute('aria-pressed', 'false');
    currentView = target;
    byId(currentView).classList.remove('hidden');
    button.setAttribute('aria-pressed', 'true');
    if (target === 'booking') renderBooking();
    if (target === 'staff') renderStaff();
    if (target === 'records') renderRecords();
  });
}
