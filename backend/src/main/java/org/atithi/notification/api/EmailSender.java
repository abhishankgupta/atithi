package org.atithi.notification.api;

/** Sends transactional email. A real provider (Brevo or Resend) is plugged in once chosen. */
public interface EmailSender {

    void send(Email email);

    /** False while only the logging stand-in is configured: nothing actually reaches an inbox. */
    boolean deliversEmail();
}
