package org.atithi.shared.web;

import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Turns errors into RFC 7807 problem+json bodies with a stable {@code code} field,
 * as described in section 7.1 of the architecture doc.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> handleApi(ApiException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.status(), ex.getMessage());
        problem.setType(URI.create("urn:atithi:error:" + ex.code().toLowerCase(Locale.ROOT).replace('_', '-')));
        problem.setProperty("code", ex.code());
        if (ex instanceof FieldException fe) {
            problem.setProperty("fieldErrors", List.of(Map.of("field", fe.field(), "message", fe.getMessage())));
        }
        return ResponseEntity.status(ex.status()).body(problem);
    }

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setType(URI.create("urn:atithi:error:not-found"));
        problem.setProperty("code", ex.code());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request has invalid fields");
        problem.setType(URI.create("urn:atithi:error:validation"));
        problem.setProperty("code", "VALIDATION_FAILED");
        List<Map<String, String>> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", String.valueOf(e.getDefaultMessage())))
                .toList();
        problem.setProperty("fieldErrors", fieldErrors);
        return problem;
    }

    /** A query or path parameter of the wrong type, e.g. an unknown sort value. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Invalid value for '" + ex.getName() + "'");
        problem.setType(URI.create("urn:atithi:error:validation"));
        problem.setProperty("code", "INVALID_PARAMETER");
        problem.setProperty("fieldErrors", List.of(Map.of("field", ex.getName(), "message", "invalid value")));
        return problem;
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail handleTooLarge(MaxUploadSizeExceededException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE, "Photos must be under 10 MB");
        problem.setType(URI.create("urn:atithi:error:image-too-large"));
        problem.setProperty("code", "IMAGE_TOO_LARGE");
        return problem;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail handleUnreadable(HttpMessageNotReadableException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request body is missing or malformed");
        problem.setType(URI.create("urn:atithi:error:validation"));
        problem.setProperty("code", "MALFORMED_REQUEST");
        return problem;
    }
}
