"use strict";

/* =====================================================
   CONFIGURACIÓN
===================================================== */

const CONFIG = {

    URL_WEBAPP:
        "https://script.google.com/macros/s/AKfycbw3ZdVicZFzzumU0wjV-_yGtyhcs8AQjvLgNcEH8N8G56qaRQshGjw_F5OpXVK2hrFQ/exec",

    FPS: 10,

    QRBOX: 250

};


/* =====================================================
   ELEMENTOS DEL DOM
===================================================== */

const ELEMENTOS = {

    txtIdMaxisaco:
        document.getElementById("idMaxisaco"),

    btnRegistrar:
        document.getElementById("btnRegistrar"),

    btnEscanear:
        document.getElementById("btnEscanear"),

    mensajeEstado:
        document.getElementById("mensajeEstado"),

    contenedorScanner:
        document.getElementById("contenedorScanner")

};


/* =====================================================
   VARIABLES
===================================================== */

let scannerQR = null;

let scannerActivo = false;


/* =====================================================
   INICIALIZACIÓN
===================================================== */

document.addEventListener("DOMContentLoaded", inicializarAplicacion);


/* =====================================================
   FUNCIÓN PRINCIPAL
===================================================== */

function inicializarAplicacion() {

    ELEMENTOS.btnRegistrar.addEventListener(
        "click",
        registrarMaxisaco
    );

    ELEMENTOS.btnEscanear.addEventListener(
        "click",
        iniciarScanner
    );

}


/* =====================================================
   REGISTRAR MANUALMENTE
===================================================== */

function registrarMaxisaco() {

    const idMaxisaco = obtenerIdMaxisaco();

    if (!idMaxisaco) {

        mostrarMensaje(
            "Ingrese un código.",
            false
        );

        return;

    }

    enviarRegistro(idMaxisaco);

}


/* =====================================================
   OBTENER ID
===================================================== */

function obtenerIdMaxisaco() {

    return ELEMENTOS.txtIdMaxisaco.value.trim();

}


/* =====================================================
   ENVIAR REGISTRO
===================================================== */

async function enviarRegistro(idMaxisaco) {

    try {

        const respuesta = await fetch(
            CONFIG.URL_WEBAPP,
            {

                method: "POST",

                redirect: "follow",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body: JSON.stringify({

                    id: idMaxisaco

                })

            }

        );

        const texto = await respuesta.text();

        const datos = JSON.parse(texto);

        if (datos.ok) {

            mostrarMensaje(

                `✅ ${datos.id}<br>
                 Vueltas: ${datos.vueltas}`,

                true

            );

            limpiarFormulario();

        }

        else {

            mostrarMensaje(

                `❌ ${datos.mensaje}`,

                false

            );

        }

    }

    catch (error) {

        console.error(error);

        mostrarMensaje(

            "Error de conexión.",

            false

        );

    }

}


/* =====================================================
   MOSTRAR MENSAJES
===================================================== */

function mostrarMensaje(texto, correcto) {

    ELEMENTOS.mensajeEstado.innerHTML = texto;

    if (correcto) {

        ELEMENTOS.mensajeEstado.style.color =
            "#2E7D32";

    }

    else {

        ELEMENTOS.mensajeEstado.style.color =
            "#C62828";

    }

}


/* =====================================================
   LIMPIAR FORMULARIO
===================================================== */

function limpiarFormulario() {

    ELEMENTOS.txtIdMaxisaco.value = "";

    ELEMENTOS.txtIdMaxisaco.focus();

}


/* =====================================================
   SCANNER QR
===================================================== */

function iniciarScanner() {

    if (scannerActivo) {

        return;

    }

    scannerActivo = true;

    ELEMENTOS.contenedorScanner.style.display =
        "block";

    scannerQR =
        new Html5Qrcode("contenedorScanner");

    scannerQR.start(

        {

            facingMode: "environment"

        },

        {

            fps: CONFIG.FPS,

            qrbox: {

                width: CONFIG.QRBOX,

                height: CONFIG.QRBOX

            }

        },

        codigoDetectado,

        ignorarErroresScanner

    )

    .catch(function (error) {

        scannerActivo = false;

        console.error(error);

        mostrarMensaje(

            "No fue posible abrir la cámara.",

            false

        );

    });

}


/* =====================================================
   CÓDIGO DETECTADO
===================================================== */

function codigoDetectado(idMaxisaco) {

    detenerScanner();

    ELEMENTOS.txtIdMaxisaco.value = idMaxisaco;

    enviarRegistro(idMaxisaco);

}


/* =====================================================
   DETENER SCANNER
===================================================== */

function detenerScanner() {

    if (!scannerActivo) {

        return;

    }

    scannerQR.stop()

        .then(function () {

            scannerQR.clear();

            scannerActivo = false;

            ELEMENTOS.contenedorScanner.style.display =
                "none";

        });

}


/* =====================================================
   IGNORAR ERRORES DE LECTURA
===================================================== */

function ignorarErroresScanner() {

    // Intencionalmente vacío.

}
