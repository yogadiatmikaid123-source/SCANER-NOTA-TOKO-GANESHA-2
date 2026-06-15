// --- DOM Elements ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const tableBody = document.getElementById('tableBody');
const emptyRow = document.getElementById('emptyRow');
const grandTotalEl = document.getElementById('grandTotal');
const hiddenCanvas = document.getElementById('hiddenCanvas');
const aiIndicator = document.getElementById('aiIndicator');
const aiStatusText = document.getElementById('aiStatusText');

// --- State Management ---
let scannedData = [];
const BACKEND_URL = '/api/scan';

// --- Event Listeners untuk Drag & Drop ---
dropZone.addEventListener('click', () => fileInput.click());
uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Mencegah double click karena berada dalam dropZone
    fileInput.click();
});

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

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
    // Reset input agar bisa memilih file yang sama lagi jika perlu
    fileInput.value = '';
});

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
        img.onload = () => compressAndSend(img);
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function compressAndSend(img) {
    // Kompresi gambar menjadi lebar maksimal 800px
    const MAX_WIDTH = 800;
    const scale = Math.min(MAX_WIDTH / img.width, 1);
    
    hiddenCanvas.width = img.width * scale;
    hiddenCanvas.height = img.height * scale;
    const ctx = hiddenCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    
    // Konversi ke base64 dengan kompresi 50%
    const base64Image = hiddenCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    
    // Kirim ke backend
    sendToBackend(base64Image);
}

// --- Komunikasi dengan Backend API ---
async function sendToBackend(base64Image) {
    const tempId = Date.now().toString();
    addLoadingRow(tempId);
    setAIStatus('working');

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Gagal memproses nota');
        }

        // Jika berhasil, tambahkan data ke tabel
        removeLoadingRow(tempId);
        addDataToTable(result.data);
        
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Data nota berhasil direkap.',
            toast: true,
            position: 'top-end',
            timer: 3000,
            showConfirmButton: false
        });

    } catch (error) {
        removeLoadingRow(tempId);
        Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: error.message
        });
    } finally {
        setAIStatus('idle');
    }
}

// --- UI / DOM Manipulations ---

function setAIStatus(status) {
    if (status === 'working') {
        aiIndicator.classList.remove('bg-success');
        aiIndicator.classList.add('bg-error'); // Warna merah saat AI bekerja keras
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
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(Number(angka) || 0);
}

function updateGrandTotal() {
    const total = scannedData.reduce((sum, item) => sum + (Number(item.Total) || 0), 0);
    grandTotalEl.innerText = formatRupiah(total);
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

function addDataToTable(data) {
    if (scannedData.length === 0) {
        emptyRow.style.display = 'none';
    }

    const newItem = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        No: scannedData.length + 1,
        Toko: data.toko,
        Tanggal: data.tanggal,
        Total: data.total
    };

    const row = document.createElement('tr');
    row.className = 'border-b border-outline-variant/20 transition-all hover:bg-outline-variant/10';
    row.setAttribute('data-id', newItem.id);

    row.innerHTML = `
        <td class="py-4 px-6 text-on-surface-variant number-cell">${newItem.No}</td>
        <td class="py-4 px-6">${newItem.Toko || '-'}</td>
        <td class="py-4 px-6">${newItem.Tanggal || '-'}</td>
        <td class="py-4 px-6 text-right font-bold text-primary">${formatRupiah(newItem.Total)}</td>
        <td class="py-4 px-6 text-center">
            <button onclick="removeRow(this)" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-md hover:bg-error/10">
                <span class="material-symbols-outlined text-xl">delete</span>
            </button>
        </td>
    `;

    tableBody.appendChild(row);
    scannedData.push(newItem);
    updateGrandTotal();
}

window.removeRow = function(btn) {
    const row = btn.closest('tr');
    const id = row.getAttribute('data-id');
    
    // Hapus dari state
    scannedData = scannedData.filter(d => d.id !== id);
    
    // Perbarui Nomor Urut State
    scannedData.forEach((d, idx) => d.No = idx + 1);
    
    // Hapus dari DOM
    row.remove();
    
    // Render ulang nomor urut DOM
    const rows = tableBody.querySelectorAll('tr[data-id]');
    rows.forEach((r, index) => {
        r.querySelector('.number-cell').innerText = index + 1;
    });

    if (scannedData.length === 0) {
        emptyRow.style.display = 'table-row';
    }

    updateGrandTotal();
};
