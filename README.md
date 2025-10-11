# Multifunctional Math Web App

[![Status](https://img.shields.io/badge/Status-Development-yellow)](https://jventuradev.github.io/Calculator/calculadora.html)
[![License](https://img.shields.io/badge/License-GPLv3-blue)](https://www.gnu.org/licenses/gpl-3.0.en.html)
[![GitHub Pages](https://img.shields.io/badge/GH-Pages-green)](https://jventuradev.github.io/Calculator/calculadora.html)

Basic and scientific calculator with history, memory, mobile UI, and support for advanced operations. Workspace and graphing calculator are under development.

---

## Demo Calculator

![Screenshot](ruta-a-tu-imagen.gif)
**Online Demo:** [Calculator](https://jventuradev.github.io/Calculator/calculadora.html)

---

## Table of Contents

* [Installation](#installation)
* [Usage / Features](#usage--features)
* [Technologies](#technologies)
* [Project Status / Roadmap](#project-status--roadmap)
* [Usage Examples](#usage-examples)
* [Contribution](#contribution)
* [License](#license)

---

## Installation

Clone the repository:

```bash
git clone https://github.com/JVenturaDev/Calculator.git
cd Calculator
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

**Requirements:** Node.js

---

## Usage / Features

### Currently Functional

* Basic and scientific calculator: arithmetic, trigonometric, logarithmic, roots, powers.
* Math.js: support for roots with imaginary numbers.
* History: persistent with `localStorage`.
* Memory: persistent with `IndexedDB`.
* Mobile UI: adapted for the basic calculator.

### In Development

* Workspace for saving, editing, and organizing complete tasks.
* Graphing calculator.
* Mobile UI for scientific calculator.

### Future

* Internal chat and sharing area.
* Optional AI integration.
* User login and profiles.

---

## Technologies

* TypeScript
* HTML / CSS
* Vite
* Node.js
* localStorage: simple history
* IndexedDB: advanced memory
* Math.js: advanced mathematical operations including imaginary numbers

---

## Project Status / Roadmap

**Functional:**

* Basic and scientific calculator
* History and memory
* Mobile UI for basic calculator

**In Development:**

* Workspace
* Graphing calculator
* Mobile UI for scientific calculator

**Future Plans:**

* Internal chat and sharing area
* Optional AI integration
* User login and profiles

---

## Usage Examples

```typescript
import { calcular } from './src/calculadora.ts';

const result = calcular('sqrt(-4)'); // Math.js supports imaginary numbers
console.log(result); // 2i

memory.save('result1', result);
console.log(localStorage.getItem('history'));
```

---

## Contribution

* Fork the repository
* Create your branch (`git checkout -b feature/new-feature`)
* Commit your changes (`git commit -am 'Add new feature'`)
* Submit a pull request

Please follow the existing modular and clean code structure.

---

## License

This project is licensed under the **GNU General Public License v3 (GPLv3)**.

For more information, check the [LICENSE](./LICENSE) file or visit the official page: [GPLv3](https://www.gnu.org/licenses/gpl-3.0.txt).

**Why GPLv3:**

* Ensures that any distribution, modification, or use of the code remains free and open.
* Requires that derivatives of the project also share their code under the same license, protecting the philosophy of free software.
