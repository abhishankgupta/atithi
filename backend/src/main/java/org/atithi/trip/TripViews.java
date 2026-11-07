package org.atithi.trip;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Response shapes of the trip API. Contact details appear only where the privacy rules allow. */
final class TripViews {

    private TripViews() {
    }

    record RequestInput(String baseItinerary, String destinations, LocalDate startDate, Integer days, Integer adults,
                        Integer children, String budget, String hotelStyle, List<String> interests, String notes,
                        Boolean consent) {
    }

    record ProposalInput(BigDecimal pricePerPerson, String currency, List<String> inclusions, String hotels,
                         String dayPlan, LocalDate validUntil) {
    }

    record AgencyRef(UUID id, String name, String city) {
    }

    record ProposalView(UUID id, BigDecimal pricePerPerson, String currency, List<String> inclusions, String hotels,
                        String dayPlan, LocalDate validUntil, Instant updatedAt) {
    }

    /** The traveller's view of one matched agency. The agency's email appears only after shortlisting. */
    record TravellerMatchView(UUID id, AgencyRef agency, String status, ProposalView proposal,
                              Instant contactRevealedAt, String agencyContactEmail) {
    }

    record RequestView(UUID id, String baseItinerary, String destinations, LocalDate startDate, int days, int adults,
                       int children, String budget, String hotelStyle, List<String> interests, String notes,
                       String status, Instant createdAt, List<TravellerMatchView> matches) {
    }

    record RequestSummary(UUID id, String baseItinerary, String destinations, LocalDate startDate, int days,
                          int adults, int children, String status, Instant createdAt, long matchCount,
                          long proposalCount) {
    }

    record AdminRequestView(UUID id, String travellerName, String travellerCountry, String baseItinerary,
                            String destinations, LocalDate startDate, int days, int adults, int children,
                            String budget, String hotelStyle, List<String> interests, String notes, String status,
                            Instant createdAt, List<AgencyRef> matchedAgencies) {
    }

    /** An agency's view of a request matched to it. The traveller's email is null until they shortlist the agency. */
    record LeadView(UUID matchId, UUID requestId, String status, String travellerName, String travellerCountry,
                    String travellerEmail, String baseItinerary, String destinations, LocalDate startDate, int days,
                    int adults, int children, String budget, String hotelStyle, List<String> interests, String notes,
                    Instant matchedAt, ProposalView proposal) {
    }
}
