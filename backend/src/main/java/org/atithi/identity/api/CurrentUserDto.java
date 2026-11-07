package org.atithi.identity.api;

import java.util.List;
import java.util.UUID;

/** The signed-in user's own account details. Only ever returned to the user themself. */
public record CurrentUserDto(UUID id, String displayName, String email, String country, List<String> roles,
                             boolean emailVerified) {

    public CurrentUserDto {
        roles = List.copyOf(roles);
    }
}
