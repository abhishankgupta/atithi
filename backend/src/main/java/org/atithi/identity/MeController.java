package org.atithi.identity;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.atithi.identity.api.CurrentUserDto;
import org.atithi.shared.web.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own account. */
@RestController
@RequestMapping("/api/v1/me")
class MeController {

    private final AuthService auth;

    MeController(AuthService auth) {
        this.auth = auth;
    }

    record ProfileRequest(@Size(min = 2, max = 80) String displayName, @Size(max = 80) String country) {
    }

    record VerifyRequest(@NotBlank @Size(max = 12) String code) {
    }

    @GetMapping
    CurrentUserDto me(@AuthenticationPrincipal Jwt jwt) {
        return auth.me(CurrentUser.id(jwt));
    }

    @PatchMapping
    CurrentUserDto update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProfileRequest r) {
        return auth.updateProfile(CurrentUser.id(jwt), r.displayName(), r.country());
    }

    @PostMapping("/email/send-code")
    AuthService.CodeIssued sendCode(@AuthenticationPrincipal Jwt jwt) {
        return auth.sendEmailCode(CurrentUser.id(jwt));
    }

    @PostMapping("/email/verify")
    CurrentUserDto verify(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody VerifyRequest r) {
        return auth.verifyEmail(CurrentUser.id(jwt), r.code());
    }
}
