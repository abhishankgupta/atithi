package org.atithi.identity.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Account data other modules may read. The email is for sending notifications and for revealing
 * a traveller's contact to the one agency they shortlisted; never show it anywhere else.
 */
public record UserSummary(UUID id, String displayName, String email, String country, List<String> roles,
                          boolean emailVerified, Instant memberSince) {

    public boolean hasRole(String role) {
        return roles.contains(role);
    }
}
