package org.atithi.identity;

import static org.assertj.core.api.Assertions.assertThat;

import org.atithi.TestApi;
import org.atithi.TestApi.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

/** Step 2: sign-up, sign-in, sessions, email verification and agencies, over HTTP against a real database. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"atithi.environment=ci", "atithi.auth.admin-emails=account-admin@example.org"})
class AccountFlowTest {

    @Value("${local.server.port}")
    int port;

    TestApi api;

    @BeforeEach
    void setUp() {
        api = new TestApi(port);
    }

    @Test
    void travellerSignsUpVerifiesEmailAndManagesProfile() {
        String email = TestApi.uniqueEmail("traveller");
        Response registered = api.register(email, "Sarah Jones", "TRAVELLER");
        assertThat(registered.status()).as(registered.toString()).isEqualTo(201);
        assertThat(registered.body()).contains("\"roles\":[\"TRAVELLER\"]").contains("\"emailVerified\":false");
        String token = registered.field("accessToken");

        Response me = api.get("/api/v1/me", token);
        assertThat(me.status()).as(me.toString()).isEqualTo(200);
        assertThat(me.field("email")).isEqualTo(email);
        assertThat(me.field("country")).isEqualTo("United Kingdom");

        Response updated = api.patch("/api/v1/me", "{\"displayName\":\"Sarah J\",\"country\":\"Ireland\"}", token);
        assertThat(updated.status()).as(updated.toString()).isEqualTo(200);
        assertThat(updated.field("displayName")).isEqualTo("Sarah J");
        assertThat(updated.field("country")).isEqualTo("Ireland");

        Response sent = api.post("/api/v1/me/email/send-code", null, token);
        assertThat(sent.status()).as(sent.toString()).isEqualTo(200);
        String code = sent.field("testCode");
        assertThat(code).matches("\\d{6}");

        String wrong = code.equals("000000") ? "111111" : "000000";
        Response bad = api.post("/api/v1/me/email/verify", "{\"code\":\"" + wrong + "\"}", token);
        assertThat(bad.status()).isEqualTo(400);
        assertThat(bad.field("code")).isEqualTo("CODE_INVALID");

        Response good = api.post("/api/v1/me/email/verify", "{\"code\":\"" + code + "\"}", token);
        assertThat(good.status()).as(good.toString()).isEqualTo(200);
        assertThat(good.body()).contains("\"emailVerified\":true");

        Response again = api.post("/api/v1/me/email/send-code", null, token);
        assertThat(again.status()).isEqualTo(409);
    }

    @Test
    void signInRefreshAndLogout() {
        String email = TestApi.uniqueEmail("session");
        api.register(email, "Tom Lee", "TRAVELLER");

        Response wrongPassword = api.post("/api/v1/auth/login", "{\"email\":\"" + email + "\",\"password\":\"nope-nope-1\"}");
        assertThat(wrongPassword.status()).isEqualTo(401);
        assertThat(wrongPassword.field("code")).isEqualTo("INVALID_CREDENTIALS");

        Response login = api.post("/api/v1/auth/login",
                "{\"email\":\"" + email.toUpperCase() + "\",\"password\":\"" + TestApi.PASSWORD + "\"}");
        assertThat(login.status()).as(login.toString()).isEqualTo(200);
        String refresh = login.field("refreshToken");

        Response rotated = api.post("/api/v1/auth/refresh", "{\"refreshToken\":\"" + refresh + "\"}");
        assertThat(rotated.status()).as(rotated.toString()).isEqualTo(200);
        String newRefresh = rotated.field("refreshToken");

        // Reusing a rotated token revokes the whole family, including the newer token.
        assertThat(api.post("/api/v1/auth/refresh", "{\"refreshToken\":\"" + refresh + "\"}").status()).isEqualTo(401);
        assertThat(api.post("/api/v1/auth/refresh", "{\"refreshToken\":\"" + newRefresh + "\"}").status()).isEqualTo(401);

        Response duplicate = api.register(email, "Someone Else", "TRAVELLER");
        assertThat(duplicate.status()).isEqualTo(409);
        assertThat(duplicate.field("code")).isEqualTo("EMAIL_TAKEN");
    }

    @Test
    void privateEndpointsNeedSignIn() {
        assertThat(api.get("/api/v1/me").status()).isEqualTo(401);
        assertThat(api.get("/api/v1/requests/mine").status()).isEqualTo(401);
        assertThat(api.get("/api/v1/agent/leads").status()).isEqualTo(401);
        assertThat(api.get("/api/v1/admin/agencies").status()).isEqualTo(401);
    }

    @Test
    void agentSetsUpAnAgencyAndAnAdminVerifiesIt() {
        String agentToken = api.register(TestApi.uniqueEmail("agent"), "Ravi Menon", "AGENT").field("accessToken");
        assertThat(api.get("/api/v1/agency", agentToken).status()).isEqualTo(404);

        Response created = api.post("/api/v1/agency",
                "{\"name\":\"Kerala Trails\",\"city\":\"Kochi\",\"motApprovalNo\":\"MOT-123\"}", agentToken);
        assertThat(created.status()).as(created.toString()).isEqualTo(201);
        assertThat(created.field("status")).isEqualTo("UNVERIFIED");
        String agencyId = created.field("id");

        assertThat(api.post("/api/v1/agency", "{\"name\":\"Second\",\"city\":\"Goa\"}", agentToken).status()).isEqualTo(409);

        // Travellers can't create agencies; non-admins can't verify.
        String travellerToken = api.register(TestApi.uniqueEmail("traveller"), "Ann", "TRAVELLER").field("accessToken");
        assertThat(api.post("/api/v1/agency", "{\"name\":\"Nope\",\"city\":\"Goa\"}", travellerToken).status()).isEqualTo(403);
        assertThat(api.post("/api/v1/admin/agencies/" + agencyId + "/verify", null, agentToken).status()).isEqualTo(403);

        // An admin must verify their own email before using admin tools.
        String adminToken = api.registerOrLogin("account-admin@example.org", "Atithi Admin", "TRAVELLER").field("accessToken");
        Response unverifiedAdmin = api.post("/api/v1/admin/agencies/" + agencyId + "/verify", null, adminToken);
        if (unverifiedAdmin.status() == 403) {
            assertThat(unverifiedAdmin.field("code")).isEqualTo("EMAIL_NOT_VERIFIED");
            api.verifyEmail(adminToken);
        }

        Response list = api.get("/api/v1/admin/agencies?status=UNVERIFIED", adminToken);
        assertThat(list.status()).as(list.toString()).isEqualTo(200);
        assertThat(list.body()).contains("Kerala Trails").contains("Ravi Menon");

        Response verified = api.post("/api/v1/admin/agencies/" + agencyId + "/verify", null, adminToken);
        assertThat(verified.status()).as(verified.toString()).isEqualTo(200);
        assertThat(verified.field("status")).isEqualTo("VERIFIED");
        assertThat(api.get("/api/v1/agency", agentToken).field("status")).isEqualTo("VERIFIED");
    }
}
