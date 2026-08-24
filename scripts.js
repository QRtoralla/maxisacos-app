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

    btnEscanear:
        document.getElementById("btnEscanear"),

    mensajeEstado:
        document.getElementById("mensajeEstado"),

    contenedorScanner:
        document.getElementById("contenedorScanner"),

       modalMaxisaco:
        document.getElementById("modalMaxisaco"),

    mensajeModalMaxisaco:
        document.getElementById("mensajeModalMaxisaco"),

    btnEnviarObsoleto:
        document.getElementById("btnEnviarObsoleto"),

    btnContinuarEscaneo:
        document.getElementById("btnContinuarEscaneo")


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

let lecturaEnProceso = false;

let modalMaxisacoAbierto = false;

let maxisacoObsoletoPendiente = null; 
/*Para recordar que ese QR que el operador esta diciendodo enviar*/


/* =====================================================
   INICIALIZACIÓN
===================================================== */

document.addEventListener("DOMContentLoaded", inicializarAplicacion);


/* =====================================================
   FUNCIÓN PRINCIPAL
===================================================== */

function inicializarAplicacion() {

    ELEMENTOS.btnEscanear.addEventListener(
        "click",
        iniciarScanner
    );

   ELEMENTOS.btnContinuarEscaneo.addEventListener(
        "click",
        continuarConElEscaneo
    );

   ELEMENTOS.btnEnviarObsoleto.addEventListener(
    "click",
    enviarObsoleto
);

   
   

}

/* =====================================================
   CONTINUAR CON EL ESCANEO
===================================================== */

function continuarConElEscaneo() {

    ELEMENTOS.modalMaxisaco.style.display = "none";

    modalMaxisacoAbierto = false;

}

/* =====================================================
   ENVIAR MAXISACO OBSOLETO
===================================================== */

function enviarObsoleto() {

    if (!maxisacoObsoletoPendiente) {

        return;

    }


    const idMaxisaco =
        maxisacoObsoletoPendiente;


    /* =================================================
       INCORPORAR EL MAXISACO A LA SESIÓN
    ================================================= */

    codigosLeidos.push(idMaxisaco);

    cantidadLeida++;



    /* =================================================
       CERRAR MODAL
    ================================================= */

    ELEMENTOS.modalMaxisaco.style.display =
        "none";

    modalMaxisacoAbierto = false;

    maxisacoObsoletoPendiente = null;


    /* =================================================
       MOSTRAR PROGRESO
    ================================================= */

    mostrarMensaje(

        `⚠️ ${idMaxisaco} será enviado.<br><br>` +

        `El maxisaco conserva sus 5 vueltas.<br><br>` +

        `${cantidadLeida} / ${cantidadEsperada}`,

        false

    );


    /* =================================================
       COMPROBAR SI TERMINÓ LA LECTURA
    ================================================= */

    if (
        cantidadLeida === cantidadEsperada
    ) {

        lecturaFinalizada = true;

        mostrarMensaje(

            "📤 Enviando registros...",

            true

        );


        detenerScanner()

            .then(function () {

                enviarTodosLosRegistros();

            });

    }

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
/*
    limpiarFormulario();
*/
    return {

        ok: true,

        tipo: datos.tipo,

        id: datos.id,

        vueltas: datos.vueltas

    };

}

return {

    ok: false,

    tipo: datos.tipo,

    id: idMaxisaco,

    mensaje: datos.mensaje

};

    }

    catch (error) {

        console.error(error);

        return {

        ok: false,
           tipo: "ERROR_CONEXION", 
           /*ESTO PERMITE DISTINGUIR POSTERIORMENTE DE UN PROBLEMA DE CONEXIÓN DE UN MAXI OBSOLETO*/

        id: idMaxisaco,

        mensaje: "Error de conexión."

    };

    }

}

/* =====================================================
VERIFICAR SI EL QR PERTENECE A UN MAXISACO
===================================================== */

