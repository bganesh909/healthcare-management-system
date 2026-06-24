from django.shortcuts import render
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    UserSerializer, UserDetailSerializer, UserProfileUpdateSerializer,
    PasswordChangeSerializer, CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
User = get_user_model()
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    def get_permissions(self):
        if self.action == 'create' or self.action == 'register':
            permission_classes = [AllowAny]
        elif self.action in ['retrieve', 'update', 'partial_update', 'profile', 'change_password']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
    def get_serializer_class(self):
        if self.action == 'profile':
            return UserDetailSerializer
        elif self.action == 'update_profile':
            return UserProfileUpdateSerializer
        elif self.action == 'change_password':
            return PasswordChangeSerializer
        return UserSerializer
    def get_object(self):
        if self.action in ['profile', 'update_profile', 'change_password']:
            return self.request.user
        return super().get_object()
    @action(detail=False, methods=['get'])
    def profile(self, request):
        user = request.user
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        user = request.user
        serializer = self.get_serializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserDetailSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        user = request.user
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'detail': 'Password successfully changed.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                UserDetailSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@perm_classes([AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
        send_mail(
            subject='Password Reset - Healthcare System',
            message=f'Click the link to reset your password: {reset_link}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=f'''
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Healthcare System account.</p>
            <p><a href="{reset_link}">Click here to reset your password</a></p>
            <p>If you did not request this, please ignore this email.</p>
            ''',
        )
        return Response({'detail': 'Password reset link has been sent to your email.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@perm_classes([AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response({'detail': 'Reset link has expired or is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Password has been reset successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@perm_classes([AllowAny])
def google_oauth_login(request):
    """
    Authenticate user with Google OAuth token.
    Frontend sends the Google credential (ID token) after Google Sign-In.
    """
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    credential = request.data.get('credential')
    if not credential:
        return Response({'detail': 'Google credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        return Response({'detail': 'Google OAuth is not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)

        email = idinfo.get('email')
        if not email:
            return Response({'detail': 'Email not found in Google account.'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        picture = idinfo.get('picture', '')

        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'role': 'patient',
                'email_verified': True,
            }
        )

        if created:
            # Set unusable password for OAuth users
            user.set_unusable_password()
            user.save()

        # Update name/verified if existing user
        if not created:
            if not user.first_name and first_name:
                user.first_name = first_name
            if not user.last_name and last_name:
                user.last_name = last_name
            if not user.email_verified:
                user.email_verified = True
            user.save()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': user.id,
            'email': user.email,
            'full_name': user.get_full_name(),
            'role': user.role,
            'is_staff': user.is_staff,
            'is_new_user': created,
        })

    except ValueError as e:
        return Response({'detail': f'Invalid Google token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'detail': f'Google authentication failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

