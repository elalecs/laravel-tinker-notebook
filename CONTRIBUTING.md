# Contribuyendo a Laravel Tinker Notebook

¡Gracias por tu interés en contribuir a Laravel Tinker Notebook! Este documento proporciona información sobre cómo configurar el entorno de desarrollo y cómo ejecutar las pruebas.

## Arquitectura

Laravel Tinker Notebook es una extensión para VS Code que permite ejecutar código PHP/Laravel directamente desde el editor, mostrando los resultados de forma inline. Para entender la arquitectura del proyecto, consulta [docs/architecture.md](docs/architecture.md).

## Configuración del entorno de desarrollo

1. Clona el repositorio:
   ```bash
   git clone https://github.com/yourusername/laravel-tinker-notebook.git
   cd laravel-tinker-notebook
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Compila la extensión:
   ```bash
   npm run compile
   ```

4. Para ejecutar la extensión en modo de desarrollo, presiona F5 en VS Code para iniciar una nueva ventana con la extensión cargada.

## Estructura del proyecto

```
laravel-tinker-notebook/
├── src/                    # Código fuente de la extensión
│   ├── editor/             # Componentes relacionados con la edición
│   ├── execution/          # Servicios para ejecutar código con Tinker
│   ├── output/             # Procesamiento de la salida de Tinker
│   └── utils/              # Utilidades generales
├── test/                   # Pruebas
│   ├── unit/               # Pruebas unitarias (Jest)
│   │   ├── editor/         # Pruebas para componentes del editor
│   │   └── execution/      # Pruebas para servicios de ejecución
│   └── integration/        # Pruebas de integración (VS Code)
├── docs/                   # Documentación
└── dist/                   # Código compilado (generado)
```

## Pruebas

El proyecto utiliza dos tipos de pruebas:

### Pruebas unitarias

Las pruebas unitarias utilizan Jest y se encuentran en el directorio `test/unit/`. Estas pruebas verifican componentes individuales sin necesidad de iniciar VS Code.

Para ejecutar las pruebas unitarias:

```bash
npm run test
```

Para ejecutar las pruebas unitarias en modo watch (útil durante el desarrollo):

```bash
npm run test:watch
```

### Pruebas de integración

Las pruebas de integración ejecutan la extensión en un entorno real de VS Code utilizando `@vscode/test-electron`. Estas pruebas se encuentran en el directorio `test/integration/`.

Para ejecutar las pruebas de integración:

```bash
npm run test:integration
```

### Ejecutar todas las pruebas

Para ejecutar tanto las pruebas unitarias como las de integración:

```bash
npm run test:all
```

## Mocking del módulo vscode

Para las pruebas unitarias, necesitamos simular el módulo `vscode` que normalmente solo está disponible dentro del entorno de VS Code. Utilizamos un mock personalizado en `test/mocks/vscode.ts`.

## Consejos para desarrolladores

1. **Pruebas unitarias vs. integración**: 
   - Usa pruebas unitarias para componentes aislados y lógica de negocio.
   - Usa pruebas de integración para verificar que la extensión funciona correctamente en un entorno real de VS Code.

2. **Debugging**:
   - Para depurar la extensión, inicia una sesión de depuración en VS Code (F5).
   - Para depurar pruebas, puedes usar el comando `Debug Tests` en VS Code.

3. **Estructura de commits**:
   - Usa mensajes de commit descriptivos que expliquen qué cambios se han realizado.
   - Cada commit debe abordar un solo problema o característica.

## Proceso de contribución

1. Crea una rama para tu característica o corrección.
2. Implementa tus cambios.
3. Asegúrate de que todas las pruebas pasen.
4. Envía un pull request con una descripción clara de los cambios.

## Directrices de código

- Sigue las convenciones de estilo de TypeScript.
- Documenta las funciones y clases con comentarios JSDoc.
- Mantén un alto porcentaje de cobertura de pruebas.
- Utiliza nombres descriptivos para variables, funciones y clases.

¡Gracias por contribuir a Laravel Tinker Notebook!
