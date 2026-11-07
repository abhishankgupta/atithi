package org.atithi.security;

import java.util.UUID;
import org.atithi.identity.api.IdentityFacade;
import org.atithi.shared.web.ApiException;
import org.atithi.shared.web.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Admin actions need the ADMIN role (granted only to ATITHI_ADMIN_EMAILS at registration) and a
 * verified email, so nobody can claim an admin address they don't own.
 */
@Component
public class AdminAccess {

    private final IdentityFacade identity;

    AdminAccess(IdentityFacade identity) {
        this.identity = identity;
    }

    public UUID requireAdmin(Jwt jwt) {
        UUID id = CurrentUser.requireRole(jwt, "ADMIN");
        boolean verified = identity.findUser(id).map(u -> u.emailVerified() && u.hasRole("ADMIN")).orElse(false);
        if (!verified) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", "Verify your email before using admin tools");
        }
        return id;
    }
}
