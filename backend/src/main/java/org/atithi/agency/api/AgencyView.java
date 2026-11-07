package org.atithi.agency.api;

import java.time.Instant;
import java.util.UUID;

/** An agency's public profile. Statuses: UNVERIFIED, VERIFIED, SUSPENDED. */
public record AgencyView(UUID id, String name, String city, String motApprovalNo, String website, String description,
                         String status, Instant verifiedAt, Instant createdAt) {

    public boolean isVerified() {
        return "VERIFIED".equals(status);
    }
}
