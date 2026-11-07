package org.atithi.identity.api;

/** Returned by every successful sign-in, registration or token refresh. */
public record AuthResponse(String accessToken, long accessTokenExpiresIn, String refreshToken, CurrentUserDto user) {
}
