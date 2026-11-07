package org.atithi.notification.api;

/** A plain-text email. Kept simple on purpose: no HTML, no tracking. */
public record Email(String to, String subject, String body) {
}
