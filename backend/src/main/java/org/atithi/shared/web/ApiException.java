package org.atithi.shared.web;

import org.springframework.http.HttpStatus;

/**
 * A business error with an HTTP status and a stable machine-readable code,
 * rendered as RFC 7807 problem+json by {@link ApiExceptionHandler}.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
