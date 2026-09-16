"""Minimal SMTP sender for transactional notifications.

If SMTP isn't configured (no host set), emails are silently skipped rather
than raising - this keeps signup/approval flows working out of the box in
the demo environment before SMTP credentials are added.
"""

import smtplib
from email.mime.text import MIMEText

from app.core.config import settings


def send_email(to_email: str, subject: str, body: str) -> bool:
    if not settings.smtp_host:
        return False

    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, [to_email], message.as_string())
    return True


def notify_account_reviewed(to_email: str, full_name: str, approved: bool) -> None:
    status_word = "approved" if approved else "rejected"
    send_email(
        to_email,
        f"CAPACITY CONNECT: your account was {status_word}",
        f"Hi {full_name},\n\nAn Admin has {status_word} your CAPACITY CONNECT account."
        + ("\n\nYou can now log in and access your dashboard." if approved else ""),
    )


def notify_course_request(to_email: str, full_name: str, course_title: str) -> None:
    send_email(
        to_email,
        f"CAPACITY CONNECT: new course request - {course_title}",
        f"Hi {full_name},\n\nAn Admin has sent you a request to lead the course "
        f"\"{course_title}\". Log in to your Trainer Dashboard to accept or decline.",
    )
