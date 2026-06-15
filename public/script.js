// --- DOM Elements ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const uploadBtn = document.getElementById('uploadBtn');
const cameraBtn = document.getElementById('cameraBtn');
const tableBody = document.getElementById('tableBody');
const emptyRow = document.getElementById('emptyRow');
const grandTotalEl = document.getElementById('grandTotal');
const hiddenCanvas = document.getElementById('hiddenCanvas');
const aiIndicator = document.getElementById('aiIndicator');
const aiStatusText = document.getElementById('aiStatusText');

// --- State Management ---
// Membaca data tersimpan di localStorage (seperti versi lama)
let scannedData = JSON.parse(localStorage.getItem('scanned_data') || '[]');
const BACKEND_URL = '/api/scan';

// Generate Unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- Inisialisasi ---
function init() {
    if (scannedData.length > 0) {
        emptyRow.style.display = 'none';
        scannedData.forEach(item => {
            renderRowDOM(item);
        });
        updateGrandTotal();
    }
}
init();

// --- Event Listeners untuk Input ---
dropZone.addEventListener('click', (e) => {
    if(e.target.closest('button')) return; // Jangan trigger jika klik tombol
    fileInput.click();
});
uploadBtn.addEventListener('click', () => fileInput.click());
cameraBtn.addEventListener('click', () => cameraInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drop-zone-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drop-zone-active');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// Listener Input File & Camera
const inputHandler = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
    e.target.value = ''; // Reset
};
fileInput.addEventListener('change', inputHandler);
cameraInput.addEventListener('change', inputHandler);

// --- File Handling & Compression ---
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        Swal.fire({
            icon: 'error',
            title: 'Format Tidak Didukung',
            text: 'Harap masukkan file berupa gambar (JPG, PNG, WEBP).'
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => compressAndQueue(img);
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function compressAndQueue(img) {
    const MAX_WIDTH = 800;
    const scale = Math.min(MAX_WIDTH / img.width, 1);
    
    hiddenCanvas.width = img.width * scale;
    hiddenCanvas.height = img.height * scale;
    const ctx = hiddenCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    const base64Image = hiddenCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    
    const tempId = generateId();
    addLoadingRow(tempId); // Memunculkan loading di UI
    queueImage(base64Image, tempId); // Masukkan ke sistem antrean
}

// --- Queue System (Dari Versi Lama) ---
let imageQueue = [];
let isProcessingQueue = false;

function queueImage(base64Image, tempId) {
    imageQueue.push({ base64Image, tempId });
    if (!isProcessingQueue) {
        processQueue();
    }
}

async function processQueue() {
    if (imageQueue.length === 0) {
        isProcessingQueue = false;
        setAIStatus('idle');
        return;
    }

    isProcessingQueue = true;
    setAIStatus('working');
    
    const currentTask = imageQueue.shift();
    
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: currentTask.base64Image })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Gagal memproses nota');
        }

        // Hapus status loading dan tambahkan data asli
        removeLoadingRow(currentTask.tempId);
        
        const newItem = {
            id: generateId(),
            No: scannedData.length + 1,
            Toko: result.data.toko || '',
            Tanggal: result.data.tanggal || '',
            Total: result.data.total || 0
        };
        
        scannedData.push(newItem);
        localStorage.setItem('scanned_data', JSON.stringify(scannedData));
        renderRowDOM(newItem);
        updateGrandTotal();

    } catch (error) {
        removeLoadingRow(currentTask.tempId);
        Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: error.message,
            toast: true,
            position: 'top-end',
            timer: 4000
        });
    }

    // Beri jeda 1 detik agar API tidak dibombardir (Mencegah Error 429)
    setTimeout(processQueue, 1000);
}

// --- Inline Editing & DOM Manipulations (Dari Versi Lama) ---

function setAIStatus(status) {
    if (status === 'working') {
        aiIndicator.classList.remove('bg-success');
        aiIndicator.classList.add('bg-error'); 
        aiStatusText.innerText = 'Sedang Menganalisis Gambar...';
        aiStatusText.classList.add('animate-pulse');
    } else {
        aiIndicator.classList.remove('bg-error');
        aiIndicator.classList.add('bg-success');
        aiStatusText.innerText = 'Online & Siap Memproses';
        aiStatusText.classList.remove('animate-pulse');
    }
}