async function verificarMaxisaco(idMaxisaco) {

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

                    accion: "verificar",

                    id: idMaxisaco

                })

            }

        );

        const texto = await respuesta.text();

        const datos = JSON.parse(texto);

        return datos;

    }

    catch (error) {

        console.error(error);

        return {

            ok: false,

            existe: false,

            mensaje: "Error de conexión."

        };

    }

}

/*el codigo anterior en parte sirve para dejar preparada la comunicacion de github y appscript*/

/* =====================================================
   ENVIAR TODOS LOS REGISTROS| 
   ===================================================== */

async function enviarTodosLosRegistros() {

    const resultados = [];


    /* =================================================
       ENVIAR CADA MAXISACO
    ================================================= */

    for (const idMaxisaco of codigosLeidos) {

        const resultado =
            await enviarRegistro(idMaxisaco);

        resultados.push(resultado);

    }


    /* =================================================
       CONTADORES
    ================================================= */

    let enviados = 0;

    let obsoletos = 0;

    let noExisten = 0;

    let erroresConexion = 0;

    let otrosErrores = 0;


    /* =================================================
       LISTAS
    ================================================= */

    let listaObsoletos = "";

    let listaNoExisten = "";

    let listaErroresConexion = "";

    let listaOtrosErrores = "";


    /* =================================================
       CLASIFICAR RESULTADOS
    ================================================= */

    for (const resultado of resultados) {


        /* ---------------------------------------------
           REGISTRO CORRECTO
        --------------------------------------------- */

        if (resultado.tipo === "REGISTRADO") {

            enviados++;

        }


        /* ---------------------------------------------
           MAXIMO DE 5 VUELTAS
        --------------------------------------------- */

        else if (
            resultado.tipo === "MAXIMO_VUELTAS"
        ) {

            obsoletos++;

            listaObsoletos +=
                `⚠️ ${resultado.id}<br>`;

        }


        /* ---------------------------------------------
           CODIGO INEXISTENTE
        --------------------------------------------- */

        else if (
            resultado.tipo === "NO_EXISTE"
        ) {

            noExisten++;

            listaNoExisten +=
                `❌ ${resultado.id}<br>`;

        }


        /* ---------------------------------------------
           ERROR DE CONEXION
        --------------------------------------------- */

        else if (
            resultado.tipo === "ERROR_CONEXION"
        ) {

            erroresConexion++;

            listaErroresConexion +=
                `🌐 ${resultado.id}<br>`;

        }


        /* ---------------------------------------------
           OTRO ERROR
        --------------------------------------------- */

        else {

            otrosErrores++;

            listaOtrosErrores +=
                `❌ ${resultado.id}: ${resultado.mensaje || "Error desconocido"}<br>`;

        }

    }


    /* =================================================
       CONSTRUIR RESUMEN
       ================================================= */

    let mensaje =

        "==============================<br><br>" +

        "✅ Lectura completada<br><br>" +

        `Registros enviados: ${enviados}<br><br>`;


    /* =================================================
       MAXISACOS OBSOLETOS
    ================================================= */

    if (obsoletos > 0) {

        mensaje +=

            `⚠️ Maxisacos obsoletos: ${obsoletos}<br><br>` +

            listaObsoletos +

            "<br>" +

            "Se recomienda retirar estos maxisacos de circulación.<br><br>";

    }


    /* =================================================
       CODIGOS INEXISTENTES
    ================================================= */

    if (noExisten > 0) {

        mensaje +=

            `❌ Códigos inexistentes: ${noExisten}<br><br>` +

            listaNoExisten +

            "<br>";

    }


    /* =================================================
       ERRORES DE CONEXION
    ================================================= */

    if (erroresConexion > 0) {

        mensaje +=

            `🌐 Errores de conexión: ${erroresConexion}<br><br>` +

            listaErroresConexion +

            "<br>";

    }


    /* =================================================
       OTROS ERRORES
    ================================================= */

    if (otrosErrores > 0) {

        mensaje +=

            `❌ Otros errores: ${otrosErrores}<br><br>` +

            listaOtrosErrores +

            "<br>";

    }


    /* =================================================
       MOSTRAR RESUMEN
    ================================================= */

    const huboErrores =
        obsoletos > 0 ||
        noExisten > 0 ||
        erroresConexion > 0 ||
        otrosErrores > 0;


    mostrarMensaje(

        mensaje,

        !huboErrores

    );


    /* =================================================
       LIMPIAR SESION
    ================================================= */

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

/* =====================================================
CÓDIGO DETECTADO
===================================================== */

async function codigoDetectado(idMaxisaco) {

    idMaxisaco = String(idMaxisaco).trim();

   /* =================================================
       Return (ignora acciones)
    ================================================= */

    if (lecturaEnProceso) {

        return;

    }

   if (modalMaxisacoAbierto) {

    return;

}

   
    /* =================================================
    COMPROBAR SI YA FUE LEÍDO
    ================================================= */

    if (codigosLeidos.includes(idMaxisaco)) {

        mostrarMensaje(

            `⚠️ ${idMaxisaco} ya fue leído.<br><br>` +
            `${cantidadLeida} / ${cantidadEsperada}`,

            false

        );

        return;

    }

    /* =================================================
       BLOQUEAR NUEVAS LECTURAS
    ================================================= */

    lecturaEnProceso = true;


    try {
    
   

    /* =================================================
    VERIFICAR SI EL QR PERTENECE A UN MAXISACO
    ================================================= */

    const resultado =
        await verificarMaxisaco(idMaxisaco);


    /* =================================================
    ERROR DE CONEXIÓN
    ================================================= */

    if (!resultado.ok) {

        mostrarMensaje(

            `❌ ${resultado.mensaje}`,

            false

        );

        return;

    }

    
    /* =================================================
    QR NO PERTENECE A UN MAXISACO
    ================================================= */

    if (!resultado.existe) {

        mostrarMensaje(

            `⚠️ QR no válido<br><br>` +

            `Este código no pertenece a un maxisaco.<br><br>` +

            `${cantidadLeida} / ${cantidadEsperada}`,

            false

        );

        return;

    }     

       /*detección de las 5 vueltas*/

       /* =================================================
   1B-2.3 — MOSTRAR MODEL MAXISACO AGOTADO
================================================= */

if (resultado.vueltas >= 5) {

    ELEMENTOS.mensajeModalMaxisaco.innerHTML =

        `${idMaxisaco} tiene ${resultado.vueltas} vueltas.<br><br>` +

        `Ha alcanzado el límite permitido.`;

   maxisacoObsoletoPendiente = idMaxisaco;

    modalMaxisacoAbierto = true;
   
    ELEMENTOS.modalMaxisaco.style.display = "flex";

    return;

}
       


       

    /* =================================================
    QR VÁLIDO, solo prepara el registro para el envio
    ================================================= */

    codigosLeidos.push(idMaxisaco);

    cantidadLeida++;



    mostrarMensaje(

        `✅ Maxisaco registrado.<br><br>` +

        `${cantidadLeida} / ${cantidadEsperada}`,

        true

    );


    /* =================================================
    COMPROBAR SI TERMINÓ LA LECTURA
    ================================================= */

    if (
        cantidadLeida === cantidadEsperada
    ) {

       lecturaFinalizada = true;

        mostrarMensaje(

            "📤 Enviando registros...",

            true

        );


        detenerScanner()

            .then(function () {

                enviarTodosLosRegistros();

            });

    }

}

   catch (error) {

        console.error(error);

        mostrarMensaje(

            "❌ Ocurrió un error durante la validación.",

            false

        );

    }

    finally {

        lecturaEnProceso = false;

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
