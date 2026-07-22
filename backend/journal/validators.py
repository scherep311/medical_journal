import re
from django.core.exceptions import ValidationError
from django.utils import timezone


def validate_snils(value):
    digits = re.sub(r'\D', '', value)

    if len(digits) != 11:
        raise ValidationError("СНИЛС должен состоять из 11 цифр.")

    if int(digits) <= 1001998:
        return

    sum_val = sum(int(digits[i]) * (9 - i) for i in range(9))
    check_sum = int(digits[9:])

    if sum_val < 100:
        calc_sum = sum_val
    elif sum_val in (100, 101):
        calc_sum = 0
    else:
        calc_sum = sum_val % 101
        if calc_sum in (100, 101):
            calc_sum = 0

    if calc_sum != check_sum:
        raise ValidationError("Неверное контрольное число СНИЛС.")


def validate_future_date(value):
    if value < timezone.now().date():
        raise ValidationError("Желаемая дата приёма не может быть в прошлом.")


FIO_RE = re.compile(r'^[А-ЯЁа-яё]+(-[А-ЯЁа-яё]+)?(\s[А-ЯЁа-яё]+(-[А-ЯЁа-яё]+)?){1,2}$')


def validate_fio(value):
    if not FIO_RE.match(value.strip()):
        raise ValidationError("ФИО должно быть на русском языке: фамилия и имя (отчество не обязательно).")


def validate_phone(value):
    digits = re.sub(r'\D', '', value)
    if len(digits) != 11 or not digits.startswith('7'):
        raise ValidationError("Телефон должен быть в формате +7 (XXX) XXX-XX-XX.")