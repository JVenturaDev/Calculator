package com.tuapp.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workspace_items")
public class WorkspaceItem {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 50)
    private String type; 

    @Column(name = "current_expression", columnDefinition = "TEXT")
    private String currentExpression;

    @ElementCollection
    @CollectionTable(name = "workspace_item_tags", joinColumns = @JoinColumn(name = "workspace_item_id"))
    @Column(name = "tag")
    private List<String> tags;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "workspaceItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkspaceCalculation> calculations;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCurrentExpression() { return currentExpression; }
    public void setCurrentExpression(String currentExpression) { this.currentExpression = currentExpression; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<WorkspaceCalculation> getCalculations() { return calculations; }
    public void setCalculations(List<WorkspaceCalculation> calculations) { this.calculations = calculations; }
}
