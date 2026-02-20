package com.calculator.backend.workSpace.controller;

import com.calculator.backend.workSpace.model.WorkspaceCalculation;
import com.calculator.backend.workSpace.model.WorkspaceItem;
import com.calculator.backend.workSpace.service.WorkspaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/workspace")
public class WorkspaceController {

  private final WorkspaceService workspaceService;

  public record CalculationDTO(String expression, String result, String steps) {}
  public record ExpressionDTO(String expression) {}

  public WorkspaceController(WorkspaceService workspaceService) {
    this.workspaceService = workspaceService;
  }

  // ---------------- Helpers ----------------

private UUID currentUserId() {
  Authentication auth = SecurityContextHolder.getContext().getAuthentication();
  if (auth == null || auth.getPrincipal() == null) {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  }

  Object principal = auth.getPrincipal();

  if (principal instanceof UUID uuid) return uuid;

  if (principal instanceof String s) {
    try { return UUID.fromString(s); }
    catch (Exception e) { throw new ResponseStatusException(HttpStatus.FORBIDDEN); }
  }

  throw new ResponseStatusException(HttpStatus.FORBIDDEN);
}


  // ---------------- Workspace Items ----------------

  @GetMapping("/items")
  public List<WorkspaceItem> getAllItems() {
    return workspaceService.getAllItems(currentUserId());
  }

  @GetMapping("/items/{id}")
  public ResponseEntity<WorkspaceItem> getItem(@PathVariable @NonNull UUID id) {
    return workspaceService.getItem(currentUserId(), id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/items")
  public WorkspaceItem createItem(@RequestBody WorkspaceItem item) {
    return workspaceService.createItem(
        currentUserId(),
        item.getTitle(),
        item.getType(),
        item.getTags()
    );
  }

  @PutMapping("/items/{id}/expression")
  public ResponseEntity<WorkspaceItem> updateExpression(
      @PathVariable @NonNull UUID id,
      @RequestBody ExpressionDTO body
  ) {
    try {
      WorkspaceItem updated = workspaceService.updateItemExpression(currentUserId(), id, body.expression());
      return ResponseEntity.ok(updated);
    } catch (Exception e) {
      return ResponseEntity.notFound().build();
    }
  }

  @PutMapping("/items/{id}/tags")
  public ResponseEntity<WorkspaceItem> updateTags(
      @PathVariable @NonNull UUID id,
      @RequestBody List<String> tags
  ) {
    try {
      WorkspaceItem updated = workspaceService.updateItemTags(currentUserId(), id, tags);
      return ResponseEntity.ok(updated);
    } catch (Exception e) {
      return ResponseEntity.notFound().build();
    }
  }

  @DeleteMapping("/items/{id}")
  public ResponseEntity<Void> deleteItem(@PathVariable @NonNull UUID id) {
    workspaceService.deleteItem(currentUserId(), id);
    return ResponseEntity.noContent().build();
  }

  // ---------------- Workspace Calculations ----------------

  @GetMapping("/items/{id}/calculations")
  public List<WorkspaceCalculation> getCalculations(@PathVariable @NonNull UUID id) {
    return workspaceService.getCalculationsForItem(currentUserId(), id);
  }

  @PostMapping("/items/{id}/calculations")
  public WorkspaceCalculation addCalculation(
      @PathVariable @NonNull UUID id,
      @RequestBody CalculationDTO dto
  ) {
    return workspaceService.addCalculation(
        currentUserId(),
        id,
        dto.expression(),
        dto.result(),
        dto.steps()
    );
  }
}
