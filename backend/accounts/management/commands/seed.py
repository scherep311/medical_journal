from django.core.management.base import BaseCommand

from accounts.models import User, UserRole
from journal.models import MedicalService


class Command(BaseCommand):

    def handle(self, *args, **options):
        for username, password, role in [
            ("operator", "operator123", UserRole.OPERATOR),
            ("viewer", "viewer123", UserRole.VIEWER),
        ]:
            user, created = User.objects.get_or_create(username=username, defaults={"role": role})
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"Создан пользователь {username} ({role})")
            else:
                self.stdout.write(f"Пользователь {username} уже существует")

        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={"role": UserRole.ADMIN, "is_staff": True, "is_superuser": True},
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write("Создан администратор admin (доступ в /admin/)")
        else:
            self.stdout.write("Пользователь admin уже существует")

        for name in ["Терапевт", "Кардиолог", "Стоматолог", "Офтальмолог"]:
            _, created = MedicalService.objects.get_or_create(name=name)
            if created:
                self.stdout.write(f"Создана услуга {name}")

        self.stdout.write(self.style.SUCCESS("Сидирование завершено."))
