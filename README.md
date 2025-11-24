# Calculator (Angular Version)

A modern web-based calculator built with **Angular 20.3.7**, designed to provide a complete mathematical workspace.
This version is the **successor** of the original Vite + TypeScript project and is currently being migrated to Angular for improved scalability, modularity, and maintainability.

---

## Live Demo

**GitHub Pages:** [https://jventuradev.github.io/Calculator/](https://jventuradev.github.io/Calculator/)

---

## Overview

The application currently includes:

* **Basic Calculator** – fully functional.
* **Scientific Calculator** – complete with advanced operations.
* **Sidebar Navigation** – allows switching between calculator modes.
* **Memory and History Modules** – operational and stored via IndexedDB.
* **Graphing Calculator** – under development.
* **Workspace System** – planned for saving, tagging, and organizing full calculations and graphs.

The project is under **active migration and enhancement**, with responsive design and advanced modules being restructured for Angular compatibility.

---

## Project Structure

```
Calculator/
├── src/
│   ├── app/
│   │   ├── components/        # Calculator, workspace, memory, etc.
│   │   ├── services/          # State, storage, evaluator, etc.
│   │   ├── lib/               # Calculator engine
│   │   └── app.module.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── angular.json
├── package.json
├── README.md
├── package-lock.json
├── Licence
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json
```

---

## Tech Stack

* **Angular 20.3.7**
* **Vite, Node.js**
* **TypeScript, JavaScript**
* **IndexedDB, LocalStorgae** for persistence
* **HTML / CSS**
* **Git, GitHub**  Development & Version Control
* **GitHub Actions** for CI/CD
* **GitHub Pages** for deployment

---

## Current Status

| Module                | Status            | Notes                                 |
| :-------------------- | :---------------- | :------------------------------------ |
| Basic Calculator      | ✅ Functional      | Accessible via sidebar                |
| Scientific Calculator | ✅ Functional      | Supports advanced math                |
| Memory                | ✅ Functional      | Data stored locally                   |
| History               | ✅ Functional      | Displays recent calculations          |
| Graphing              | ✅ Functional      | To include plotting and analysis      |
| Workspace             | 🚧 In progress    | Will allow saving and versioning work |
| Responsive Design     | ⚙️ Pending        | Not yet optimized post-migration      |

---

## Roadmap

| Phase | Feature                           | Status         |
| :---- | :-------------------------------- | :------------- |
| 1     | Core migration to Angular         | ✅ Completed   |
| 2     | Memory and History integration    | ✅ Completed   |
| 3     | Graphing calculator               | ✅ Completed   |
| 4     | Workspace (projects, tags, notes) | 🚧 In progress |
| 5     | Camera-based math solver          | 🧩 Planned     |
| 6     | Chat                              | 🧩 Planned     |
| 7     | Log tracking system               | 🧩 Planned     |
| 8     | Responsive design improvement     | 🔄 Pending     |
| 9     | Automated testing & CI/CD         | 🧩 Planned     |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/JVenturaDev/Calculator.git

# Navigate to the project folder
cd Calculator

# Install dependencies
npm install

# Run locally
ng serve
```

Then open your browser at [http://localhost:4200](http://localhost:4200).

---

## Author

**Jonathan Ventura**
GitHub: [JVenturaDev](https://github.com/JVenturaDev)

---

**License**

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)** — see the [LICENSE](LICENSE) file for full details.

© 2025 Jonathan Ventura.
You are free to use, modify, and distribute this software under the same license terms, provided that proper attribution and a copy of the GPL v3 are included.
