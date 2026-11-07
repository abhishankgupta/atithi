package org.atithi.security;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

/** Decides which HMAC-SHA256 key signs access tokens. Kept free of Spring so it is easy to test. */
final class JwtKeys {

    static final int MIN_SECRET_LENGTH = 32;

    private JwtKeys() {
    }

    /**
     * @param secret      the configured secret, possibly blank
     * @param production  whether this is the production environment
     * @throws IllegalStateException when production has no secret, or any secret is too short
     */
    static SecretKey resolve(String secret, boolean production) {
        if (secret == null || secret.isBlank()) {
            if (production) {
                throw new IllegalStateException("ATITHI_JWT_SECRET must be set in production (32+ random characters). "
                        + "Without it every restart would sign users out. See docs/SETUP.md.");
            }
            byte[] random = new byte[MIN_SECRET_LENGTH];
            new SecureRandom().nextBytes(random);
            return new SecretKeySpec(random, "HmacSHA256");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("ATITHI_JWT_SECRET must be at least " + MIN_SECRET_LENGTH + " characters");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}
