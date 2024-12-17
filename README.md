### **Getting Started**

This page will guide you through the steps required to set up the CARJAN Scenario Editor, including prerequisites, installation, and launching the application. Ensure that your system meets the specified requirements before proceeding.

---

### **1. Prerequisites**

Before setting up CARJAN, ensure that the following prerequisites are met:

#### **System Requirements**

- **Node.js**: Version **8.6.0**.
- **Python**: Version **3.7.0**.
- **CARLA Simulator**: Version [**0.9.15**](https://carla.readthedocs.io/en/0.9.15/start_quickstart/).
- **AJAN Service**: [Latest](https://github.com/aantakli/AJAN-service)
- A Unix-like terminal (for `.sh` scripts) or a Windows environment (for `.bat` scripts).
- Available Ports on 2000, 4200-4204, 5000, 8080, 8090

---

### **2. Installation Steps**

1. **Clone the CARJAN Repository**
   Clone the CARJAN editor repository from GitHub:

   ```bash
   git clone https://github.com/leonardneis/CARJAN.git
   cd CARJAN
   ```

2. **Install Dependencies**
   Run the following commands to set up the required dependencies:
   - For Python:
     ```bash
     pip install -r requirements.txt
     ```
   - For Node.js:
     ```bash
     npm install
     ```

If you are unfamiliar with setting up AJAN, follow the official tutorial for general setup steps:

- [AJAN Editor Wiki](https://github.com/aantakli/AJAN-editor#readme)
- [AJAN Service Wiki](https://github.com/aantakli/AJAN-service#readme)

It is mandatory that you set up the Triplestore accordingly.

---

### **3. Starting the Services**

The CARJAN Scenario Editor relies on several services, including the AJAN Service and the CARJAN-specific components.

#### **Step 1: Start the AJAN Service**

1. Navigate to the AJAN service folder.
2. Start the services using the following command:

   ```bash
   ./startAll.sh
   ```

   _(For Windows, use `startAll.bat`)_

   This will:

   - Open two terminals.
   - Launch the Triple Store and the AJAN Execution Service.

#### **Step 2: Start the AJAN Editor**

1. Navigate to the AJAN Editor directory.
2. Start the required components:

   - **Editor**:
     ```bash
     ./startEditor.sh
     ```
   - **CARJAN Service**:
     ```bash
     ./startCarjanService.sh
     ```
   - **Report Service**:
     ```bash
     ./startReportService.sh
     ```

   _(For Windows, use `.bat` equivalents instead of `.sh`.)_

---

### **4. Accessing the Editor**

Once the services are running:

1. **Access the main editor** at:
   - [http://localhost:4200/home](http://localhost:4200/home)
   - Make sure you have [defined a triple store](https://github.com/aantakli/AJAN-editor?tab=readme-ov-file#interaction-with-ajan-service).
2. **Access CARJAN directly** at:
   - [http://localhost:4200/editor/services/carjan](http://localhost:4200/editor/services/carjan)

---

### **5. Notes and Resources**

#### **Wiki References**

For detailed instructions and concepts related to AJAN, refer to:

- [AJAN Service Wiki](https://github.com/aantakli/AJAN-service/wiki) (e.g., for behavior nodes, behavior trees, and triple store setup).
- [AJAN Editor Wiki](https://github.com/aantakli/AJAN-editor/wiki) (general AJAN Editor references).

---

### **Next Steps**

Once your environment is set up and the editor is accessible:

1. Explore the **Canvas and Layout** to familiarize yourself with CARJAN's interface.
2. Start modeling your first scenario using **Entities**, **Paths**, and **Decision Boxes**.

[Continue to the Canvas →](wiki/Canvas)

---
