package org.atithi.trip;

import java.util.List;
import java.util.UUID;
import org.atithi.security.AdminAccess;
import org.atithi.shared.web.CurrentUser;
import org.atithi.trip.TripViews.AdminRequestView;
import org.atithi.trip.TripViews.LeadView;
import org.atithi.trip.TripViews.ProposalInput;
import org.atithi.trip.TripViews.RequestInput;
import org.atithi.trip.TripViews.RequestSummary;
import org.atithi.trip.TripViews.RequestView;
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
class TripController {

    private final TripService trips;
    private final AdminAccess adminAccess;

    TripController(TripService trips, AdminAccess adminAccess) {
        this.trips = trips;
        this.adminAccess = adminAccess;
    }

    record MatchRequest(List<UUID> agencyIds) {
    }

    // travellers

    @PostMapping("/api/v1/requests")
    @ResponseStatus(HttpStatus.CREATED)
    RequestView create(@AuthenticationPrincipal Jwt jwt, @RequestBody RequestInput body) {
        return trips.createRequest(CurrentUser.id(jwt), body);
    }

    @GetMapping("/api/v1/requests/mine")
    List<RequestSummary> mine(@AuthenticationPrincipal Jwt jwt) {
        return trips.myRequests(CurrentUser.id(jwt));
    }

    @GetMapping("/api/v1/requests/{id}")
    RequestView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return trips.myRequest(CurrentUser.id(jwt), id);
    }

    @PostMapping("/api/v1/requests/{id}/matches/{matchId}/shortlist")
    RequestView shortlist(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID matchId) {
        return trips.shortlist(CurrentUser.id(jwt), id, matchId);
    }

    @PostMapping("/api/v1/requests/{id}/matches/{matchId}/decline")
    RequestView decline(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID matchId) {
        return trips.decline(CurrentUser.id(jwt), id, matchId);
    }

    // agents

    @GetMapping("/api/v1/agent/leads")
    List<LeadView> leads(@AuthenticationPrincipal Jwt jwt) {
        return trips.leads(CurrentUser.requireRole(jwt, "AGENT"));
    }

    @GetMapping("/api/v1/agent/leads/{matchId}")
    LeadView lead(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID matchId) {
        return trips.lead(CurrentUser.requireRole(jwt, "AGENT"), matchId);
    }

    @PutMapping("/api/v1/agent/leads/{matchId}/proposal")
    LeadView propose(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID matchId, @RequestBody ProposalInput body) {
        return trips.saveProposal(CurrentUser.requireRole(jwt, "AGENT"), matchId, body);
    }

    // admins

    @GetMapping("/api/v1/admin/requests")
    List<AdminRequestView> adminRequests(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String status) {
        adminAccess.requireAdmin(jwt);
        return trips.adminRequests(status);
    }

    @PostMapping("/api/v1/admin/requests/{id}/matches")
    AdminRequestView match(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody MatchRequest body) {
        return trips.matchAgencies(adminAccess.requireAdmin(jwt), id, body.agencyIds());
    }
}
