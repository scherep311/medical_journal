export const SNILS_PATTERN = '999-999-999 99';
export const PHONE_PATTERN = '(999) 999-99-99';

function onlyDigits(value) {
  return (value || '').replace(/\D/g, '');
}

function formatDigits(digits, pattern) {
  let out = '';
  let di = 0;
  for (let i = 0; i < pattern.length && di < digits.length; i++) {
    if (pattern[i] === '9') {
      out += digits[di];
      di++;
    } else {
      out += pattern[i];
    }
  }
  return out;
}

export default function MaskedInput({ pattern, value, onChange, className, placeholder }) {
  const maxDigits = pattern.split('').filter((c) => c === '9').length;

  const handleChange = (e) => {
    const digits = onlyDigits(e.target.value).slice(0, maxDigits);
    onChange(formatDigits(digits, pattern));
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
    />
  );
}
