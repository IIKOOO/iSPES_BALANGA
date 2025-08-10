QrScanner.WORKER_PATH = '/static/qr-scanner-worker.min.js';
let scanning = true;
let debounceTimeout = null;
let qrScanner;
let currentCameraId = null;


function showStudentInfo(student_id) {
    fetch(`/get_student_info/${student_id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const s = data.student;
                document.getElementById('student-fields').style.display = 'block';
                document.getElementById('student-name').innerText = `${s.last_name}, ${s.first_name} ${s.middle_name || ''} ${s.suffix || ''}`;
                document.getElementById('student-id').innerText = `ID: ${s.student_id}`;
                document.getElementById('student-sex').innerText = `Sex: ${s.sex}`;
                document.getElementById('student-email').innerText = `Email: ${s.email}`;
                if (s.passport_pic) {
                    document.getElementById('passport-pic').src = `data:image/png;base64,${s.passport_pic}`;
                    document.getElementById('passport-pic').style.display = 'block';
                } else {
                    document.getElementById('passport-pic').style.display = 'none';
                }
            } else {
                document.getElementById('student-fields').style.display = 'none';
                document.getElementById('passport-pic').style.display = 'none';
            }
        });
}

function onScanSuccess(decodedText, decodedResult) {
    if (!scanning) return;
    scanning = false;
    document.getElementById('qr-result').innerHTML = `<div class="alert alert-info">Scanned: ${decodedText}</div>`;
    showStudentInfo(decodedText);

    // Get scanner location
    const scannerLocation = document.getElementById('scanner-location').value || '';

    // Capture image from webcam
    const video = document.querySelector('video');
    let capturedImage = null;
    if (video) {
        capturedImage = captureImageFromVideo(video);
        console.log("Captured image:", capturedImage);
    }

    fetch('/dtr_scan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            student_id: decodedText,
            captured_image: capturedImage,
            scanner_location: scannerLocation
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            document.getElementById('qr-result').innerHTML = `<div class="alert alert-success">DTR logged successfully!</div>`;
        } else {
            document.getElementById('qr-result').innerHTML = `<div class="alert alert-danger">Error: ${data.error}</div>`;
        }
        debounceTimeout = setTimeout(() => {
            scanning = true;
            document.getElementById('qr-result').innerHTML = '';
            document.getElementById('student-fields').style.display = 'none';
            document.getElementById('passport-pic').style.display = 'none';
        }, 5000);
    });
}

// let html5QrcodeScanner = new Html5QrcodeScanner(
//     "qr-reader", { fps: 10, qrbox: 300 });
// html5QrcodeScanner.render(onScanSuccess);

function captureImageFromVideo(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    canvas.getContext('2d').drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/png');
}

function startQrScanner(cameraId = null) {
    const videoElem = document.getElementById('qr-reader');
    if (qrScanner) {
        qrScanner.destroy();
    }
    qrScanner = new QrScanner(
        videoElem,
        result => {
            onScanSuccess(result.data);
        },
        {
            preferredCamera: cameraId,
            highlightScanRegion: false,
            highlightCodeOutline: true
        }
    );
    qrScanner.start().then(() => {
        if (cameraId) currentCameraId = cameraId;
        setTimeout(() => {
            videoElem.style.transform = 'scaleX(-1)';
        }, 500);
    });
}

// Camera selection (front/back)
function setupCameraSelect() {
    QrScanner.listCameras(true).then(cameras => {
        if (cameras.length > 1) {
            let select = document.getElementById('camera-select');
            if (!select) {
                select = document.createElement('select');
                select.id = 'camera-select';
                select.className = 'form-select mb-3';
                const scannerLocationDiv = document.querySelector('.mb-3.w-100');
                scannerLocationDiv.parentNode.insertBefore(select, scannerLocationDiv.nextSibling);
            }
            select.innerHTML = '';
            cameras.forEach(cam => {
                const option = document.createElement('option');
                option.value = cam.id;
                option.text = cam.label || cam.id;
                select.appendChild(option);
            });
            select.addEventListener('change', () => {
                startQrScanner(select.value);
            });
        }
        // Start with first camera
        startQrScanner(cameras[0]?.id);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const lockBtn = document.getElementById('lockBtn');
    const scannerLocation = document.getElementById('scanner-location');
    const unlockModal = new bootstrap.Modal(document.getElementById('unlockModal'));
    const confirmUnlockBtn = document.getElementById('confirmUnlockBtn');
    const unlockPassword = document.getElementById('unlockPassword');
    const unlockPasswordError = document.getElementById('unlockPasswordError');

    // Helper to set lock UI
    function setLockUI(locked) {
        if (locked) {
            scannerLocation.setAttribute('readonly', 'readonly');
            lockBtn.innerText = 'Unlock';
        } else {
            scannerLocation.removeAttribute('readonly');
            lockBtn.innerText = 'Lock';
        }
    }

    // Check lock status on load
    fetch('/scanner_lock_status')
        .then(res => res.json())
        .then(data => setLockUI(data.locked));

    // Lock/Unlock button click
    lockBtn.addEventListener('click', () => {
        if (lockBtn.innerText === 'Lock') {
            fetch('/scanner_lock', {method: 'POST'})
                .then(res => res.json())
                .then(data => {
                    if (data.success) setLockUI(true);
                });
        } else {
            unlockPassword.value = '';
            unlockPasswordError.style.display = 'none';
            unlockModal.show();
        }
    });

    // Confirm unlock
    confirmUnlockBtn.addEventListener('click', () => {
        const password = unlockPassword.value;
        fetch('/scanner_unlock', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({password})
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setLockUI(false);
                unlockModal.hide();
            } else {
                unlockPasswordError.innerText = data.error || 'Invalid password';
                unlockPasswordError.style.display = 'block';
            }
        });
    });

    // Restore value from localStorage on load
    const savedLocation = localStorage.getItem('scannerLocation');
    if (savedLocation !== null) {
        scannerLocation.value = savedLocation;
    }

    // Save value to localStorage on change
    scannerLocation.addEventListener('input', () => {
        localStorage.setItem('scannerLocation', scannerLocation.value);
    });

    setupCameraSelect();
});