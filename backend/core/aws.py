import os
import uuid
import logging
import re
from typing import Optional, Dict, Any
from backend.config import settings

logger = logging.getLogger("placement_portal.aws")

try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    ClientError = Exception


def _get_s3_client():
    if not BOTO3_AVAILABLE:
        return None
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    # Allows IAM role / EC2 / ECS instance profile authentication
    return boto3.client("s3", region_name=settings.AWS_REGION)


def _get_ses_client():
    if not BOTO3_AVAILABLE:
        return None
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    return boto3.client("ses", region_name=settings.AWS_REGION)


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename removing illegal path characters."""
    filename = os.path.basename(filename)
    return re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)


def upload_resume(file_bytes: bytes, filename: str, student_id: int) -> Dict[str, Any]:
    """
    Uploads student resume to AWS S3 bucket.
    If AWS credentials or bucket are not configured, seamlessly saves to local persistent storage.
    """
    clean_name = sanitize_filename(filename)
    unique_prefix = uuid.uuid4().hex[:8]
    object_key = f"resumes/student_{student_id}/{unique_prefix}_{clean_name}"

    # Try AWS S3 if bucket is configured
    if settings.AWS_S3_BUCKET_NAME and BOTO3_AVAILABLE:
        try:
            s3 = _get_s3_client()
            s3.put_object(
                Bucket=settings.AWS_S3_BUCKET_NAME,
                Key=object_key,
                Body=file_bytes,
                ContentType="application/pdf",
            )
            # Generate URL or presigned URL
            s3_url = f"https://{settings.AWS_S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{object_key}"
            logger.info(f"Successfully uploaded resume for student {student_id} to S3: {object_key}")
            return {
                "url": s3_url,
                "s3_key": object_key,
                "storage": "AWS_S3",
                "filename": clean_name,
            }
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}. Falling back to local storage.", exc_info=True)

    # Local fallback storage
    local_dir = os.path.join(settings.UPLOAD_DIR, "resumes")
    os.makedirs(local_dir, exist_ok=True)
    local_filename = f"student_{student_id}_{unique_prefix}_{clean_name}"
    local_path = os.path.join(local_dir, local_filename)

    with open(local_path, "wb") as f:
        f.write(file_bytes)

    local_url = f"/uploads/resumes/{local_filename}"
    logger.info(f"Stored resume locally: {local_path}")
    return {
        "url": local_url,
        "s3_key": None,
        "storage": "LOCAL_FALLBACK",
        "filename": clean_name,
    }


def generate_presigned_download_url(s3_key: str, expires_in: int = 3600) -> Optional[str]:
    """Generates a secure presigned S3 download URL for recruiter resume review."""
    if not settings.AWS_S3_BUCKET_NAME or not BOTO3_AVAILABLE or not s3_key:
        return None
    try:
        s3 = _get_s3_client()
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expires_in,
        )
    except Exception as e:
        logger.error(f"Failed to generate S3 presigned URL for {s3_key}: {e}")
        return None


def send_email_via_ses(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends transactional alert email via Amazon Simple Email Service (SES).
    Falls back to structured console logging if AWS SES is not configured.
    """
    if settings.AWS_SES_SENDER_EMAIL and BOTO3_AVAILABLE:
        try:
            ses = _get_ses_client()
            ses.send_email(
                Source=settings.AWS_SES_SENDER_EMAIL,
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
                },
            )
            logger.info(f"AWS SES: Sent email notification to {to_email} with subject: {subject}")
            return True
        except ClientError as e:
            logger.error(f"AWS SES dispatch failed: {e}", exc_info=True)

    # Local / staging simulation
    logger.info(f"[Email Notification Dispatch] To: {to_email} | Subject: {subject}")
    return True


def get_aws_status() -> Dict[str, Any]:
    """Returns status of AWS Cloud services integration."""
    return {
        "boto3_installed": BOTO3_AVAILABLE,
        "region": settings.AWS_REGION,
        "s3_configured": bool(settings.AWS_S3_BUCKET_NAME),
        "s3_bucket": settings.AWS_S3_BUCKET_NAME or "Not Configured (Using Local Storage)",
        "ses_configured": bool(settings.AWS_SES_SENDER_EMAIL),
        "ses_sender": settings.AWS_SES_SENDER_EMAIL or "Not Configured (Using Internal Inbox)",
    }
