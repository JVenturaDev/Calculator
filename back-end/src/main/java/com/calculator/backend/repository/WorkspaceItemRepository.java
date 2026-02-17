package com.calculator.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.calculator.backend.model.WorkspaceItem;

import java.util.UUID;

@Repository
public interface WorkspaceItemRepository extends JpaRepository<WorkspaceItem, UUID> {
}
