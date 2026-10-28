# QuizLab — Plataforma de cuestionarios

Frontend en español, preparado para GitHub y Azure Static Web Apps.

## Funciones

- Tres categorías: tecnología, ciencia y cultura general.
- Banco de 30 preguntas con cuatro opciones y una explicación por pregunta.
- Retos de 5 o 10 preguntas.
- Preguntas y opciones en orden aleatorio, sin repetir preguntas dentro de un reto.
- Temporizador de 20, 30 o 45 segundos por pregunta.
- Comprobación de respuestas, opción de saltar y revisión final.
- Puntuación, tiempo respondiendo e historial de los últimos 20 intentos.
- Diseño adaptable a móvil y escritorio; navegación por teclado.
- Sin cuentas, backend, dependencias, compilación ni claves de API.

Los resultados se guardan en localStorage: solo en ese navegador y dirección web. No se sincronizan entre dispositivos. El historial local y el de la web publicada son independientes. Al borrar datos del navegador se pierde el historial.

## Probar

Abre dist/index.html con tu navegador.

Opcional, si tienes Python: desde la carpeta del proyecto ejecuta:

    python -m http.server 8000 --directory dist

Abre http://localhost:8000. No necesitas instalar Node.js.

## Archivos

    dist/
      index.html       Estructura de la aplicación
      styles.css       Diseño y adaptación a móviles
      questions.js     Categorías, preguntas y explicaciones
      app.js           Temporizador, navegación, puntuación e historial
      icon.svg         Icono
    README.md
    .gitignore

dist contiene directamente la web lista para publicar. Debes subir esa carpeta a GitHub.

## 1. Subir a GitHub

1. Crea un repositorio llamado quizlab. Puedes iniciarlo con un README.
2. Selecciona Add file > Upload files.
3. Sube la carpeta dist y este README.md, conservando la estructura.
4. Guarda con Commit changes en la rama main.
5. Comprueba que existe dist/index.html directamente desde la raíz del repositorio.

No subas el ZIP ni una carpeta adicional quizlab que contenga todos los archivos.

Alternativa con Git, desde la carpeta del proyecto y usando la URL real de tu repositorio:

    git init
    git add .
    git commit -m "Crear plataforma QuizLab"
    git branch -M main
    git remote add origin URL_DE_TU_REPOSITORIO
    git push -u origin main

Usa la alternativa Git solo con un repositorio remoto vacío; si lo creaste con README, utiliza la subida web o clónalo primero.

## 2. Crear el recurso Azure

Necesitas una cuenta de GitHub y una cuenta de Azure con suscripción activa y permisos para crear recursos.

1. En https://portal.azure.com busca Static Web Apps / Aplicaciones web estáticas.
2. Pulsa Crear.
3. Selecciona tu suscripción y crea el grupo de recursos rg-quizlab.
4. Nombre: quizlab. Plan: Free.
5. Selecciona una región disponible si se solicita.
6. Origen: GitHub. Inicia sesión y autoriza la conexión.
7. Selecciona tu cuenta, repositorio quizlab y rama main.
8. En Build presets, selecciona Custom.
9. Configura:

    App location: /dist
    Api location: dejar vacío
    Output location: dejar vacío

10. Revisa y crea el recurso.

Esta guía utiliza Azure Static Web Apps. Si tu consigna exige específicamente Azure App Service / Web App, el procedimiento es diferente.

## 3. Configurar el workflow generado

Azure crea un archivo .github/workflows/azure-static-web-apps-....yml en tu repositorio y configura su autorización de despliegue.

Abre ese archivo en GitHub. En el paso de despliegue, dentro de with:, comprueba:

    app_location: "/dist"
    api_location: ""
    output_location: ""
    skip_app_build: true

Añade skip_app_build: true con la misma indentación que app_location si aún no existe.
Mantén los demás valores, especialmente los nombres de secretos configurados por Azure.
Haz commit. No crees un segundo workflow para este recurso.

## 4. Abrir la web

- En GitHub > Actions, espera al despliegue del último commit y comprueba que queda en verde.
- En tu recurso de Azure > Información general, abre la URL generada.
- Prueba un reto y revisa el historial.
- Cambia un texto y haz commit en main: se inicia un nuevo despliegue.

No necesitas comprar un dominio.

## Personalizar preguntas

Edita dist/questions.js. Cada pregunta usa este formato:

    ["Texto de la pregunta", ["Opción A", "Opción B", "Opción C", "Opción D"], 0, "Explicación"]

El índice correcto empieza en 0: A=0, B=1, C=2, D=3.
Mantén al menos 10 preguntas por categoría para permitir el reto completo.
Las opciones se mezclan conservando cuál es la correcta.

La puntuación es respuestas correctas / total de preguntas × 100, redondeada a un entero.
Las preguntas saltadas o cuyo tiempo se agota cuentan como no acertadas.
El tiempo se pausa al mostrar la explicación. Si cambias de pestaña durante una pregunta, el tiempo sigue corriendo.
Los intentos abandonados no se guardan.

## Solución de problemas

- Página 404: revisa dist/index.html y app_location: "/dist".
- Error de compilación: verifica skip_app_build: true y output_location: "".
- No aparecen preguntas: sube también questions.js y app.js.
- No se ve el diseño: comprueba que styles.css está junto a index.html.
- El repositorio no aparece en Azure: revisa la autorización de GitHub para ese repositorio.
- No hay historial en otro dispositivo: es el comportamiento esperado.
- El navegador bloquea almacenamiento: puedes jugar, pero el historial queda solo en memoria durante esa sesión.

## Documentación oficial

- https://learn.microsoft.com/en-us/azure/static-web-apps/get-started-portal
- https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration
- https://learn.microsoft.com/en-us/azure/static-web-apps/plans

Este paquete contiene el proyecto local. No crea por sí mismo repositorios ni recursos en Azure.
