package org.atithi.identity;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Sign-in settings.
 *
 * @param accessTokenTtl   lifetime of an access token
 * @param refreshTokenTtl  lifetime of a refresh token
 * @param adminEmails      accounts registered with one of these emails get the ADMIN role
 *                         (ATITHI_ADMIN_EMAILS, comma-separated). Admin actions also need a verified email.
 * @param emailCode        email verification code settings
 */
@ConfigurationProperties(prefix = "atithi.auth")
public record AuthProperties(Duration accessTokenTtl, Duration refreshTokenTtl, List<String> adminEmails, EmailCode emailCode) {

    public AuthProperties {
        accessTokenTtl = accessTokenTtl == null ? Duration.ofMinutes(15) : accessTokenTtl;
        refreshTokenTtl = refreshTokenTtl == null ? Duration.ofDays(30) : refreshTokenTtl;
        adminEmails = adminEmails == null ? List.of() : adminEmails.stream()
                .filter(e -> e != null && !e.isBlank())
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .toList();
        emailCode = emailCode == null ? new EmailCode(null, null, null, null) : emailCode;
    }

    boolean isAdminEmail(String normalizedEmail) {
        return adminEmails.contains(normalizedEmail);
    }

    /**
     * @param ttl                how long a code stays valid
     * @param maxAttempts        wrong guesses allowed per code
     * @param maxSendsPerWindow  codes that may be sent to one account per window
     * @param sendWindow         rate-limit window
     */
    public record EmailCode(Duration ttl, Integer maxAttempts, Integer maxSendsPerWindow, Duration sendWindow) {

        public EmailCode {
            ttl = ttl == null ? Duration.ofMinutes(10) : ttl;
            maxAttempts = maxAttempts == null ? 5 : maxAttempts;
            maxSendsPerWindow = maxSendsPerWindow == null ? 3 : maxSendsPerWindow;
            sendWindow = sendWindow == null ? Duration.ofMinutes(15) : sendWindow;
        }
    }
}
