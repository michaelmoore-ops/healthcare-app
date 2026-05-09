# Healthcare Innovation Platform

A full-stack Healthcare Innovation application designed to modernize and streamline healthcare automation. This project features a robust **.NET 8 Web API** backend and a high-performance **Angular 19** frontend.

## 🚀 Technology Stack

- **Frontend:** Angular 19 (Standalone Components, esbuild)
- **Backend:** .NET 8 Web API (C#)
- **Deployment:** Render (Backend via Docker) & Vercel (Frontend)

---

## 📂 Project Structure

```text
├── TB-2026 FE/        # Angular 19 Frontend Application
└── TS_2026_BE/        # .NET 8 Backend Application
```

---

## 🛠️ Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Angular CLI](https://angular.dev/tools/cli) (`npm install -g @angular/cli`)
- [.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
- Visual Studio 2022 or VS Code

### 1. Running the Backend (.NET 8)
1. Navigate to the backend directory or open the solution in Visual Studio:
   ```bash
   cd TS_2026_BE
   ```
2. Restore dependencies and run the application:
   ```bash
   dotnet restore
   dotnet run
   ```
3. The API will start on `http://localhost:5050`. You can access the Swagger documentation at `http://localhost:5050/swagger`.

### 2. Running the Frontend (Angular 19)
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd "TB-2026 FE"
   ```
2. Install the necessary NPM packages:
   ```bash
   npm install
   ```
3. Start the Angular development server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to `http://localhost:4200`.

---

## 🌍 Production Deployment

This project is configured for free, automated cloud deployment.

### Backend (Render)
The backend is containerized using Docker.
1. Connect your GitHub repository to [Render](https://render.com/).
2. Create a new **Web Service** using Docker as the runtime.
3. Set the Root Directory to `TS_2026_BE`.
4. Render will automatically build the `Dockerfile` and expose the API.

### Frontend (Vercel)
The frontend is deployed as a static site using Vercel.
1. Connect your GitHub repository to [Vercel](https://vercel.com/).
2. Set the Root Directory to `TB-2026 FE`.
3. Set the Framework Preset to **Angular**.
4. **Important:** Override the Output Directory setting to `dist/healthcareapplication/browser`.

---

## 📝 License
This project is licensed under the MIT License.
