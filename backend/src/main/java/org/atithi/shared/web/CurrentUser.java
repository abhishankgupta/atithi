package org.atithi.shared.web;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

/** Reads the signed-in user from the access token. Roles in the token are fixed for its 15-minute life. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static UUID id(Jwt jwt) {
        if (jwt == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Please sign in first");
        }
        return UUID.fromString(jwt.getSubject());
    }

    public static boolean hasRole(Jwt jwt, String role) {
        if (jwt == null) {
            return false;
        }
        List<String> roles = jwt.getClaimAsStringList("roles");
        return roles != null && roles.contains(role);
    }

    /** The user's id, or 403 if their token doesn't carry {@code role}. */
    public static UUID requireRole(Jwt jwt, String role) {
        UUID id = id(jwt);
        if (!hasRole(jwt, role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Your account can't do this");
        }
        return id;
    }
}
