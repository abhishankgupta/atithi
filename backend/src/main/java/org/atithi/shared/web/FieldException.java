package org.atithi.shared.web;

import org.springframework.http.HttpStatus;

/** A validation error tied to one request field; rendered like bean-validation errors. */
public class FieldException extends ApiException {

    private final String field;

    public FieldException(String field, String message) {
        super(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message);
        this.field = field;
    }

    public String field() {
        return field;
    }
}
