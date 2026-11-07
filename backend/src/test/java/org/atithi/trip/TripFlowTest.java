package org.atithi.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.atithi.TestApi;
import org.atithi.TestApi.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

/** Steps 4 and 5 end to end: request, match, proposal, compare, shortlist, messages, and the privacy rules. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"atithi.environment=ci", "atithi.auth.admin-emails=trip-admin@example.org"})
class TripFlowTest {

    @Value("${local.server.port}")
    int port;

    TestApi api;
    String adminToken;

    @BeforeEach
    void setUp() {
        api = new TestApi(port);
        adminToken = api.registerOrLogin("trip-admin@example.org", "Trip Admin", "TRAVELLER").field("accessToken");
        api.verifyEmail(adminToken);
    }

    /** A verified agency; returns the agent's access token. */
    private String verifiedAgency(String name) {
        String token = api.verifiedUser(name + " owner", "AGENT");
        Response agency = api.post("/api/v1/agency", "{\"name\":\"" + name + "\",\"city\":\"Jaipur\"}", token);
        assertThat(agency.status()).as(agency.toString()).isEqualTo(201);
        Response verified = api.post("/api/v1/admin/agencies/" + agency.field("id") + "/verify", null, adminToken);
        assertThat(verified.status()).as(verified.toString()).isEqualTo(200);
        return token;
    }

    private String agencyId(String agentToken) {
        return api.get("/api/v1/agency", agentToken).field("id");
    }

    private static String requestJson(boolean consent) {
        return "{\"baseItinerary\":\"golden-triangle\",\"destinations\":\"Delhi, Agra, Jaipur\",\"startDate\":\""
                + LocalDate.now().plusMonths(3) + "\",\"days\":10,\"adults\":2,\"children\":0,\"budget\":\"1000_2000\","
                + "\"hotelStyle\":\"COMFORT\",\"interests\":[\"Heritage\",\"Wildlife\",\"Heritage\"],"
                + "\"notes\":\"Vegetarian, first visit\",\"consent\":" + consent + "}";
    }

    private static String proposalJson(String price) {
        return "{\"pricePerPerson\":" + price + ",\"currency\":\"USD\",\"inclusions\":[\"Private car and driver\","
                + "\"Taj Mahal at sunrise\"],\"hotels\":\"Heritage hotel in Jaipur\",\"dayPlan\":\"Day 1: Delhi...\","
                + "\"validUntil\":\"" + LocalDate.now().plusDays(30) + "\"}";
    }

    @Test
    void travellerRequestsComparesShortlistsAndMessages() {
        String travellerEmail = TestApi.uniqueEmail("sarah");
        String traveller = api.registerOrLogin(travellerEmail, "Sarah Jones", "TRAVELLER").field("accessToken");

        // Unverified travellers can't send requests; consent is required.
        Response unverified = api.post("/api/v1/requests", requestJson(true), traveller);
        assertThat(unverified.status()).isEqualTo(403);
        assertThat(unverified.field("code")).isEqualTo("EMAIL_NOT_VERIFIED");
        api.verifyEmail(traveller);
        Response noConsent = api.post("/api/v1/requests", requestJson(false), traveller);
        assertThat(noConsent.status()).isEqualTo(400);
        assertThat(noConsent.body()).contains("consent");

        Response created = api.post("/api/v1/requests", requestJson(true), traveller);
        assertThat(created.status()).as(created.toString()).isEqualTo(201);
        assertThat(created.field("status")).isEqualTo("SUBMITTED");
        assertThat(created.body()).contains("\"interests\":[\"Heritage\",\"Wildlife\"]");
        String requestId = created.field("id");

        String agentA = verifiedAgency("Rajasthan Roots");
        String agentB = verifiedAgency("Pink City Tours");

        // Only admins match; agencies must be verified.
        assertThat(api.post("/api/v1/admin/requests/" + requestId + "/matches",
                "{\"agencyIds\":[\"" + agencyId(agentA) + "\"]}", agentA).status()).isEqualTo(403);
        String unverifiedAgent = api.verifiedUser("Unverified owner", "AGENT");
        String unverifiedAgency = api.post("/api/v1/agency", "{\"name\":\"Not Yet\",\"city\":\"Goa\"}", unverifiedAgent).field("id");
        Response rejected = api.post("/api/v1/admin/requests/" + requestId + "/matches",
                "{\"agencyIds\":[\"" + unverifiedAgency + "\"]}", adminToken);
        assertThat(rejected.status()).isEqualTo(400);

        Response matched = api.post("/api/v1/admin/requests/" + requestId + "/matches",
                "{\"agencyIds\":[\"" + agencyId(agentA) + "\",\"" + agencyId(agentB) + "\"]}", adminToken);
        assertThat(matched.status()).as(matched.toString()).isEqualTo(200);
        assertThat(matched.field("status")).isEqualTo("MATCHED");
        assertThat(matched.body()).contains("Rajasthan Roots").contains("Pink City Tours");

        // Each agency sees the lead, but not the traveller's email.
        Response leadsA = api.get("/api/v1/agent/leads", agentA);
        assertThat(leadsA.status()).as(leadsA.toString()).isEqualTo(200);
        assertThat(leadsA.body()).contains("Sarah Jones").contains("Vegetarian").doesNotContain(travellerEmail);
        String matchA = leadsA.field("matchId");
        String matchB = api.get("/api/v1/agent/leads", agentB).field("matchId");

        // An agency can't open another agency's lead.
        assertThat(api.get("/api/v1/agent/leads/" + matchA, agentB).status()).isEqualTo(404);

        Response proposalA = api.put("/api/v1/agent/leads/" + matchA + "/proposal", proposalJson("1690"), agentA);
        assertThat(proposalA.status()).as(proposalA.toString()).isEqualTo(200);
        assertThat(proposalA.field("status")).isEqualTo("PROPOSED");
        assertThat(api.put("/api/v1/agent/leads/" + matchB + "/proposal", proposalJson("1540.50"), agentB).status()).isEqualTo(200);

        // Agency B can't see A's price through its own lead.
        assertThat(api.get("/api/v1/agent/leads/" + matchB, agentB).body()).doesNotContain("1690");

        // The traveller compares both proposals.
        Response request = api.get("/api/v1/requests/" + requestId, traveller);
        assertThat(request.status()).as(request.toString()).isEqualTo(200);
        assertThat(request.body()).contains("1690").contains("1540.5").contains("Taj Mahal at sunrise");
        assertThat(request.body()).doesNotContain("\"agencyContactEmail\":\"");
        Response mine = api.get("/api/v1/requests/mine", traveller);
        assertThat(mine.number("proposalCount")).isEqualTo(2L);

        // Other travellers can't see the request.
        String stranger = api.verifiedUser("Stranger", "TRAVELLER");
        assertThat(api.get("/api/v1/requests/" + requestId, stranger).status()).isEqualTo(404);

        // Messages: only the traveller and the matched agency can read or post.
        Response hello = api.post("/api/v1/threads/" + matchA + "/messages", "{\"body\":\"Can we add a cooking class?\"}", traveller);
        assertThat(hello.status()).as(hello.toString()).isEqualTo(200);
        Response reply = api.post("/api/v1/threads/" + matchA + "/messages", "{\"body\":\"Yes, in Jaipur.\"}", agentA);
        assertThat(reply.status()).isEqualTo(200);
        assertThat(reply.body()).contains("Can we add a cooking class?").contains("Yes, in Jaipur.");
        assertThat(api.get("/api/v1/threads/" + matchA + "/messages", agentB).status()).isEqualTo(404);
        assertThat(api.get("/api/v1/threads/" + matchA + "/messages", stranger).status()).isEqualTo(404);

        // Shortlisting A reveals the traveller's email to A only.
        Response shortlisted = api.post("/api/v1/requests/" + requestId + "/matches/" + matchA + "/shortlist", null, traveller);
        assertThat(shortlisted.status()).as(shortlisted.toString()).isEqualTo(200);
        assertThat(shortlisted.body()).contains("SHORTLISTED").contains("\"agencyContactEmail\":\"");
        assertThat(api.get("/api/v1/agent/leads/" + matchA, agentA).field("travellerEmail")).isEqualTo(travellerEmail);
        assertThat(api.get("/api/v1/agent/leads/" + matchB, agentB).body()).doesNotContain(travellerEmail);
        assertThat(api.post("/api/v1/requests/" + requestId + "/matches/" + matchA + "/shortlist", null, traveller).status())
                .isEqualTo(200);

        // Declining B closes its thread.
        Response declined = api.post("/api/v1/requests/" + requestId + "/matches/" + matchB + "/decline", null, traveller);
        assertThat(declined.status()).isEqualTo(200);
        assertThat(api.post("/api/v1/threads/" + matchB + "/messages", "{\"body\":\"Still there?\"}", agentB).status()).isEqualTo(409);
        assertThat(api.put("/api/v1/agent/leads/" + matchB + "/proposal", proposalJson("999"), agentB).status()).isEqualTo(409);
    }

    @Test
    void aRequestGoesToAtMostFiveAgencies() {
        String traveller = api.verifiedUser("Busy Traveller", "TRAVELLER");
        String requestId = api.post("/api/v1/requests", requestJson(true), traveller).field("id");
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            ids.append(i == 0 ? "" : ",").append('"').append(agencyId(verifiedAgency("Agency " + i + " " + System.nanoTime()))).append('"');
        }
        Response tooMany = api.post("/api/v1/admin/requests/" + requestId + "/matches", "{\"agencyIds\":[" + ids + "]}", adminToken);
        assertThat(tooMany.status()).isEqualTo(400);
        assertThat(tooMany.body()).contains("at most 5");
    }

    @Test
    void agentsCannotRequestTripsAndValidationIsReported() {
        String agent = api.verifiedUser("Agent", "AGENT");
        assertThat(api.post("/api/v1/requests", requestJson(true), agent).status()).isEqualTo(403);

        String traveller = api.verifiedUser("Validator", "TRAVELLER");
        Response past = api.post("/api/v1/requests", requestJson(true).replace(
                LocalDate.now().plusMonths(3).toString(), LocalDate.now().minusDays(1).toString()), traveller);
        assertThat(past.status()).isEqualTo(400);
        assertThat(past.body()).contains("startDate");
        Response badBudget = api.post("/api/v1/requests", requestJson(true).replace("1000_2000", "LOTS"), traveller);
        assertThat(badBudget.status()).isEqualTo(400);
        assertThat(badBudget.body()).contains("budget");
    }
}
