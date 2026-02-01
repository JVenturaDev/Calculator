package com.tuapp.backend.controller;

import com.tuapp.backend.model.WorkspaceItem;
import com.tuapp.backend.model.WorkspaceCalculation;
import com.tuapp.backend.service.WorkspaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;

import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/workspace")

public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public record CalculationDTO(String expression, String result, String steps) {
    }

    public record ExpressionDTO(String expression) {
    }

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    // ---------------- Workspace Items ----------------

    @GetMapping("/items")
    public List<WorkspaceItem> getAllItems() {
        return workspaceService.getAllItems();
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<WorkspaceItem> getItem(@PathVariable @NonNull UUID id) {
        return workspaceService.getItem(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/items")
    public WorkspaceItem createItem(@RequestBody WorkspaceItem item) {
        return workspaceService.createItem(
                item.getTitle(),
                item.getType(),
                item.getTags());
    }

    @PutMapping("/items/{id}/expression")
    public ResponseEntity<WorkspaceItem> updateExpression(
            @PathVariable @NonNull UUID id,
            @RequestBody ExpressionDTO body) {
        try {
            WorkspaceItem updated = workspaceService.updateItemExpression(id, body.expression);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/items/{id}/tags")
    public ResponseEntity<WorkspaceItem> updateTags(
            @PathVariable @NonNull UUID id,
            @RequestBody List<String> tags) {
        try {
            WorkspaceItem updated = workspaceService.updateItemTags(id, tags);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable @NonNull UUID id) {
        workspaceService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    // ---------------- Workspace Calculations ----------------

    @GetMapping("/items/{id}/calculations")
    public List<WorkspaceCalculation> getCalculations(@PathVariable UUID id) {
        return workspaceService.getCalculationsForItem(id);
    }

    @PostMapping("/items/{id}/calculations")
    public WorkspaceCalculation addCalculation(
            @PathVariable @NonNull UUID id,
            @RequestBody CalculationDTO dto) {
        return workspaceService.addCalculation(
                id,
                dto.expression(),
                dto.result(),
                dto.steps());
    }

}
