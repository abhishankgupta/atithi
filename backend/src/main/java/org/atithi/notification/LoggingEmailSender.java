package org.atithi.notification;

import org.atithi.notification.api.Email;
import org.atithi.notification.api.EmailSender;
import org.atithi.shared.AtithiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Stand-in until an email provider is chosen: writes emails to the log instead of sending them.
 * Outside production the body is logged too, so test flows can be followed; in production only
 * the recipient's domain and the subject are logged, never codes or personal details.
 */
@Component
class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    private final AtithiProperties properties;

    LoggingEmailSender(AtithiProperties properties) {
        this.properties = properties;
    }

    @Override
    public void send(Email email) {
        if (properties.isProduction()) {
            log.info("Email not sent (no provider yet): to=*@{} subject=\"{}\"", domainOf(email.to()), email.subject());
        } else {
            log.info("Email (not sent, no provider yet): to={} subject=\"{}\"\n{}", email.to(), email.subject(), email.body());
        }
    }

    @Override
    public boolean deliversEmail() {
        return false;
    }

    private static String domainOf(String address) {
        int at = address == null ? -1 : address.indexOf('@');
        return at < 0 ? "?" : address.substring(at + 1);
    }
}
