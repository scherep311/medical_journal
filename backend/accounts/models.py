from django.contrib.auth.models import AbstractUser
from django.db import models

class UserRole(models.TextChoices):
    OPERATOR = 'OPERATOR', 'Оператор'
    VIEWER = 'VIEWER', 'Руководитель'
    ADMIN = 'ADMIN', 'Администратор'

class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER,
        verbose_name="Роль"
    )

    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f"{self.username} ({self.role})"