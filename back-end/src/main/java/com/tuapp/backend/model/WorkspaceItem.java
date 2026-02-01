package com.tuapp.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workspace_items")
@Getter
@Setter
public class WorkspaceItem {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(name = "current_expression", columnDefinition = "TEXT")
    private String currentExpression;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "workspace_item_tags", joinColumns = @JoinColumn(name = "workspace_item_id"))
    @Column(name = "tag")
    private List<String> tags;

    @OneToMany(mappedBy = "workspaceItem", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<WorkspaceCalculation> calculations;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
