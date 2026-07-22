import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

from journal.exceptions import InvalidTransitionError, StatusChangeValidationError, RequestEditNotAllowedError

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, (InvalidTransitionError, RequestEditNotAllowedError)):
        return Response({"detail": str(exc), "errors": None}, status=status.HTTP_409_CONFLICT)

    if isinstance(exc, StatusChangeValidationError):
        return Response({"detail": str(exc), "errors": None}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    if response is not None:
        if isinstance(response.data, dict) and list(response.data.keys()) == ["detail"]:
            response.data = {"detail": response.data["detail"], "errors": None}
        else:
            response.data = {"detail": "Ошибка валидации.", "errors": response.data}
        return response

    logger.exception("Unhandled exception")
    return Response({"detail": "Внутренняя ошибка сервера.", "errors": None}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)