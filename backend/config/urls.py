from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import LoginView
from journal.views import MedicalServiceViewSet, MedicalRequestViewSet

router = DefaultRouter()
router.register('services', MedicalServiceViewSet, basename='service')
router.register('requests', MedicalRequestViewSet, basename='request')

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('api/', include(router.urls)),
]