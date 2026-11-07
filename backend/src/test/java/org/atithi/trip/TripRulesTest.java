package org.atithi.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class TripRulesTest {

    @Test
    void cleansListsAndRejectsOversizedOnes() {
        assertThat(TripRules.cleanList(Arrays.asList(" Heritage ", "", null, "Heritage", "Food"), 10, 40))
                .containsExactly("Heritage", "Food");
        assertThat(TripRules.cleanList(null, 10, 40)).isEmpty();
        assertThat(TripRules.cleanList(List.of("a", "b", "c"), 2, 40)).isNull();
        assertThat(TripRules.cleanList(List.of("x".repeat(41)), 10, 40)).isNull();
        assertThat(TripRules.cleanList(List.of("two\nlines"), 10, 40)).isNull();
    }

    @Test
    void joinsAndSplitsStoredLists() {
        assertThat(TripRules.join(List.of())).isNull();
        assertThat(TripRules.split(TripRules.join(List.of("Car", "Guide")))).containsExactly("Car", "Guide");
        assertThat(TripRules.split(null)).isEmpty();
    }
}
