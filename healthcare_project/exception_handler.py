"""
Custom exception handler for standardized API error responses.
Also logs errors for monitoring (Sentry-compatible).
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404

logger = logging.getLogger('healthcare')


def custom_exception_handler(exc, context):
    """
    Standardized error response format:
    {
        "error": true,
        "status_code": 400,
        "message": "Human readable message",
        "details": {...}  # optional field-level errors
    }
    """
    # Call DRF's default handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize the response format
        error_data = {
            'error': True,
            'status_code': response.status_code,
        }

        if isinstance(response.data, dict):
            if 'detail' in response.data:
                error_data['message'] = str(response.data['detail'])
            else:
                error_data['message'] = 'Validation error'
                error_data['details'] = response.data
        elif isinstance(response.data, list):
            error_data['message'] = '; '.join(str(e) for e in response.data)
        else:
            error_data['message'] = str(response.data)

        response.data = error_data

    else:
        # Handle unhandled exceptions
        if isinstance(exc, DjangoValidationError):
            error_data = {
                'error': True,
                'status_code': 400,
                'message': 'Validation error',
                'details': exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
            }
            response = Response(error_data, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Log unexpected errors
            logger.exception(f"Unhandled exception in {context.get('view', 'unknown')}: {exc}")

            error_data = {
                'error': True,
                'status_code': 500,
                'message': 'An internal server error occurred. Please try again later.',
            }
            response = Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
