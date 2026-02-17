package com.calculator.backend.workSpace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.calculator.backend.workSpace.model.WorkspaceItem;

import java.util.UUID;

@Repository
public interface WorkspaceItemRepository extends JpaRepository<WorkspaceItem, UUID> {
}
