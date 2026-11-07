package org.atithi;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Minimal HTTP helper for integration tests against the running app. */
public final class TestApi {

    public static final String PASSWORD = "correct-horse-1";

    private final HttpClient http = HttpClient.newHttpClient();
    private final String base;

    public TestApi(int port) {
        this.base = "http://localhost:" + port;
    }

    public Response get(String path) {
        return send("GET", path, null, null);
    }

    public Response get(String path, String token) {
        return send("GET", path, null, token);
    }

    public Response post(String path, String json) {
        return send("POST", path, json, null);
    }

    public Response post(String path, String json, String token) {
        return send("POST", path, json, token);
    }

    public Response put(String path, String json, String token) {
        return send("PUT", path, json, token);
    }

    public Response patch(String path, String json, String token) {
        return send("PATCH", path, json, token);
    }

    public static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.org";
    }

    /** Registers a fresh account and returns the whole response. */
    public Response register(String email, String displayName, String accountType) {
        return post("/api/v1/auth/register", "{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                + "\",\"displayName\":\"" + displayName + "\",\"country\":\"United Kingdom\",\"accountType\":\""
                + accountType + "\"}");
    }

    /** Registers (or, if it already exists, signs in) and returns the auth response. */
    public Response registerOrLogin(String email, String displayName, String accountType) {
        Response r = register(email, displayName, accountType);
        if (r.status() == 409) {
            r = post("/api/v1/auth/login", "{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}");
        }
        if (r.status() != 200 && r.status() != 201) {
            throw new IllegalStateException("sign-up failed: " + r);
        }
        return r;
    }

    /** Verifies the account's email using the code the API returns outside production. */
    public void verifyEmail(String token) {
        Response sent = post("/api/v1/me/email/send-code", null, token);
        if (sent.status() == 409) {
            return; // already verified
        }
        if (sent.status() != 200 || sent.field("testCode") == null) {
            throw new IllegalStateException("send-code failed: " + sent);
        }
        Response verified = post("/api/v1/me/email/verify", "{\"code\":\"" + sent.field("testCode") + "\"}", token);
        if (verified.status() != 200) {
            throw new IllegalStateException("verify failed: " + verified);
        }
    }

    /** A new, email-verified account of the given type; returns its access token. */
    public String verifiedUser(String displayName, String accountType) {
        String token = registerOrLogin(uniqueEmail(accountType.toLowerCase()), displayName, accountType).field("accessToken");
        verifyEmail(token);
        return token;
    }

    private Response send(String method, String path, String json, String token) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(base + path))
                .method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json));
        if (json != null) {
            builder.header("Content-Type", "application/json");
        }
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        try {
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body());
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path + " failed", e);
        }
    }

    public record Response(int status, String body) {

        /** First number value of a JSON field anywhere in the body. */
        public Long number(String name) {
            Matcher m = Pattern.compile("\"" + Pattern.quote(name) + "\"\\s*:\\s*(-?\\d+)").matcher(body);
            return m.find() ? Long.parseLong(m.group(1)) : null;
        }

        /** First string value of a JSON field anywhere in the body. */
        public String field(String name) {
            Matcher m = Pattern.compile("\"" + Pattern.quote(name) + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"").matcher(body);
            return m.find() ? m.group(1) : null;
        }

        @Override
        public String toString() {
            return status + " " + body;
        }
    }
}
