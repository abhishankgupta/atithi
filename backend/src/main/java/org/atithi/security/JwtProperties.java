package org.atithi.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Access-token signing settings.
 *
 * @param secret HMAC key, at least 32 characters. Required in production; elsewhere a blank
 *               value means a random key per start (see {@link JwtKeys}).
 */
@ConfigurationProperties(prefix = "atithi.jwt")
public record JwtProperties(String secret) {

    public JwtProperties {
        secret = secret == null ? "" : secret.trim();
    }
}
