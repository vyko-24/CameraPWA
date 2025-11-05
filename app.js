if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/CameraPWA/sw.js')
        .then( register => {
            console.log('Si jalo', register.scope);            
        })
        .catch(err =>{
            console.log('No jaló', err)
        })
    })
}else{
    console.log("no se puede chavo");    
}

// ... (Registro del Service Worker - se mantiene igual) ...

// Referencias a elementos del DOM
const openCameraBtn = document.getElementById('openCamera');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const takePhotoBtn = document.getElementById('takePhoto');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
// 🔑 NUEVAS REFERENCIAS
const switchCameraBtn = document.getElementById('switchCamera');
const galleryContainer = document.getElementById('galleryContainer');
const clearGalleryBtn = document.getElementById('clearGallery');

let stream = null;
// 🔑 VARIABLES DE ESTADO
let currentFacingMode = 'environment'; // 'user' (frontal) o 'environment' (trasera)
let photoUrls = []; // Array para almacenar las URLs temporales de la galería


// -----------------------------------------------------
// FUNCIÓN PRINCIPAL: ABRIR CÁMARA
// -----------------------------------------------------

async function openCamera() {
    try {
        // 1. Definición de Restricciones (usando la variable de estado)
        const constraints = {
            video: {
                facingMode: { ideal: currentFacingMode },
                width: { ideal: 320 },
                height: { ideal: 240 }
            }
        };
        
        // 2. Si hay un stream abierto, cerrarlo primero
        if (stream) closeCamera(false); 

        // 3. Obtener el Stream de Medios
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 4. Asignar el Stream al Elemento <video>
        video.srcObject = stream;
        
        // 5. Actualización de la UI
        cameraContainer.style.display = 'block';
        openCameraBtn.textContent = 'Cámara Abierta';
        openCameraBtn.disabled = true;
        
        console.log(`Cámara ${currentFacingMode === 'environment' ? 'trasera' : 'frontal'} abierta exitosamente`);
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
    }
}

// -----------------------------------------------------
// FUNCIÓN: CAPTURAR FOTO Y AÑADIR A GALERÍA
// -----------------------------------------------------

function takePhoto() {
    if (!stream) {
        alert('Primero debes abrir la cámara');
        return;
    }

    // 1. Dibujar el Frame de Video en el Canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 2. Obtener el Blob de la imagen (más eficiente que dataURL para la memoria)
    canvas.toBlob(blob => {
        // 3. Crear una URL temporal en memoria (Blob URL)
        const imageUrl = URL.createObjectURL(blob);
        
        // 4. Almacenar la URL temporal
        photoUrls.push(imageUrl);
        
        // 5. Actualizar la galería en la UI
        renderGallery();
        
        console.log('Foto capturada y URL temporal creada:', imageUrl);
        
    }, 'image/png'); // Usamos PNG para mejor calidad (o 'image/jpeg' para ahorro de espacio)
    
    // NOTA: No cerramos la cámara aquí para permitir tomar múltiples fotos rápidamente.
}

// -----------------------------------------------------
// FUNCIÓN: RENDERIZAR GALERÍA
// -----------------------------------------------------

function renderGallery() {
    galleryContainer.innerHTML = ''; // Limpiar galería

    photoUrls.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'gallery-item';
        galleryContainer.appendChild(img);
    });

    // Mostrar u ocultar el botón de borrar
    clearGalleryBtn.style.display = photoUrls.length > 0 ? 'inline-block' : 'none';
}

// -----------------------------------------------------
// FUNCIÓN: CERRAR CÁMARA
// -----------------------------------------------------

function closeCamera(restoreUI = true) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;

        if (restoreUI) {
            video.srcObject = null;
            cameraContainer.style.display = 'none';
            openCameraBtn.textContent = 'Abrir Cámara';
            openCameraBtn.disabled = false;
        }
        console.log('Cámara cerrada');
    }
}

// -----------------------------------------------------
// FUNCIÓN: CAMBIAR CÁMARA (Frontal/Trasera)
// -----------------------------------------------------

async function switchCamera() {
    // Cambiar el modo: environment -> user, user -> environment
    currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
    
    // Reabrir la cámara con las nuevas restricciones
    await openCamera();
}

// -----------------------------------------------------
// FUNCIÓN: BORRAR GALERÍA
// -----------------------------------------------------

function clearGallery() {
    if (confirm('¿Estás seguro de que quieres borrar todas las fotos de la galería temporal?')) {
        // 1. Revocar todas las URLs temporales de Blob para liberar memoria
        photoUrls.forEach(url => URL.revokeObjectURL(url));
        
        // 2. Limpiar el array y el DOM
        photoUrls = [];
        renderGallery();
        
        console.log('Galería temporal borrada y memoria liberada.');
    }
}

// -----------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------

openCameraBtn.addEventListener('click', openCamera);
takePhotoBtn.addEventListener('click', takePhoto);
// 🔑 Nuevos listeners
switchCameraBtn.addEventListener('click', switchCamera);
clearGalleryBtn.addEventListener('click', clearGallery);

window.addEventListener('beforeunload', () => {
    closeCamera();
    // 🔑 Liberar memoria al cerrar la página
    photoUrls.forEach(url => URL.revokeObjectURL(url));
});

// 🔑 NOTA IMPORTANTE: En la vida real, el evento 'beforeunload' no es 100% confiable.
// Las imágenes se liberarán cuando la página se cierre, pero es buena práctica revocar las URLs.