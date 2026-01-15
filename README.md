# FinanceFlow

FinanceFlow es una solución moderna para la gestión de finanzas personales, diseñada para ofrecer un control total sobre ingresos, gastos y deudas a través de un panel de control intuitivo y analíticas visuales.

La aplicación integra **Supabase** para una gestión de datos robusta en la nube, garantizando que tu información financiera esté siempre sincronizada y segura.

🔗 **Demo Desplegada**: [financeflow.koyeb.app](https://financeflow.koyeb.app)

## 🚀 Características Principales

- **Dashboard Visual**: Vista general instantánea del estado financiero con balance total, ingresos y gastos.
- **Gestión de Transacciones**:
  - Registro de ingresos y gastos categorizados.
  - Edición y eliminación de registros históricos.
- **Módulo de Deudas**:
  - Seguimiento detallado de obligaciones financieras.
  - Funcionalidad para registrar abonos parciales, actualizando automáticamente el saldo pendiente.
- **Análisis Gráfico**:
  - Gráficos de barras para comparar ingresos vs. gastos.
  - Gráficos circulares para visualizar la distribución de deudas.
- **Autenticación Segura**: Sistema de login y protección de datos mediante Supabase Auth.
- **Diseño Responsivo**: Interfaz optimizada para una experiencia fluida tanto en escritorio como en dispositivos móviles.

## 🛠️ Stack Tecnológico

Este proyecto ha sido construido utilizando tecnologías web modernas para asegurar rendimiento y escalabilidad:

- **Frontend**: [React 19](https://react.dev/) con [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) para un desarrollo y compilación ultrarrápidos.
- **Backend as a Service**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime).
- **Visualización**: [Recharts](https://recharts.org/) para gráficos estadísticos.

## 📦 Configuración Local

Sigue estos pasos para levantar el proyecto en tu entorno local:

1.  **Clonar el repositorio**
    ```bash
    git clone https://github.com/tu-usuario/financeflow.git
    cd FinanceFlow
    ```

2.  **Instalar dependencias**
    ```bash
    npm install
    ```

3.  **Configuración de Variables de Entorno**
    Crea un archivo `.env` en la raíz del proyecto y añade tus credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=tuta_project_url
    VITE_SUPABASE_ANON_KEY=tu_anon_key
    ```

4.  **Ejecutar en desarrollo**
    ```bash
    npm run dev
    ```

## 📄 Estructura del Proyecto

- `/src`
  - `/services`: Lógica de integración con la API de Supabase.
  - `App.tsx`: Componente raíz que orquesta la navegación y el estado global.
  - `types.ts`: Definiciones de interfaces y tipos para un código robusto.

## 🤖 Desarrollo y Créditos

Esta aplicación fue creada utilizando la potencia de **Gemini** mediante **Google AI Studio**.

Cada cambio, ajuste de código y decisión de diseño, así como la idea original, fueron supervisados meticulosamente por el autor del proyecto, asegurando un resultado de alta calidad ajustado a la visión inicial.

---
Desarrollado con profesionalismo para la gestión eficiente de finanzas personales.

---
Desarrollado por [Kevin E. Cardona](https://github.com/porgetit)

