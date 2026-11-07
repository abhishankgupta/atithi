package org.atithi.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class IdsTest {

    @Test
    void generatesUniqueVersion7Ids() {
        Set<UUID> seen = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            UUID id = Ids.newId();
            assertThat(id.version()).isEqualTo(7);
            assertThat(id.variant()).isEqualTo(2);
            assertThat(seen.add(id)).isTrue();
        }
    }

    @Test
    void idsAreTimeOrdered() throws InterruptedException {
        UUID first = Ids.newId();
        Thread.sleep(2);
        UUID second = Ids.newId();
        assertThat(Long.compareUnsigned(first.getMostSignificantBits(), second.getMostSignificantBits())).isNegative();
    }
}
