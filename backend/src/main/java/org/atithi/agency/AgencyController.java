package org.atithi.agency;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.atithi.agency.api.AgencyView;
import org.atithi.security.AdminAccess;
import org.atithi.shared.web.CurrentUser;
import org.atithi.shared.web.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class AgencyController {

    private final AgencyService agencies;
    private final AdminAccess adminAccess;

    AgencyController(AgencyService agencies, AdminAccess adminAccess) {
        this.agencies = agencies;
        this.adminAccess = adminAccess;
    }

    record AgencyRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @NotBlank @Size(min = 2, max = 80) String city,
            @Size(max = 80) String motApprovalNo,
            @Size(max = 200) String website,
            @Size(max = 1000) String description) {

        AgencyService.AgencyInput toInput() {
            return new AgencyService.AgencyInput(name, city, motApprovalNo, website, description);
        }
    }

    /** The signed-in agent's own agency. */
    @GetMapping("/api/v1/agency")
    AgencyView mine(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = CurrentUser.requireRole(jwt, "AGENT");
        return agencies.agencyOfMember(userId)
                .orElseThrow(() -> new NotFoundException("AGENCY_NOT_FOUND", "You haven't set up an agency yet"));
    }

    @PostMapping("/api/v1/agency")
    @ResponseStatus(HttpStatus.CREATED)
    AgencyView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AgencyRequest r) {
        return agencies.create(CurrentUser.requireRole(jwt, "AGENT"), r.toInput());
    }

    @PutMapping("/api/v1/agency")
    AgencyView update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AgencyRequest r) {
        return agencies.update(CurrentUser.requireRole(jwt, "AGENT"), r.toInput());
    }

    @GetMapping("/api/v1/admin/agencies")
    List<AgencyService.AdminAgencyView> adminList(@AuthenticationPrincipal Jwt jwt,
                                                  @RequestParam(required = false) String status) {
        adminAccess.requireAdmin(jwt);
        return agencies.listForAdmin(status);
    }

    @PostMapping("/api/v1/admin/agencies/{id}/verify")
    AgencyView verify(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return agencies.verify(id, adminAccess.requireAdmin(jwt));
    }
}
