export function validateSnils(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length !== 11) return 'СНИЛС должен состоять из 11 цифр.';

  const number = parseInt(digits, 10);
  if (number <= 1001998) return null;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (9 - i);

  let checkSum;
  if (sum < 100) checkSum = sum;
  else if (sum === 100 || sum === 101) checkSum = 0;
  else {
    checkSum = sum % 101;
    if (checkSum === 100 || checkSum === 101) checkSum = 0;
  }

  return checkSum !== Number(digits.slice(9)) ? 'Неверное контрольное число СНИЛС.' : null;
}

export function validateFutureDate(value) {
  if (!value) return 'Укажите желаемую дату приёма.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(value) < today) return 'Дата не может быть в прошлом.';
  return null;
}

const FIO_RE = /^[А-ЯЁа-яё]+(-[А-ЯЁа-яё]+)?(\s[А-ЯЁа-яё]+(-[А-ЯЁа-яё]+)?){1,2}$/;

export function validateFio(value) {
  if (!FIO_RE.test((value || '').trim())) {
    return 'ФИО должно быть на русском языке: фамилия и имя (отчество не обязательно).';
  }
  return null;
}

export function validatePhone(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length !== 11 || !digits.startsWith('7')) {
    return 'Укажите телефон в формате +7 (XXX) XXX-XX-XX.';
  }
  return null;
}