function formatRupiah(angka) {
    angka = Number(angka) || 0; // Anti-NaN Guard
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

function updateGrandTotal() {
    const total = scannedData.reduce((sum, item) => sum + (Number(item.Total) || 0), 0);
    grandTotalEl.innerText = formatRupiah(total);
}

// Mencegah paste HTML (hanya text murni)
window.handlePaste = function(e) {
    e.preventDefault();
    const text = (e.originalEvent || e).clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
};

// Select teks otomatis saat di-klik agar cepat edit
window.selectAllText = function(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
};

// Fungsi Update saat cell selesai di-edit
window.updateCell = function(cell, field) {
    const row = cell.closest('tr');
    const id = row.getAttribute('data-id');
    const itemIndex = scannedData.findIndex(d => d.id === id);
    
    if (itemIndex > -1) {
        let value = cell.innerText.trim();
        
        if (field === 'Total') {
            // Bersihkan format rupiah menjadi angka murni
            value = value.replace(/[^0-9]/g, ''); 
            scannedData[itemIndex][field] = Number(value);
            cell.innerText = formatRupiah(value);
        } else {
            scannedData[itemIndex][field] = value;
        }
        
        localStorage.setItem('scanned_data', JSON.stringify(scannedData));
        updateGrandTotal();
    }
};

window.removeRow = function(btn) {
    const row = btn.closest('tr');
    const id = row.getAttribute('data-id');
    
    scannedData = scannedData.filter(d => d.id !== id);
    scannedData.forEach((d, idx) => d.No = idx + 1);
    localStorage.setItem('scanned_data', JSON.stringify(scannedData));
    
    row.remove();
    
    // Perbarui Nomor Urut DOM
    const rows = tableBody.querySelectorAll('tr[data-id]');
    rows.forEach((r, index) => {
        r.querySelector('.number-cell').innerText = index + 1;
    });

    if (scannedData.length === 0) {
        emptyRow.style.display = 'table-row';
    }

    updateGrandTotal();
};

function renderRowDOM(newItem) {
    const row = document.createElement('tr');
    row.className = 'border-b border-outline-variant/20 transition-all hover:bg-outline-variant/10';
    row.setAttribute('data-id', newItem.id);

    // Perhatikan atribut contenteditable="true" dan event listener untuk edit sejalan dengan versi lama
    row.innerHTML = `
        <td class="py-4 px-6 text-on-surface-variant number-cell">${newItem.No}</td>
        <td class="py-4 px-6 editable-cell focus:outline-primary focus:bg-surface-container" contenteditable="true" onblur="updateCell(this, 'Toko')" onfocus="selectAllText(this)" onpaste="handlePaste(event)">${newItem.Toko || '-'}</td>
        <td class="py-4 px-6 editable-cell focus:outline-primary focus:bg-surface-container" contenteditable="true" onblur="updateCell(this, 'Tanggal')" onfocus="selectAllText(this)" onpaste="handlePaste(event)">${newItem.Tanggal || '-'}</td>
        <td class="py-4 px-6 text-right font-bold text-primary editable-cell focus:outline-primary focus:bg-surface-container" contenteditable="true" onblur="updateCell(this, 'Total')" onfocus="selectAllText(this)" onpaste="handlePaste(event)">${formatRupiah(newItem.Total)}</td>
        <td class="py-4 px-6 text-center">
            <button onclick="removeRow(this)" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-md hover:bg-error/10">
                <span class="material-symbols-outlined text-xl">delete</span>
            </button>
        </td>
    `;
    tableBody.appendChild(row);
}

function addLoadingRow(id) {
    if (scannedData.length === 0 && tableBody.children.length === 1) {
        emptyRow.style.display = 'none';
    }
    
    const row = document.createElement('tr');
    row.id = `loading-${id}`;
    row.className = 'border-b border-outline-variant/20 bg-primary/5';
    row.innerHTML = `
        <td class="py-4 px-6 text-primary">
            <span class="material-symbols-outlined animate-spin text-sm">sync</span>
        </td>
        <td colspan="3" class="py-4 px-6 text-primary italic text-sm">
            AI sedang mengekstrak data...
        </td>
        <td class="py-4 px-6"></td>
    `;
    tableBody.appendChild(row);
}

function removeLoadingRow(id) {
    const row = document.getElementById(`loading-${id}`);
    if (row) row.remove();
    
    if (tableBody.querySelectorAll('tr').length === 1 && tableBody.children[0] === emptyRow) {
        emptyRow.style.display = 'table-row';
    }
}
