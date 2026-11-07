package org.atithi.shared;

import java.security.SecureRandom;
import java.util.UUID;

/** Generates time-ordered UUIDv7 ids, which index well as primary keys (section 4.5). */
public final class Ids {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {
    }

    public static UUID newId() {
        long millis = System.currentTimeMillis();
        byte[] random = new byte[10];
        RANDOM.nextBytes(random);

        long msb = (millis & 0xFFFFFFFFFFFFL) << 16;           // 48-bit timestamp
        msb |= 0x7000L;                                          // version 7
        msb |= ((random[0] & 0x0FL) << 8) | (random[1] & 0xFFL); // 12 random bits

        long lsb = 0x8000000000000000L;                          // IETF variant
        lsb |= (random[2] & 0x3FL) << 56;
        for (int i = 3; i < 10; i++) {
            lsb |= (random[i] & 0xFFL) << (8 * (9 - i));
        }
        return new UUID(msb, lsb);
    }
}
