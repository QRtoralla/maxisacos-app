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

let cantidadEsperada = 0;

let cantidadLeida = 0;



let codigosLeidos = [];

let lecturaFinalizada = false;


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

/*en relacion a los catch solo se modifica este en general, tampoco appscript*/
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

    limpiarFormulario();

    return {

        ok: true,

        id: datos.id,

        vueltas: datos.vueltas

    };

}

return {

    ok: false,

    id: idMaxisaco,

    mensaje: datos.mensaje

};

    }

    catch (error) {

        console.error(error);

        return {

        ok: false,

        id: idMaxisaco,

        mensaje: "Error de conexión."

    };

    }

}

/* ENVIAR TODOS LOS REGISTROS */

async function enviarTodosLosRegistros() {

   const resultados = [];

    for (const idMaxisaco of codigosLeidos) {

        const resultado =
           await enviarRegistro(idMaxisaco);

       resultados.push(resultado);

    }

   let enviados = 0;
   let advertencias = 0;
   let listaObsoletos = "";
   

 // Aquí seguirá el siguiente bloque

for (const resultado of resultados) {

    if (resultado.ok) {

        enviados++;

    }

    else {

        advertencias++;

        listaObsoletos +=
            `⚠️ ${resultado.id} alcanzó el máximo de 5 vueltas.<br><br>`;

    }

}

   /*en el codigo anterior no mostrará nada, solo contará:

Cuántos registros fueron exitosos.
Cuántas advertencias hubo.
Qué maxisacos quedaron obsoletos.*/

   /*------------------------------------------------------------------*/
   let mensaje =

    "==============================<br><br>" +

    "✅ Lectura completada<br><br>" +

    `Registros enviados: ${enviados}<br><br>` +

    `Advertencias: ${advertencias}<br><br>` +

    "────────────────────────<br><br>";


if (advertencias > 0) {

    mensaje +=

        listaObsoletos +

        "Se recomienda retirarlo de circulación.";

}


mostrarMensaje(

    mensaje,

    advertencias === 0

);

   /*-----------------------------------------------------------*/
   

    codigosLeidos = [];

    cantidadEsperada = 0;

    cantidadLeida = 0;

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

    const cantidad = Number(

        prompt("¿Cuántos maxisacos se leerán?")

    );

    if (

        !Number.isInteger(cantidad) ||

        cantidad <= 0

    ) {

        mostrarMensaje(

            "Ingrese una cantidad válida.",

            false

        );

        return;

    }

    cantidadEsperada = cantidad;

    cantidadLeida = 0;

    codigosLeidos = [];

    mostrarMensaje(

        `0 / ${cantidadEsperada}`,

        true

    );

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

    function (decodedText, decodedResult) {

        codigoDetectado(decodedText);

    },

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


    idMaxisaco = String(idMaxisaco).trim();

    if (codigosLeidos.includes(idMaxisaco)) {

        mostrarMensaje(

            `⚠️ ${idMaxisaco} ya fue leído.<br>${cantidadLeida} / ${cantidadEsperada}`,

            false

        );

        return;

    }

    codigosLeidos.push(idMaxisaco);

    cantidadLeida++;

    ELEMENTOS.txtIdMaxisaco.value = idMaxisaco;

    mostrarMensaje(

        `${cantidadLeida} / ${cantidadEsperada}`,

        true

    );

    if (cantidadLeida === cantidadEsperada) {

    mostrarMensaje(
        "�� Enviando registros...",
        true
    );

    detenerScanner()

        .then(function () {

            enviarTodosLosRegistros();

        });

}


}


/* =====================================================
   DETENER SCANNER
===================================================== */

function detenerScanner() {

    if (!scannerActivo) {


        return Promise.resolve();

    }

    return scannerQR.stop()

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
