package org.atithi.trip;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/** Allowed values and limits for requests and proposals. Pure, so it is easy to test. */
final class TripRules {

    static final int MAX_AGENCIES_PER_REQUEST = 5;
    static final int MAX_REQUESTS_PER_DAY = 5;
    static final Set<String> BUDGETS = Set.of("UNDER_1000", "1000_2000", "2000_4000", "OVER_4000");
    static final Set<String> HOTEL_STYLES = Set.of("BUDGET", "COMFORT", "HERITAGE", "LUXURY");
    static final Set<String> CURRENCIES = Set.of("USD", "EUR", "GBP", "AUD", "INR");
    static final BigDecimal MAX_PRICE = new BigDecimal("10000000");

    private TripRules() {
    }

    /** Trims, drops blanks and duplicates, and enforces the count and length limits. Null when invalid. */
    static List<String> cleanList(List<String> items, int maxItems, int maxLength) {
        if (items == null) {
            return List.of();
        }
        List<String> cleaned = items.stream()
                .filter(i -> i != null && !i.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
        if (cleaned.size() > maxItems || cleaned.stream().anyMatch(i -> i.length() > maxLength || i.contains("\n"))) {
            return null;
        }
        return cleaned;
    }

    static String join(List<String> items) {
        return items.isEmpty() ? null : String.join("\n", items);
    }

    static List<String> split(String stored) {
        return stored == null || stored.isBlank() ? List.of() : List.of(stored.split("\n"));
    }
}
