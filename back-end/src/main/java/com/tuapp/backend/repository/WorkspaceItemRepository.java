package com.tuapp.backend.repository;

import com.tuapp.backend.model.WorkspaceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface WorkspaceItemRepository extends JpaRepository<WorkspaceItem, UUID> {
}
