document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const metadataOutput = document.getElementById('metadata-output');
    const closeModal = document.getElementById('close-modal');

    // Batch elements
    const batchActions = document.getElementById('batch-actions');
    const btnDownloadAll = document.querySelector('.btn-download-all');

    let uploadedFiles = new Set();
    let cleanedFiles = new Set();

    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        if (files.length === 0) return;

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.files) {
                    data.files.forEach(filename => {
                        if (!uploadedFiles.has(filename)) {
                            uploadedFiles.add(filename);
                            addFileToList(filename);
                        }
                    });
                    updateBatchActionsVisibility();
                }
            })
            .catch(err => console.error(err));
    }

    function updateBatchActionsVisibility() {
        if (uploadedFiles.size > 0) {
            batchActions.style.display = 'flex';
        } else {
            batchActions.style.display = 'none';
        }

        if (cleanedFiles.size > 0) {
            btnDownloadAll.disabled = false;
        } else {
            btnDownloadAll.disabled = true;
        }
    }

    function addFileToList(filename) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.id = `file-${filename}`; // Add ID for easier selection
        item.innerHTML = `
            <div class="file-info">
                <div class="file-icon">📷</div>
                <div class="file-name">${filename}</div>
            </div>
            <div class="file-actions">
                <button class="btn-view" onclick="viewMetadata('${filename}')">View Metadata</button>
                <button class="btn-clean" id="btn-clean-${filename}" onclick="cleanMetadata('${filename}', this)">Clean Metadata</button>
            </div>
        `;
        fileList.appendChild(item);
    }

    // View Metadata
    window.viewMetadata = (filename) => {
        metadataOutput.textContent = 'Loading...';
        modalTitle.textContent = `Metadata: ${filename}`;
        openModal();

        fetch('/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        })
            .then(res => res.json())
            .then(data => {
                if (data.output) {
                    metadataOutput.textContent = data.output;
                } else {
                    metadataOutput.textContent = 'Error: ' + data.error;
                }
            })
            .catch(err => {
                metadataOutput.textContent = 'Error fetching metadata.';
            });
    };

    // Clean Metadata (Single)
    window.cleanMetadata = (filename, btn) => {
        const originalText = btn.textContent;
        btn.textContent = 'Cleaning...';
        btn.disabled = true;

        fetch('/clean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    markAsCleaned(filename, btn);
                } else {
                    btn.textContent = 'Error!';
                    alert(data.error);
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
            })
            .catch(err => {
                btn.textContent = 'Error';
                console.error(err);
            });
    };

    function markAsCleaned(filename, btn) {
        cleanedFiles.add(filename);
        updateBatchActionsVisibility();

        btn.textContent = 'Cleaned!';
        btn.classList.remove('btn-clean');
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
        btn.style.color = '#22c55e';

        // Add download button if not exists
        const actionsDiv = btn.parentElement;
        if (!actionsDiv.querySelector('.btn-download')) {
            const downloadBtn = document.createElement('a');
            downloadBtn.href = `/download/${filename}`;
            downloadBtn.className = 'button btn-download';
            downloadBtn.style.padding = '10px 16px';
            downloadBtn.style.borderRadius = '8px';
            downloadBtn.style.fontWeight = '600';
            downloadBtn.style.fontSize = '0.9rem';
            downloadBtn.style.textDecoration = 'none';
            downloadBtn.style.marginLeft = '12px';
            downloadBtn.textContent = 'Download';
            actionsDiv.appendChild(downloadBtn);
        }
    }

    // Clean All Metadata
    window.cleanAllMetadata = () => {
        const filesToClean = Array.from(uploadedFiles).filter(f => !cleanedFiles.has(f));
        if (filesToClean.length === 0) {
            alert("No new files to clean.");
            return;
        }

        const btnCleanAll = document.querySelector('.btn-clean-all');
        const originalText = btnCleanAll.textContent;
        btnCleanAll.textContent = 'Processing...';
        btnCleanAll.disabled = true;

        // Visual feedback on individual buttons
        filesToClean.forEach(filename => {
            const btn = document.getElementById(`btn-clean-${filename}`);
            if (btn) {
                btn.textContent = 'Queued...';
                btn.disabled = true;
            }
        });

        fetch('/clean_batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames: filesToClean })
        })
            .then(res => res.json())
            .then(data => {
                if (data.results) {
                    for (const [filename, result] of Object.entries(data.results)) {
                        const btn = document.getElementById(`btn-clean-${filename}`);
                        if (result.success) {
                            if (btn) markAsCleaned(filename, btn);
                        } else {
                            if (btn) {
                                btn.textContent = 'Error';
                                console.error(`Error cleaning ${filename}: ${result.error}`);
                            }
                        }
                    }
                }
            })
            .catch(err => console.error(err))
            .finally(() => {
                btnCleanAll.textContent = originalText;
                btnCleanAll.disabled = false;
            });
    };

    // Download All Cleaned
    window.downloadAllCleaned = () => {
        if (cleanedFiles.size === 0) return;

        const filenames = Array.from(cleanedFiles);

        fetch('/download_zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames })
        })
            .then(response => {
                if (response.ok) return response.blob();
                throw new Error('Network response was not ok.');
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'cleaned_images.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(err => console.error('Download failed:', err));
    };

    // Modal Functions
    function openModal() {
        modalOverlay.classList.add('active');
    }

    function closeModalFunc() {
        modalOverlay.classList.remove('active');
    }

    closeModal.addEventListener('click', closeModalFunc);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModalFunc();
    });
});
