package com.tuapp.backend.model;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class Step {
    private String type; 
    private String name;
    private List<Object> operands; 
    private Object result; 
}
