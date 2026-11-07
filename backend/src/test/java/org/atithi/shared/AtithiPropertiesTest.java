package org.atithi.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class AtithiPropertiesTest {

    @Test
    void fillsSafeDefaultsWhenUnset() {
        AtithiProperties props = new AtithiProperties(null, " ", null);
        assertThat(props.environment()).isEqualTo("local");
        assertThat(props.version()).isEqualTo("dev");
        assertThat(props.corsOrigins()).isEmpty();
        assertThat(props.isProduction()).isFalse();
    }

    @Test
    void keepsGivenValuesAndRecognisesProduction() {
        AtithiProperties props = new AtithiProperties(" production ", "abc123", List.of("https://atithi-web.example.workers.dev"));
        assertThat(props.environment()).isEqualTo("production");
        assertThat(props.isProduction()).isTrue();
        assertThat(props.version()).isEqualTo("abc123");
        assertThat(props.corsOrigins()).containsExactly("https://atithi-web.example.workers.dev");
    }
}
