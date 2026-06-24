import threading
import json
from django.utils.deprecation import MiddlewareMixin

_thread_local = threading.local()


def get_current_request():
    return getattr(_thread_local, 'request', None)


class AuditMiddleware(MiddlewareMixin):
    """Middleware to capture current request for audit logging"""

    def process_request(self, request):
        _thread_local.request = request
        # Cache request body early so it's available in process_response
        # after DRF has consumed the stream via request.data
        if request.content_type == 'application/json' and request.method in ('POST', 'PUT', 'PATCH'):
            request._audit_body = request.body

    def process_response(self, request, response):
        # Log API write operations automatically
        if (request.method in ('POST', 'PUT', 'PATCH', 'DELETE')
                and hasattr(request, 'user') and request.user.is_authenticated
                and request.path.startswith('/api/')):

            from .models import AuditLog

            # Determine action from HTTP method
            action_map = {
                'POST': 'CREATE',
                'PUT': 'UPDATE',
                'PATCH': 'UPDATE',
                'DELETE': 'DELETE',
            }
            action = action_map.get(request.method, 'UPDATE')

            # Extract model name from URL path
            path_parts = [p for p in request.path.split('/') if p and p != 'api']
            model_name = path_parts[0] if path_parts else 'unknown'

            # Extract object ID if available
            object_id = ''
            if len(path_parts) >= 2 and path_parts[-1].isdigit():
                object_id = path_parts[-1]
            elif len(path_parts) >= 2 and path_parts[-2].isdigit():
                object_id = path_parts[-2]

            # Get request body for changes (don't log passwords)
            changes = None
            if request.method in ('POST', 'PUT', 'PATCH') and request.content_type == 'application/json':
                try:
                    raw_body = getattr(request, '_audit_body', None) or request.body
                    body = json.loads(raw_body)
                    # Redact sensitive fields
                    sensitive = {'password', 'confirm_password', 'new_password',
                                 'current_password', 'token', 'credential', 'secret'}
                    changes = {k: v for k, v in body.items() if k.lower() not in sensitive}
                except (json.JSONDecodeError, ValueError):
                    pass

            # Only log successful operations (2xx status)
            if 200 <= response.status_code < 300:
                try:
                    AuditLog.log(
                        user=request.user,
                        action=action,
                        model_name=model_name,
                        object_id=object_id,
                        object_repr=f"{request.method} {request.path}",
                        changes=changes,
                        request=request,
                    )
                except Exception:
                    pass  # Never crash on audit logging

        _thread_local.request = None
        return response
