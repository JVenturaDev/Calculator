package com.tuapp.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workspace_calculation")
public class WorkspaceCalculation {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "workspace_item_id", nullable = false)
    private WorkspaceItem workspaceItem;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String expression;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String result;

    @Column(columnDefinition = "jsonb")
    private String steps;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    // Getters y setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public WorkspaceItem getWorkspaceItem() { return workspaceItem; }
    public void setWorkspaceItem(WorkspaceItem workspaceItem) { this.workspaceItem = workspaceItem; }

    public String getExpression() { return expression; }
    public void setExpression(String expression) { this.expression = expression; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public String getSteps() { return steps; }
    public void setSteps(String steps) { this.steps = steps; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
