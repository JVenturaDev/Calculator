"use strict";
if (typeof Math.log !== "function") {
    Math.log = (x) => {
        if (x <= 0)
            throw new Error("ln solo acepta números positivos");
        return Math.log(x);
    };
}
if (typeof Math.log10 !== "function") {
    Math.log10 = (x) => Math.log(x) / Math.log(10);
}
