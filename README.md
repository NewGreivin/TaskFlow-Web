# TaskFlow

TaskFlow es una aplicación de gestión de tareas hecha con React Native, Expo y Expo Router. La versión web mantiene la misma interfaz y navegación, pero usa un sidebar izquierdo y persiste todos los datos en `localStorage` del navegador.

## Ejecutar localmente

```bash
npm install
npm run web
```

Para generar la versión estática que se publica en Vercel:

```bash
npm run build:web
```

El proyecto incluye `vercel.json` con `dist` como directorio de salida y fallback para las rutas de Expo Router. También se puede importar el repositorio directamente en Vercel; el comando y el directorio se detectan automáticamente.

## Datos y copias de seguridad

Las tareas, proyectos, categorías, recordatorios y preferencias se guardan en la clave `taskflow:data:v1` del almacenamiento local del navegador. La información permanece disponible sin conexión en ese navegador, pero no se sincroniza entre dispositivos ni usuarios. Usa las opciones de copia de seguridad para exportar o restaurar los datos.

## Tecnologías

- Expo SDK 57 y React Native Web
- Expo Router con sidebar basado en Drawer
- React Native Paper
- `localStorage` del navegador
- Exportación XLSX/PDF y copias JSON
