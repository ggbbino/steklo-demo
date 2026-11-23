'use strict';

const SERVICES = Object.freeze({
  chip: Object.freeze({ name: 'Ремонт скола', hours: 1 }),
  replacement: Object.freeze({ name: 'Замена стекла', hours: 2 }),
});
const CARS = Object.freeze({
  rio: 'Kia Rio 2019',
  polo: 'Volkswagen Polo 2020',
  vesta: 'Lada Vesta 2021',
});
const DAY_START = 9;
const DAY_END = 18;

function createSchedule(today = new Date()) {
  // Календарь относителен к дате посетителя. UTC используется для арифметики дат.
  const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const days = [];
  for (let offset = 0; offset < 14; offset += 1) {
    if (date.getUTCDay() !== 0) days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const fixtures = [
    [0, 10, 'replacement', 'polo'],
    [0, 14, 'chip', 'vesta'],
    [1, 12, 'chip', 'rio'],
    [2, 15, 'replacement', 'vesta'],
    [4, 11, 'chip', 'polo'],
    [5, 13, 'replacement', 'rio'],
  ];
  let nextId = 1;
  const rows = fixtures.map(([offset, hour, service, car]) => ({
    id: nextId++, day: days[offset], hour, service, car, status: 'booked',
  }));

  function available(day, hour, service) {
    if (!days.includes(day) || !Object.hasOwn(SERVICES, service) ||
        !Number.isInteger(hour) || hour < DAY_START) return false;
    const end = hour + SERVICES[service].hours;
    return end <= DAY_END && !rows.some((row) =>
      row.day === day && row.status === 'booked' &&
      row.hour < end && hour < row.hour + SERVICES[row.service].hours
    );
  }

  function add(day, hour, service, car) {
    if (!Object.hasOwn(CARS, car) || !available(day, hour, service)) return null;
    const row = { id: nextId++, day, hour, service, car, status: 'booked' };
    rows.push(row);
    return { ...row };
  }

  function setStatus(id, status) {
    const row = rows.find((item) => item.id === id);
    if (!row || (status !== 'booked' && status !== 'cancelled')) return false;
    if (row.status === status) return true;
    if (status === 'booked' && !available(row.day, row.hour, row.service)) return false;
    row.status = status;
    return true;
  }

  function list() {
    return rows.map((row) => ({ ...row }))
      .sort((a, b) => a.day.localeCompare(b.day) || a.hour - b.hour || a.id - b.id);
  }

  return { days: Object.freeze(days), available, add, setStatus, list };
}
