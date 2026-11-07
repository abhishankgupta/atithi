package org.atithi.shared.web;

/** Thrown when a requested resource does not exist; mapped to a 404 problem response. */
public class NotFoundException extends RuntimeException {

    private final String code;

    public NotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
