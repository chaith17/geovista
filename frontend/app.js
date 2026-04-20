// Initialize Map
const map = L.map('map', {
    center: [20, 0], // Default center
    zoom: 3,
    zoomControl: false // We reposition it later
});

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// Add a dark theme tile layer (CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// API URL (same domain)
const API_BASE = '/api';

// Global Points Data
let cachedPoints = [];
let markerLayer = L.layerGroup().addTo(map);

// Colors for types
const typeColors = {
    'OSINT': 'var(--color-osint)',
    'HUMINT': 'var(--color-humint)',
    'IMINT': 'var(--color-imint)'
};

// UI Elements
const typeFilter = document.getElementById('filter-type');
const statusFilter = document.getElementById('filter-status');

// Fetch and render points
async function fetchPoints() {
    try {
        let url = `${API_BASE}/points/`;
        const params = new URLSearchParams();
        if (typeFilter.value) params.append('type', typeFilter.value);
        if (statusFilter.value) params.append('status', statusFilter.value);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }

        const res = await fetch(url);
        const data = await res.json();
        cachedPoints = data;
        renderPoints(data);
    } catch (error) {
        showToast('Error fetching points', true);
        console.error(error);
    }
}

// Render markers
function renderPoints(points) {
    markerLayer.clearLayers();
    
    // Auto-center variables
    let bounds = [];

    points.forEach(point => {
        const color = typeColors[point.type] || '#ffffff';
        
        // Custom Marker
        const markerHtml = `
            <div class="custom-marker ${point.status}">
                <div class="marker-pin" style="background-color: ${color};"></div>
            </div>
        `;
        
        const icon = L.divIcon({
            className: '', // Clear default class
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24],
            html: markerHtml
        });

        // Popup Content
        let popupHtml = `
            <div class="popup-header">
                <span class="popup-badge badge-${point.type.toLowerCase()}">${point.type}</span>
                <span class="popup-status ${point.status}">${point.status}</span>
            </div>
            <div class="popup-desc">${point.description || 'No description available.'}</div>
        `;

        if (point.image_url) {
            popupHtml += `<img src="${point.image_url}" class="popup-img" alt="Intelligence Image"/>`;
        }

        const dateStr = new Date(point.timestamp).toLocaleString();
        popupHtml += `<div class="popup-date">${dateStr}</div>`;

        const marker = L.marker([point.latitude, point.longitude], { icon })
            .bindPopup(popupHtml, { minWidth: 250, maxWidth: 300 });
            
        markerLayer.addLayer(marker);
        bounds.push([point.latitude, point.longitude]);
    });

    // Auto-zoom if we have points and no filters are applied
    if (bounds.length > 0 && !typeFilter.value && !statusFilter.value && cachedPoints.length === points.length) {
        if(bounds.length === 1) {
             map.setView(bounds[0], 10);
        } else {
             map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
}

// Upload Data Functions
document.getElementById('json-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lat = document.getElementById('json-lat').value;
    const lng = document.getElementById('json-lng').value;
    const type = document.getElementById('json-type').value;
    const desc = document.getElementById('json-desc').value;
    const status = document.getElementById('json-status').value;
    const imageInput = document.getElementById('json-image');

    const submitBtn = e.target.querySelector('button');
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    try {
        let imageUrl = null;
        if (imageInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', imageInput.files[0]);
            
            const imageRes = await fetch(`${API_BASE}/upload/image`, {
                method: 'POST',
                body: formData
            });
            const imageData = await imageRes.json();
            if (!imageRes.ok) throw new Error(imageData.detail || "Image upload failed");
            imageUrl = imageData.url;
        }

        const pointData = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            type: type,
            description: desc,
            status: status,
            image_url: imageUrl
        };

        const res = await fetch(`${API_BASE}/points/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pointData)
        });

        if (res.ok) {
            showToast('Point added successfully!');
            e.target.reset();
            fetchPoints();
            map.setView([lat, lng], 10);
        } else {
            const err = await res.json();
            throw new Error(err.detail);
        }
    } catch (err) {
        showToast(err.message, true);
    } finally {
        submitBtn.innerText = "Add Point";
        submitBtn.disabled = false;
    }
});

document.getElementById('csv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('csv-file');
    if (fileInput.files.length === 0) return;

    const submitBtn = e.target.querySelector('button');
    submitBtn.innerText = "Uploading...";
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch(`${API_BASE}/upload/csv`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast(data.message);
            e.target.reset();
            document.querySelector('.file-label span').innerText = 'Choose CSV file...';
            fetchPoints();
        } else {
            throw new Error(data.detail);
        }
    } catch (err) {
        showToast(err.message, true);
    } finally {
        submitBtn.innerText = "Upload CSV";
        submitBtn.disabled = false;
    }
});

// Update File Input Label
document.getElementById('csv-file').addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        document.querySelector('.file-label span').innerText = this.files[0].name;
    } else {
        document.querySelector('.file-label span').innerText = 'Choose CSV file...';
    }
});

// Tabs Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.upload-form').forEach(f => f.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
});

// Filtering Logic
typeFilter.addEventListener('change', fetchPoints);
statusFilter.addEventListener('change', fetchPoints);

// Toast Notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    if (isError) toast.classList.add('error');
    else toast.classList.remove('error');
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initial Fetch
fetchPoints();
