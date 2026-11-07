package org.atithi;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Boots the full app against a real PostgreSQL database (docker compose locally, a service
 * container in CI), runs Flyway, and calls the API over HTTP.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"atithi.environment=ci", "atithi.version=test-build"})
class ApiSmokeTest {

    @Value("${local.server.port}")
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> send(String method, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, method.equals("GET")
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString("{}"))
                .header("Content-Type", "application/json")
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void healthIsUp() throws Exception {
        HttpResponse<String> response = send("GET", "/actuator/health");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"UP\"");
    }

    @Test
    void metaReportsEnvironmentAndVersion() throws Exception {
        HttpResponse<String> response = send("GET", "/api/v1/meta");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body())
                .contains("\"name\":\"Atithi API\"")
                .contains("\"environment\":\"ci\"")
                .contains("\"version\":\"test-build\"");
    }

    @Test
    void writesRequireAuthentication() throws Exception {
        HttpResponse<String> response = send("POST", "/api/v1/meta");
        assertThat(response.statusCode()).isIn(401, 403);
    }

    @Test
    void responsesCarrySecurityHeaders() throws Exception {
        HttpResponse<String> response = send("GET", "/api/v1/meta");
        assertThat(response.headers().firstValue("X-Content-Type-Options")).hasValue("nosniff");
        assertThat(response.headers().firstValue("X-Frame-Options")).hasValue("DENY");
    }
}
