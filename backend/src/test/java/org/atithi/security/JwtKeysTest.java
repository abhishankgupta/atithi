package org.atithi.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;

class JwtKeysTest {

    private static final String GOOD_SECRET = "0123456789abcdefghijklmnopqrstuvwxyz";

    @Test
    void productionRefusesToStartWithoutASecret() {
        assertThatThrownBy(() -> JwtKeys.resolve("", true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must be set in production");
        assertThatThrownBy(() -> JwtKeys.resolve(null, true)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void otherEnvironmentsFallBackToARandomKey() {
        SecretKey first = JwtKeys.resolve("", false);
        SecretKey second = JwtKeys.resolve(" ", false);
        assertThat(first.getEncoded()).hasSize(32);
        assertThat(first.getEncoded()).isNotEqualTo(second.getEncoded());
    }

    @Test
    void shortSecretsAreRejectedEverywhere() {
        assertThatThrownBy(() -> JwtKeys.resolve("too-short", false)).hasMessageContaining("at least 32");
        assertThatThrownBy(() -> JwtKeys.resolve("too-short", true)).hasMessageContaining("at least 32");
    }

    @Test
    void aConfiguredSecretIsUsedAsIs() {
        SecretKey key = JwtKeys.resolve(GOOD_SECRET, true);
        assertThat(key.getAlgorithm()).isEqualTo("HmacSHA256");
        assertThat(new String(key.getEncoded())).isEqualTo(GOOD_SECRET);
    }
}
