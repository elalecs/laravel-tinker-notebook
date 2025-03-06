#!/bin/bash

# Script para ejecutar la captura de documentación visual
# para Laravel Tinker Notebook

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Laravel Tinker Notebook - Documentación   ${NC}"
echo -e "${GREEN}=============================================${NC}"

# Verificar si estamos en macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}Error: Este script está diseñado para ejecutarse en macOS${NC}"
  exit 1
fi

# Verificar si ffmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
  echo -e "${YELLOW}ffmpeg no está instalado. Se requiere para generar GIFs y videos.${NC}"
  echo -e "${YELLOW}¿Desea instalarlo usando Homebrew? (s/n)${NC}"
  read -r respuesta
  
  if [[ "$respuesta" =~ ^[Ss]$ ]]; then
    # Verificar si Homebrew está instalado
    if ! command -v brew &> /dev/null; then
      echo -e "${YELLOW}Homebrew no está instalado. Instalando...${NC}"
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    echo -e "${YELLOW}Instalando ffmpeg...${NC}"
    brew install ffmpeg
  else
    echo -e "${RED}ffmpeg es necesario para continuar. Abortando.${NC}"
    exit 1
  fi
fi

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js no está instalado.${NC}"
  echo -e "${YELLOW}Por favor, instale Node.js desde https://nodejs.org/${NC}"
  exit 1
fi

# Verificar si VS Code está instalado
if ! command -v code &> /dev/null; then
  echo -e "${RED}Error: VS Code no está instalado.${NC}"
  echo -e "${YELLOW}Por favor, instale VS Code desde https://code.visualstudio.com/${NC}"
  exit 1
fi

# Verificar si el script de documentación existe
SCRIPT_PATH="$(dirname "$0")/captureDocumentation.js"
if [ ! -f "$SCRIPT_PATH" ]; then
  echo -e "${RED}Error: No se encontró el script de documentación en $SCRIPT_PATH${NC}"
  exit 1
fi

# Asegurarse de que el script tenga permisos de ejecución
chmod +x "$SCRIPT_PATH"

# Instalar dependencias si es necesario
echo -e "${YELLOW}Verificando dependencias...${NC}"
cd "$(dirname "$0")/.." || exit

# Verificar que estamos en macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}Este script solo funciona en macOS.${NC}"
  exit 1
fi

# Verificar que AppleScript está disponible (debería estarlo en todos los macOS)
if ! command -v osascript &> /dev/null; then
  echo -e "${RED}Error: osascript no está disponible.${NC}"
  echo -e "${YELLOW}Este script requiere AppleScript, que debería estar disponible en macOS.${NC}"
  exit 1
fi

# Verificar si @vscode/test-electron está instalado
if ! npm list @vscode/test-electron > /dev/null 2>&1; then
  echo -e "${YELLOW}Instalando @vscode/test-electron...${NC}"
  npm install @vscode/test-electron
fi

# Ejecutar el script de documentación
echo -e "${GREEN}Iniciando captura de documentación...${NC}"
echo -e "${YELLOW}⚠️  ADVERTENCIA: No interactúe con su computadora durante la captura.${NC}"
echo -e "${YELLOW}⚠️  El proceso tomará varios minutos.${NC}"
echo ""
echo -e "${YELLOW}Presione Enter para comenzar...${NC}"
read -r

# Crear directorio para imágenes si no existe
DOCS_IMAGES_DIR="$(dirname "$0")/../docs/images"
if [ ! -d "$DOCS_IMAGES_DIR" ]; then
  echo -e "${YELLOW}Creando directorio para imágenes...${NC}"
  mkdir -p "$DOCS_IMAGES_DIR"
fi

# Verificar permisos de accesibilidad para control de teclado
echo -e "${YELLOW}IMPORTANTE: Este script necesita permisos de accesibilidad para controlar el teclado.${NC}"
echo -e "${YELLOW}Si se solicita, por favor conceda estos permisos a Terminal/iTerm en:${NC}"
echo -e "${YELLOW}Preferencias del Sistema > Seguridad y Privacidad > Privacidad > Accesibilidad${NC}"
echo -e "${YELLOW}NOTA: Durante la ejecución del script, NO INTERACTUE con su computadora.${NC}"
echo -e "${YELLOW}El script automatizará VS Code para capturar imágenes y videos.${NC}"
echo -e "${YELLOW}Presione Enter cuando esté listo...${NC}"
read -r

# Ejecutar el script
node "$SCRIPT_PATH"

# Verificar si la ejecución fue exitosa
if [ $? -eq 0 ]; then
  echo -e "${GREEN}=============================================${NC}"
  echo -e "${GREEN}  ¡Captura de documentación completada!     ${NC}"
  echo -e "${GREEN}=============================================${NC}"
  echo -e "${YELLOW}Los archivos se han guardado en:${NC}"
  echo -e "${YELLOW}$(dirname "$0")/../docs/images/${NC}"
else
  echo -e "${RED}=============================================${NC}"
  echo -e "${RED}  Error durante la captura de documentación  ${NC}"
  echo -e "${RED}=============================================${NC}"
fi
